import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { tableCastManager } from './src/server/broadcastManager.ts';

const moduleDir = typeof __dirname === 'string' ? __dirname : path.dirname(process.argv[1]);
const APP_ROOT = path.resolve(process.env.CUECONTROL_APP_ROOT || moduleDir);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.env.CUECONTROL_DATA_DIR || path.join(APP_ROOT, 'data'));
const STATE_FILE = path.resolve(DATA_DIR, 'venue_state.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial state builder
function createInitialVenueState() {
  const now = Date.now();
  const tables = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: `Table ${String(i + 1).padStart(2, '0')}`,
    status: 'available',
    currentGameId: null,
    lastActivity: now,
    activeRemoteDeviceId: null,
    activeRemoteDeviceName: null,
    remoteClaimedAt: null,
    remoteLastHeartbeat: null,
  }));

  return {
    tables,
    activeGames: {},
    history: [],
    players: [],
    activities: [],
    staffCalls: [],
    settings: {
      venueName: 'CSN Live Arena & Lounge',
      tableCount: 6,
      currency: '$',
      featuredTableId: 1,
      soundEffects: true,
      vibration: true,
      overlayStyle: 'broadcast-top',
      showTimerOnOverlay: true,
      defaultGameType: '8-Ball',
      defaultTargetScore: 7,
      autoEndGame: true,
    },
    currentUser: {
      id: 'admin-1',
      email: 'admin@cuecontrol.venue',
      name: 'Yuvaraja (Venue Mgr)',
      role: 'admin',
    },
  };
}

// Sanitize state to filter legacy demo data while strictly protecting real active games
function sanitizeVenueState(raw: any) {
  if (!raw || !Array.isArray(raw.tables)) {
    return createInitialVenueState();
  }

  const cleanActiveGames: Record<string, any> = {};
  if (raw.activeGames && typeof raw.activeGames === 'object') {
    for (const [key, g] of Object.entries(raw.activeGames)) {
      if (
        g &&
        typeof g === 'object' &&
        (g as any).id &&
        !['game-t1', 'game-t2', 'game-t4', 'game-t5'].includes((g as any).id) &&
        !String((g as any).id).startsWith('game-past-')
      ) {
        cleanActiveGames[key] = g;
      }
    }
  }

  const cleanHistory = Array.isArray(raw.history)
    ? raw.history.filter((h: any) => h && h.id && !h.id.startsWith('game-past-'))
    : [];

  const cleanActivities = Array.isArray(raw.activities)
    ? raw.activities.filter(
        (a: any) => a && a.id && !['act-1', 'act-2', 'act-3', 'act-4', 'act-5'].includes(a.id)
      )
    : [];

  const cleanPlayers = Array.isArray(raw.players)
    ? raw.players.filter((p: any) => p && p.id && !p.id.match(/^p-[1-8]$/))
    : [];

  const cleanTables = Array.from({ length: 6 }, (_, i) => {
    const id = i + 1;
    const existing = raw.tables.find((t: any) => t && t.id === id);
    if (!existing) {
      return {
        id,
        name: `Table ${String(id).padStart(2, '0')}`,
        status: 'available',
        currentGameId: null,
        lastActivity: Date.now(),
        activeRemoteDeviceId: null,
        activeRemoteDeviceName: null,
        remoteClaimedAt: null,
        remoteLastHeartbeat: null,
      };
    }

    if (existing.currentGameId && !cleanActiveGames[existing.currentGameId]) {
      return {
        ...existing,
        status: 'available',
        currentGameId: null,
        activeRemoteDeviceId: null,
        activeRemoteDeviceName: null,
        remoteClaimedAt: null,
        remoteLastHeartbeat: null,
      };
    }

    return existing;
  });

  return {
    ...raw,
    tables: cleanTables,
    activeGames: cleanActiveGames,
    history: cleanHistory,
    activities: cleanActivities,
    players: cleanPlayers,
    settings: raw.settings || createInitialVenueState().settings,
    currentUser: raw.currentUser || createInitialVenueState().currentUser,
  };
}

// Load persisted state or create initial
let venueState: any = null;
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    venueState = sanitizeVenueState(parsed);
  }
} catch (e) {
  console.error('Failed to load state from disk:', e);
}

if (!venueState) {
  venueState = createInitialVenueState();
}

function persistStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(venueState, null, 2), 'utf-8');
    tableCastManager.updateScoreboard(venueState);
  } catch (err) {
    console.error('Error writing state to disk:', err);
  }
}

// Create Express app & HTTP Server
const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);

// Connected SSE clients
const sseClients = new Set<express.Response>();

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

// Broadcaster for full state and targeted table entity events
function broadcastPayload(payloadStr: string, sourceSocket?: WebSocket) {
  // Broadcast to all WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== sourceSocket) {
      client.send(payloadStr);
    }
  });

  // Broadcast to all SSE clients
  const ssePayload = `data: ${payloadStr}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(ssePayload);
    } catch {
      sseClients.delete(res);
    }
  });
}

function broadcastFullState(sourceSocket?: WebSocket) {
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    state: venueState,
    timestamp: Date.now(),
  });
  broadcastPayload(payload, sourceSocket);
}

function broadcastTableEntity(tableId: number, sourceSocket?: WebSocket) {
  const table = venueState.tables.find((t: any) => t.id === tableId);
  const game = table?.currentGameId ? venueState.activeGames[table.currentGameId] || null : null;
  const entityPayload = JSON.stringify({
    type: 'TABLE_ENTITY_UPDATE',
    tableId,
    table,
    game,
    timestamp: Date.now(),
  });
  broadcastPayload(entityPayload, sourceSocket);
}

// Smart entity updater: ONLY touches tableId entity unit, never touching or wiping other tables!
function applyTableEntityUpdate(
  payload: {
    tableId: number;
    table?: any;
    game?: any;
    action?: string;
    activity?: any;
    historyEntry?: any;
    timestamp?: number;
    senderDeviceId?: string;
  },
  sourceSocket?: WebSocket
) {
  const { tableId, table, game, action, activity, historyEntry, timestamp, senderDeviceId } = payload;
  const numId = Number(tableId);
  if (!numId || numId < 1 || numId > 6) {
    return false;
  }

  const now = timestamp || Date.now();
  const currentTableIndex = venueState.tables.findIndex((t: any) => t.id === numId);
  if (currentTableIndex === -1) return false;

  const currentTable = venueState.tables[currentTableIndex];

  // If match concluded or reset on this table
  if (action === 'END_GAME' || action === 'RESET_TABLE' || game === null) {
    if (currentTable.currentGameId) {
      delete venueState.activeGames[currentTable.currentGameId];
    }
    venueState.tables[currentTableIndex] = {
      ...currentTable,
      ...(table || {}),
      status: 'available',
      currentGameId: null,
      activeRemoteDeviceId: null,
      activeRemoteDeviceName: null,
      remoteClaimedAt: null,
      remoteLastHeartbeat: null,
      lastActivity: now,
    };
    if (historyEntry && historyEntry.id) {
      venueState.history = [
        historyEntry,
        ...(venueState.history || []).filter((h: any) => h.id !== historyEntry.id),
      ];
    }
  } else if (game && game.id) {
    // Active match update (start, points, fouls, shot clock, shooter turn, pause/resume)
    // Only accept update if timestamp is newer or equal to prevent stale out-of-order overwrites
    if (now >= (currentTable.lastActivity || 0)) {
      venueState.activeGames[game.id] = game;
      venueState.tables[currentTableIndex] = {
        ...currentTable,
        ...(table || {}),
        status: game.status || 'playing',
        currentGameId: game.id,
        lastActivity: now,
      };
    }
  } else if (table) {
    // Table status or lease update without game replacement
    if (now >= (currentTable.lastActivity || 0)) {
      venueState.tables[currentTableIndex] = {
        ...currentTable,
        ...table,
        lastActivity: now,
      };
    }
  }

  // Record activity if provided
  if (activity && activity.id) {
    venueState.activities = [
      activity,
      ...(venueState.activities || []).filter((a: any) => a.id !== activity.id),
    ].slice(0, 80);
  }

  // Persist to file
  persistStateToDisk();

  // Send targeted entity broadcast first for instantaneous sub-10ms UI reaction
  const entityPayload = JSON.stringify({
    type: 'TABLE_ENTITY_UPDATE',
    tableId: numId,
    table: venueState.tables[currentTableIndex],
    game: venueState.tables[currentTableIndex]?.currentGameId ? venueState.activeGames[venueState.tables[currentTableIndex].currentGameId] || null : null,
    action,
    senderDeviceId,
    timestamp: now,
  });
  broadcastPayload(entityPayload, sourceSocket);

  // Send full state to keep background viewers synced
  broadcastFullState(sourceSocket);

  return true;
}

// Smart merger for full-state POSTs to NEVER wipe concurrent active tables
function mergeFullVenueState(incoming: any) {
  if (!incoming || !Array.isArray(incoming.tables)) return;

  const sanitized = sanitizeVenueState(incoming);

  // Merge each table entity preserving active matches
  for (let i = 0; i < 6; i++) {
    const tableId = i + 1;
    const incomingTable = sanitized.tables.find((t: any) => t.id === tableId);
    const serverTable = venueState.tables[i];

    if (!incomingTable) continue;

    // If incoming table has an active match
    if (incomingTable.status === 'playing' || incomingTable.status === 'paused') {
      if ((incomingTable.lastActivity || 0) >= (serverTable.lastActivity || 0)) {
        venueState.tables[i] = incomingTable;
        if (incomingTable.currentGameId && sanitized.activeGames[incomingTable.currentGameId]) {
          venueState.activeGames[incomingTable.currentGameId] =
            sanitized.activeGames[incomingTable.currentGameId];
        }
      }
    } else if (incomingTable.status === 'available') {
      // PROTECT ACTIVE GAMES: Only accept available status if server table was NOT actively playing,
      // OR if incoming payload has no active game and server game was already completed
      if (!serverTable.currentGameId || serverTable.status === 'available') {
        venueState.tables[i] = incomingTable;
      }
    } else {
      venueState.tables[i] = incomingTable;
    }
  }

  // Merge history
  if (Array.isArray(sanitized.history)) {
    const seenIds = new Set(venueState.history.map((h: any) => h.id));
    for (const h of sanitized.history) {
      if (h && h.id && !seenIds.has(h.id)) {
        venueState.history.unshift(h);
        seenIds.add(h.id);
      }
    }
  }

  // Merge activities
  if (Array.isArray(sanitized.activities)) {
    const seenAct = new Set(venueState.activities.map((a: any) => a.id));
    for (const a of sanitized.activities) {
      if (a && a.id && !seenAct.has(a.id)) {
        venueState.activities.unshift(a);
        seenAct.add(a.id);
      }
    }
    venueState.activities = venueState.activities.slice(0, 80);
  }

  // Merge players
  if (Array.isArray(sanitized.players)) {
    venueState.players = sanitized.players;
  }

  if (sanitized.settings) {
    venueState.settings = sanitized.settings;
  }

  persistStateToDisk();
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  // Send current state immediately on connection
  ws.send(
    JSON.stringify({
      type: 'STATE_UPDATE',
      state: venueState,
      timestamp: Date.now(),
    })
  );

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (!data) return;

      if (data.type === 'TABLE_ENTITY_UPDATE') {
        applyTableEntityUpdate(data, ws);
      } else if (data.type === 'STATE_UPDATE' && data.state) {
        mergeFullVenueState(data.state);
        broadcastFullState(ws);
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
  });
});

// Periodic ping to keep WebSocket connections active across proxies & mobile sleep
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 25000);

// SSE stream endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  // Send current state immediately
  res.write(
    `data: ${JSON.stringify({
      type: 'STATE_UPDATE',
      state: venueState,
      timestamp: Date.now(),
    })}\n\n`
  );

  sseClients.add(res);

  // Keep-alive ping
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// Dedicated Table Unit Entity Sync: POST /api/sync/table/:tableId
app.post('/api/sync/table/:tableId', (req, res) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const body = req.body || {};
    const success = applyTableEntityUpdate({
      tableId,
      table: body.table,
      game: body.game,
      action: body.action,
      activity: body.activity,
      historyEntry: body.historyEntry,
      timestamp: body.timestamp || Date.now(),
    });

    if (success) {
      return res.json({ success: true, tableId, timestamp: Date.now() });
    }
    return res.status(400).json({ error: 'Invalid table update' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Dedicated Table Unit Entity Fetch: GET /api/sync/table/:tableId
app.get('/api/sync/table/:tableId', (req, res) => {
  const tableId = parseInt(req.params.tableId, 10);
  const table = venueState.tables.find((t: any) => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }
  const game = table.currentGameId ? venueState.activeGames[table.currentGameId] || null : null;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  return res.json({ table, game, timestamp: Date.now() });
});

// HTTP API: GET /api/sync
app.get('/api/sync', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ state: venueState });
});

// HTTP API: POST /api/sync (Smart Entity-preserving merge)
app.post('/api/sync', (req, res) => {
  try {
    const incoming = req.body;
    if (incoming && incoming.tables) {
      mergeFullVenueState(incoming);
      broadcastFullState();
      return res.json({ success: true, timestamp: Date.now() });
    }
    return res.status(400).json({ error: 'Invalid state structure' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

import { streamManager } from './src/server/streamManager.ts';

// HTTP API: Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connectedSockets: wss.clients.size,
    connectedSse: sseClients.size,
    timestamp: Date.now(),
  });
});

// REST API 1: Register RTSP Camera & Initialize Stream Bridge
app.post('/api/cams/register', (req, res) => {
  try {
    const { id, url, name } = req.body || {};
    const tableId = id || 1;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid RTSP Stream URL required' });
    }

    const telemetry = streamManager.registerCamera(tableId, url.trim());
    const worker = streamManager.getCamera(tableId);

    return res.json({
      success: true,
      id: tableId,
      name: name || worker?.config.name,
      config: worker?.config,
      telemetry,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 2: Get Status & Real-time Telemetry for All Cameras
app.get('/api/cams/status', (_req, res) => {
  try {
    const allTelemetry = streamManager.getAllTelemetry();
    return res.json({
      success: true,
      cameras: allTelemetry,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 3: Get Status for Specific Camera
app.get('/api/cams/:id/status', (req, res) => {
  try {
    const id = req.params.id;
    const worker = streamManager.getCamera(id);
    if (!worker) {
      return res.status(404).json({ error: `Camera ${id} not found` });
    }
    return res.json({
      success: true,
      config: worker.config,
      telemetry: worker.telemetry,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 4: Gracefully Delete / Terminate Camera Worker
app.delete('/api/cams/:id', (req, res) => {
  try {
    const id = req.params.id;
    const success = streamManager.removeCamera(id);
    return res.json({
      success,
      message: success ? `Camera ${id} stream worker terminated` : `Camera ${id} was not active`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 5: Camera Snapshot Endpoint (SVG/JPEG direct render for browsers)
app.get('/api/cams/:id/snapshot', (req, res) => {
  const id = req.params.id;
  const worker = streamManager.getCamera(id);
  const tableId = id || '1';
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const host = worker?.config.host || '192.168.29.147';
  const ch = worker?.config.channel || tableId;

  // Generate real SVG image snapshot with OSD timestamp
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#0d4a2d"/>
      <rect width="640" height="16" fill="#22140d"/>
      <rect y="344" width="640" height="16" fill="#22140d"/>
      <rect width="16" height="360" fill="#22140d"/>
      <rect x="624" width="16" height="360" fill="#22140d"/>
      <circle cx="20" cy="20" r="14" fill="#050505"/>
      <circle cx="320" cy="12" r="14" fill="#050505"/>
      <circle cx="620" cy="20" r="14" fill="#050505"/>
      <circle cx="20" cy="340" r="14" fill="#050505"/>
      <circle cx="320" cy="348" r="14" fill="#050505"/>
      <circle cx="620" cy="340" r="14" fill="#050505"/>
      <line x1="160" y1="16" x2="160" y2="344" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
      <circle cx="480" cy="180" r="3" fill="rgba(255,255,255,0.5)"/>
      <circle cx="220" cy="180" r="8" fill="#ffffff" stroke="#ccc"/>
      <circle cx="460" cy="170" r="7.5" fill="#f59e0b" stroke="#111"/>
      <circle cx="475" cy="162" r="7.5" fill="#3b82f6" stroke="#111"/>
      <circle cx="475" cy="178" r="7.5" fill="#ef4444" stroke="#111"/>
      <circle cx="490" cy="154" r="7.5" fill="#8b5cf6" stroke="#111"/>
      <circle cx="490" cy="170" r="7.5" fill="#000000" stroke="#fff"/>
      <circle cx="490" cy="186" r="7.5" fill="#10b981" stroke="#111"/>
      <rect x="12" y="12" width="616" height="336" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <text x="24" y="32" fill="#ffffff" font-family="monospace" font-weight="bold" font-size="12">
        CAM-T0${tableId} • ${host}:554 • CH0${ch}/SUB0 • ${nowStr} • 30.0 FPS • 4.2 Mbps
      </text>
      <text x="500" y="32" fill="#FF002B" font-family="monospace" font-weight="bold" font-size="12">
        RTSP LIVE
      </text>
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(svg);
});

// REST API 6: TableCast YouTube Broadcast - Get Current Status
app.get('/api/broadcast/status', (_req, res) => {
  try {
    const status = tableCastManager.getStatus();
    return res.json({ success: true, broadcast: status, timestamp: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 7: TableCast YouTube Broadcast - Start Live Stream
app.post('/api/broadcast/start', async (req, res) => {
  try {
    const { tableId, rtspUrl, youtubeStreamKey, rtmpServer, youtubeWatchUrl, burnScoreboard } = req.body || {};
    tableCastManager.updateScoreboard(venueState);
    const result = await tableCastManager.startBroadcast({
      tableId,
      rtspUrl,
      youtubeStreamKey,
      rtmpServer,
      youtubeWatchUrl,
      burnScoreboard,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 8: TableCast YouTube Broadcast - Stop Live Stream
app.post('/api/broadcast/stop', (_req, res) => {
  try {
    const result = tableCastManager.stopBroadcast();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// REST API 9: TableCast YouTube Broadcast - Update Stream Configuration
app.post('/api/broadcast/config', (req, res) => {
  try {
    const config = req.body || {};
    const status = tableCastManager.updateConfig(config);
    return res.json({ success: true, broadcast: status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Setup Dev or Production Serving
async function startServer() {
  const distPath = path.resolve(APP_ROOT, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProd && hasDist) {
    // Production mode: Serve built dist folder & fallback to index.html for SPA routes
    console.log('[CueControl] Serving production static bundle from dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode: Vite middleware mode
    console.log('[CueControl] Mounting Vite middleware in development mode');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexHtmlPath = path.resolve(APP_ROOT, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[CueControl Server] Listening on http://0.0.0.0:${PORT} (${isProd && hasDist ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CueControl server:', err);
  process.exit(1);
});

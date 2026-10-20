import {
  Table,
  Game,
  CameraFeed,
  ActivityLog,
  StaffCall,
  VenueSettings,
  AuthUser,
  GameType,
  ScoringMode,
  ScoreAction,
  UserRole,
} from '../types.ts';
import { getDeviceId, getDeviceName } from '../utils/device.ts';
import { db } from './firebase.ts';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';

const STORAGE_KEY = 'cuecontrol_state_v3';
const CHANNEL_NAME = 'cuecontrol_realtime_sync';

export interface AppStoreState {
  tables: Table[];
  activeGames: Record<string, Game>; // gameId -> Game
  history: Game[];
  activities: ActivityLog[];
  staffCalls: StaffCall[];
  settings: VenueSettings;
  currentUser: AuthUser;
}

const INITIAL_SETTINGS: VenueSettings = {
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
};

const DEFAULT_DEMO_FEEDS: Record<number, CameraFeed> = {
  1: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    name: 'Overhead Cam • Arena Table 01',
    type: 'mp4',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'IP 192.168.1.101 • 1080p 30fps H.264',
  },
  2: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    name: 'Corner Angle • Table 02',
    type: 'mp4',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'IP 192.168.1.102 • 1080p 30fps H.264',
  },
  3: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    name: 'High Rail Cam • Table 03',
    type: 'mp4',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'IP 192.168.1.103 • 720p 30fps H.264',
  },
  4: {
    url: 'demo',
    name: 'CCTV Feed • Table 04',
    type: 'demo',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'Simulated IP Stream',
  },
  5: {
    url: 'demo',
    name: 'CCTV Feed • Table 05',
    type: 'demo',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'Simulated IP Stream',
  },
  6: {
    url: 'demo',
    name: 'CCTV Feed • Table 06',
    type: 'demo',
    enabled: true,
    aspectRatio: '16:9',
    showScoreOverlay: true,
    notes: 'Simulated IP Stream',
  },
};

function createInitialState(): AppStoreState {
  const now = Date.now();

  const tables: Table[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: `Table ${String(i + 1).padStart(2, '0')}`,
    status: 'available',
    currentGameId: null,
    lastActivity: now,
    activeRemoteDeviceId: null,
    activeRemoteDeviceName: null,
    remoteClaimedAt: null,
    remoteLastHeartbeat: null,
    theme: 'dark' as const,
    cameraFeed: DEFAULT_DEMO_FEEDS[i + 1] || null,
  }));

  return {
    tables,
    activeGames: {},
    history: [],
    activities: [],
    staffCalls: [],
    settings: INITIAL_SETTINGS,
    currentUser: {
      id: 'admin-1',
      email: 'admin@cuecontrol.venue',
      name: 'Yuvaraja (Venue Mgr)',
      role: 'admin',
    },
  };
}

class StoreManager {
  private state: AppStoreState;
  private listeners: Set<(state: AppStoreState) => void> = new Set();
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private reconnectAttempts = 0;
  private isConnectingWs = false;

  constructor() {
    this.state = this.loadState();
    this.initBroadcast();
    this.initRealtimeSync();
  }

  private initRealtimeSync() {
    if (typeof window === 'undefined') return;

    // 1. Initialize Firestore Cloud Sync (Zero-Server, Serverless Real-time)
    this.initFirestoreSync();

    // 2. Initialize WebSocket Connection
    this.connectWebSocket();

    // 3. Initialize SSE Connection as redundant push channel
    this.connectSSE();
  }

  private initFirestoreSync() {
    if (typeof window === 'undefined' || !db) return;

    try {
      // 1. Subscribe to real-time changes on /tables
      onSnapshot(collection(db, 'tables'), (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
          const tableData = change.doc.data() as Table;
          if (!tableData || !tableData.id) return;
          const tableIndex = this.state.tables.findIndex((t) => t.id === tableData.id);
          if (tableIndex >= 0) {
            const current = this.state.tables[tableIndex];
            if ((tableData.lastActivity || 0) >= (current.lastActivity || 0)) {
              this.state.tables[tableIndex] = { ...current, ...tableData };
              changed = true;
            }
          }
        });
        if (changed) {
          this.persist(this.state);
          this.notifyListeners();
        }
      }, (err) => {
        console.warn('[Firestore] Tables listener notice:', err.message);
      });

      // 2. Subscribe to real-time changes on /games
      onSnapshot(collection(db, 'games'), (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
          const gameData = change.doc.data() as Game;
          if (!gameData || !gameData.id) return;
          if (gameData.status === 'playing' || gameData.status === 'paused') {
            this.state.activeGames[gameData.id] = gameData;
            changed = true;
          } else if (gameData.status === 'completed') {
            if (this.state.activeGames[gameData.id]) {
              delete this.state.activeGames[gameData.id];
              if (!this.state.history.some((h) => h.id === gameData.id)) {
                this.state.history.unshift(gameData);
              }
              changed = true;
            }
          }
        });
        if (changed) {
          this.persist(this.state);
          this.notifyListeners();
        }
      }, (err) => {
        console.warn('[Firestore] Games listener notice:', err.message);
      });

      // 3. Subscribe to venue settings
      onSnapshot(doc(db, 'venue', 'settings'), (docSnap) => {
        if (docSnap.exists()) {
          const newSettings = docSnap.data() as VenueSettings;
          if (newSettings && newSettings.venueName) {
            this.state.settings = { ...this.state.settings, ...newSettings };
            this.persist(this.state);
            this.notifyListeners();
          }
        }
      }, (err) => {
        console.warn('[Firestore] Settings listener notice:', err.message);
      });
    } catch (e) {
      console.warn('[Firestore] Sync setup error:', e);
    }
  }

  private connectWebSocket() {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (this.isConnectingWs) return;

    try {
      this.isConnectingWs = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        this.ws = socket;
        this.isConnectingWs = false;
        this.reconnectAttempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data) return;
          if (data.type === 'TABLE_ENTITY_UPDATE') {
            this.handleIncomingTableEntity(data);
          } else if (data.type === 'STATE_UPDATE' && data.state) {
            this.handleIncomingState(data.state);
          }
        } catch {
          // Ignore parse errors
        }
      };

      socket.onerror = () => {
        this.isConnectingWs = false;
      };

      socket.onclose = () => {
        this.ws = null;
        this.isConnectingWs = false;
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
        this.reconnectAttempts++;
        setTimeout(() => this.connectWebSocket(), delay);
      };
    } catch {
      this.isConnectingWs = false;
    }
  }

  private connectSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (this.sse) {
        this.sse.close();
      }

      this.sse = new EventSource('/api/events');

      this.sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data) return;
          if (data.type === 'TABLE_ENTITY_UPDATE') {
            this.handleIncomingTableEntity(data);
          } else if (data.type === 'STATE_UPDATE' && data.state) {
            this.handleIncomingState(data.state);
          }
        } catch {
          // Ignore
        }
      };

      this.sse.onerror = () => {
        // EventSource automatically attempts to reconnect on connection loss
      };
    } catch {
      // Ignore if unsupported
    }
  }

  // Handle a scoped table entity update - updates ONLY this table without affecting any other table!
  public handleIncomingTableEntity(data: {
    tableId: number;
    table?: any;
    game?: any;
    action?: string;
    activity?: any;
    historyEntry?: any;
    senderDeviceId?: string;
    timestamp?: number;
  }) {
    const numId = Number(data.tableId);
    if (!numId || numId < 1 || numId > 6) return;

    // Ignore echo messages originating from this exact device to avoid layout bounce
    if (typeof window !== 'undefined' && data.senderDeviceId) {
      const myId = getDeviceId();
      if (myId && data.senderDeviceId === myId) {
        return;
      }
    }

    const tableIndex = this.state.tables.findIndex((t) => t.id === numId);
    if (tableIndex === -1) return;

    const currentTable = this.state.tables[tableIndex];
    const incomingTimestamp = data.timestamp || Date.now();

    // Prevent delayed/stale out-of-order packets from reverting newer local actions
    if (incomingTimestamp < (currentTable.lastActivity || 0)) {
      return;
    }

    if (data.action === 'END_GAME' || data.action === 'RESET_TABLE' || data.game === null) {
      if (currentTable.currentGameId) {
        delete this.state.activeGames[currentTable.currentGameId];
      }
      this.state.tables[tableIndex] = {
        ...currentTable,
        ...(data.table || {}),
        status: 'available',
        currentGameId: null,
        activeRemoteDeviceId: null,
        activeRemoteDeviceName: null,
        remoteClaimedAt: null,
        remoteLastHeartbeat: null,
        lastActivity: incomingTimestamp,
      };
      if (data.historyEntry && data.historyEntry.id) {
        if (!this.state.history.some((h) => h.id === data.historyEntry.id)) {
          this.state.history.unshift(data.historyEntry);
        }
      }
    } else if (data.game && data.game.id) {
      this.state.activeGames[data.game.id] = data.game;
      this.state.tables[tableIndex] = {
        ...currentTable,
        ...(data.table || {}),
        status: data.game.status || 'playing',
        currentGameId: data.game.id,
        lastActivity: incomingTimestamp,
      };
    } else if (data.table) {
      this.state.tables[tableIndex] = {
        ...currentTable,
        ...data.table,
        lastActivity: incomingTimestamp,
      };
    }

    if (data.activity && data.activity.id) {
      if (!this.state.activities.some((a) => a.id === data.activity.id)) {
        this.state.activities.unshift(data.activity);
        if (this.state.activities.length > 80) {
          this.state.activities = this.state.activities.slice(0, 80);
        }
      }
    }

    this.persist(this.state);
    this.notifyListeners();
  }

  // Handle a full venue state with smart per-table entity protection
  private handleIncomingState(incomingRaw: any) {
    if (!incomingRaw) return;
    const clean = this.sanitizeState(incomingRaw);

    let changed = false;

    // For each table 1..6:
    for (let i = 0; i < 6; i++) {
      const tableId = i + 1;
      const localTable = this.state.tables[i];
      const incomingTable = clean.tables.find((t) => t.id === tableId);
      if (!incomingTable) continue;

      // If incoming table has an active match, update it only if incoming lastActivity is newer or equal
      if (incomingTable.status === 'playing' || incomingTable.status === 'paused') {
        if (incomingTable.currentGameId && clean.activeGames[incomingTable.currentGameId]) {
          if ((incomingTable.lastActivity || 0) >= (localTable.lastActivity || 0)) {
            this.state.activeGames[incomingTable.currentGameId] = clean.activeGames[incomingTable.currentGameId];
            this.state.tables[i] = incomingTable;
            changed = true;
          }
        }
      } else if (incomingTable.status === 'available') {
        // If local table was playing, ONLY reset to available if incoming actually has a newer timestamp or game ended!
        if (localTable.status === 'playing' || localTable.status === 'paused') {
          if (incomingTable.lastActivity > (localTable.lastActivity || 0)) {
            if (localTable.currentGameId) {
              delete this.state.activeGames[localTable.currentGameId];
            }
            this.state.tables[i] = incomingTable;
            changed = true;
          }
        } else if (localTable.status !== incomingTable.status) {
          this.state.tables[i] = incomingTable;
          changed = true;
        }
      } else {
        if (JSON.stringify(localTable) !== JSON.stringify(incomingTable)) {
          this.state.tables[i] = incomingTable;
          changed = true;
        }
      }
    }

    // Merge history
    if (Array.isArray(clean.history)) {
      const existingIds = new Set(this.state.history.map((h) => h.id));
      for (const h of clean.history) {
        if (h && h.id && !existingIds.has(h.id)) {
          this.state.history.unshift(h);
          existingIds.add(h.id);
          changed = true;
        }
      }
    }

    // Merge activities
    if (Array.isArray(clean.activities)) {
      const existingIds = new Set(this.state.activities.map((a) => a.id));
      for (const a of clean.activities) {
        if (a && a.id && !existingIds.has(a.id)) {
          this.state.activities.unshift(a);
          existingIds.add(a.id);
          changed = true;
        }
      }
      this.state.activities = this.state.activities.slice(0, 80);
    }

    if (changed) {
      this.persist(this.state);
      this.notifyListeners();
    }
  }

  private sanitizeState(raw: any): AppStoreState {
    if (!raw || !raw.tables || !Array.isArray(raw.tables)) {
      return createInitialState();
    }

    // Filter out legacy demo matches
    const sanitizedActiveGames: Record<string, Game> = {};
    if (raw.activeGames && typeof raw.activeGames === 'object') {
      for (const [key, g] of Object.entries(raw.activeGames as Record<string, Game>)) {
        if (
          g &&
          g.id &&
          !['game-t1', 'game-t2', 'game-t4', 'game-t5'].includes(g.id) &&
          !String(g.id).startsWith('game-past-')
        ) {
          sanitizedActiveGames[key] = g;
        }
      }
    }

    // Filter out demo history
    const sanitizedHistory: Game[] = Array.isArray(raw.history)
      ? raw.history.filter((h: Game) => h && h.id && !h.id.startsWith('game-past-'))
      : [];

    // Filter out demo activities
    const sanitizedActivities: ActivityLog[] = Array.isArray(raw.activities)
      ? raw.activities.filter((a: ActivityLog) => a && a.id && !['act-1', 'act-2', 'act-3', 'act-4', 'act-5'].includes(a.id))
      : [];

    // Sanitize 6 physical tables
    const sanitizedTables: Table[] = Array.from({ length: 6 }, (_, i) => {
      const id = i + 1;
      const existing = raw.tables.find((t: Table) => t && t.id === id);
      if (!existing) {
        return {
          id,
          name: `Table ${String(id).padStart(2, '0')}`,
          status: 'available' as const,
          currentGameId: null,
          lastActivity: Date.now(),
          activeRemoteDeviceId: null,
          activeRemoteDeviceName: null,
          remoteClaimedAt: null,
          remoteLastHeartbeat: null,
          theme: 'dark' as const,
          cameraFeed: DEFAULT_DEMO_FEEDS[id] || null,
        };
      }

      const tableTheme = existing.theme === 'light' || existing.theme === 'dark' ? existing.theme : 'dark';
      const camFeed = existing.cameraFeed !== undefined ? existing.cameraFeed : (DEFAULT_DEMO_FEEDS[id] || null);

      if (existing.currentGameId && !sanitizedActiveGames[existing.currentGameId]) {
        return {
          ...existing,
          status: 'available' as const,
          currentGameId: null,
          activeRemoteDeviceId: null,
          activeRemoteDeviceName: null,
          remoteClaimedAt: null,
          remoteLastHeartbeat: null,
          theme: tableTheme,
          cameraFeed: camFeed,
        };
      }
      return {
        ...existing,
        theme: tableTheme,
        cameraFeed: camFeed,
      };
    });

    return {
      tables: sanitizedTables,
      activeGames: sanitizedActiveGames,
      history: sanitizedHistory,
      activities: sanitizedActivities,
      staffCalls: Array.isArray(raw.staffCalls) ? raw.staffCalls : [],
      settings: raw.settings ? { ...INITIAL_SETTINGS, ...raw.settings } : INITIAL_SETTINGS,
      currentUser: raw.currentUser || {
        id: 'admin-1',
        email: 'admin@cuecontrol.venue',
        name: 'Yuvaraja (Venue Mgr)',
        role: 'admin',
      },
    };
  }

  private loadState(): AppStoreState {
    if (typeof window === 'undefined') {
      return createInitialState();
    }
    try {
      localStorage.removeItem('cuecontrol_state_v1');
      localStorage.removeItem('cuecontrol_state_v2');

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const clean = this.sanitizeState(parsed);
        this.persist(clean);
        return clean;
      }
    } catch {
      // Fallback
    }
    const fresh = createInitialState();
    this.persist(fresh);
    return fresh;
  }

  private persist(state: AppStoreState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  private initBroadcast() {
    if (typeof window === 'undefined') return;
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'TABLE_ENTITY_UPDATE') {
            this.handleIncomingTableEntity(event.data);
          } else if (event.data.type === 'STATE_UPDATE' && event.data.state) {
            this.handleIncomingState(event.data.state);
          }
        };
      }
    } catch {
      // Fallback to storage event
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.tables && parsed.tables.length === 6) {
            this.handleIncomingState(parsed);
          }
        } catch {
          // Ignore
        }
      }
    });

    // Window focus or tab visibility change: sync
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncFromStorage();
        this.pullFromServer();
      }
    });

    window.addEventListener('focus', () => {
      this.syncFromStorage();
      this.pullFromServer();
    });

    // Initial pull
    this.pullFromServer();
    // Periodic fallback poll (10s is sufficient since WebSocket/SSE delivers instantaneous updates)
    setInterval(() => {
      this.pullFromServer();
    }, 10000);
  }

  // Push targeted table entity update to server and broadcast
  public syncTableEntity(
    tableId: number,
    options?: {
      action?: string;
      activity?: ActivityLog;
      historyEntry?: Game;
    }
  ) {
    const numId = Number(tableId);
    const table = this.getTable(numId);
    const game = this.getCurrentGame(numId) || null;
    const now = Date.now();
    const senderDeviceId = typeof window !== 'undefined' ? getDeviceId() : undefined;

    // 1. Local persist and notify listeners
    this.persist(this.state);
    this.notifyListeners();

    const payload = {
      type: 'TABLE_ENTITY_UPDATE',
      tableId: numId,
      table,
      game,
      action: options?.action,
      activity: options?.activity,
      historyEntry: options?.historyEntry,
      senderDeviceId,
      timestamp: now,
    };

    // 2. BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch {
        // Fallback
      }
    }

    // 3. WebSocket
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload));
      }
    } catch {
      // Ignore
    }

    // 4. HTTP POST
    if (typeof fetch !== 'undefined') {
      try {
        fetch(`/api/sync/table/${numId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {
        // Ignore
      }
    }

    // 5. Direct Firestore Real-time Cloud Sync (Serverless & Zero-cost)
    try {
      if (db && typeof window !== 'undefined') {
        if (table) {
          setDoc(doc(db, 'tables', String(numId)), JSON.parse(JSON.stringify(table)), { merge: true }).catch(() => {});
        }
        if (game) {
          setDoc(doc(db, 'games', String(game.id)), JSON.parse(JSON.stringify(game)), { merge: true }).catch(() => {});
        }
        if (options?.activity) {
          setDoc(doc(db, 'activities', String(options.activity.id)), JSON.parse(JSON.stringify(options.activity)), { merge: true }).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  }

  // Fetch single table entity from server (for instant load on mobile remote scan)
  public async pullTableFromServer(tableId: number): Promise<boolean> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return false;
    try {
      const res = await fetch(`/api/sync/table/${tableId}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.table) {
        this.handleIncomingTableEntity({
          tableId,
          table: data.table,
          game: data.game,
          timestamp: data.timestamp,
        });
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  }

  private pushToServer() {
    if (typeof window === 'undefined') return;

    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'STATE_UPDATE',
            state: this.state,
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      // Ignore socket send errors
    }

    if (typeof fetch !== 'undefined') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.state),
        }).catch(() => {});
      } catch {
        // Silently ignore if offline
      }
    }
  }

  public async pullFromServer(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return false;
    try {
      const res = await fetch('/api/sync', { method: 'GET' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.state && data.state.tables) {
        this.handleIncomingState(data.state);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }

  public syncFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.handleIncomingState(parsed);
      }
    } catch {
      // Ignore
    }
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('Listener error', err);
      }
    });
  }

  private notify(broadcast = false) {
    this.persist(this.state);
    this.notifyListeners();

    if (broadcast) {
      if (this.channel) {
        try {
          this.channel.postMessage({ type: 'STATE_UPDATE', state: this.state, timestamp: Date.now() });
        } catch {
          // Broadcast fallback handled by localStorage event
        }
      }
      this.pushToServer();
    }
  }

  public subscribe(listener: (state: AppStoreState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AppStoreState {
    return this.state;
  }

  public getTable(tableId: number): Table | undefined {
    return this.state.tables.find((t) => t.id === Number(tableId));
  }

  public getCurrentGame(tableId: number): Game | undefined {
    const table = this.getTable(tableId);
    if (!table || !table.currentGameId) return undefined;
    return this.state.activeGames[table.currentGameId];
  }

  public startGame(
    tableId: number,
    params: {
      player1: string;
      player2: string;
      gameType: GameType;
      scoringMode: ScoringMode;
      targetScore?: number;
      matchName?: string;
      tableTimerMinutes?: number;
      playerTimerSeconds?: number;
    },
    deviceId?: string,
    deviceName?: string
  ): { success: boolean; error?: string; gameId?: string } {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };
    if (table.status === 'playing' || table.currentGameId) {
      return { success: false, error: 'Table already has an active game' };
    }
    if (table.status === 'maintenance') {
      return { success: false, error: 'Cannot start game while table is under maintenance' };
    }
    if (!params.player1.trim() || !params.player2.trim()) {
      return { success: false, error: 'Both player names are required' };
    }

    const now = Date.now();
    const gameId = `game-${Date.now()}-${tableId}`;
    const newGame: Game = {
      id: gameId,
      tableId,
      matchName: params.matchName?.trim() || `${params.gameType} Match`,
      gameType: params.gameType,
      scoringMode: params.scoringMode,
      player1: params.player1.trim(),
      player2: params.player2.trim(),
      score1: 0,
      score2: 0,
      targetScore: params.targetScore && params.targetScore > 0 ? Number(params.targetScore) : undefined,
      currentRack: 1,
      fouls1: 0,
      fouls2: 0,
      status: 'playing',
      startTime: now,
      tableTimerMinutes: params.tableTimerMinutes !== undefined ? params.tableTimerMinutes : 45,
      playerTimerSeconds: params.playerTimerSeconds !== undefined ? params.playerTimerSeconds : 35,
      activePlayerIndex: 0,
      turnStartTime: now,
      totalPausedTime: 0,
      history: [
        {
          id: `h-start-${now}`,
          timestamp: now,
          playerIndex: 0,
          change: 0,
          type: 'game_start',
          score1After: 0,
          score2After: 0,
          actor: this.state.currentUser.name,
        },
      ],
    };

    // Obtain current device ID and name for exclusive remote locking
    const actualDeviceId = deviceId || (typeof window !== 'undefined' ? getDeviceId() : undefined);
    const actualDeviceName = deviceName || (typeof window !== 'undefined' ? getDeviceName() : undefined);

    // Update table
    table.status = 'playing';
    table.currentGameId = gameId;
    table.lastActivity = now;
    table.activeRemoteDeviceId = actualDeviceId;
    table.activeRemoteDeviceName = actualDeviceName;
    table.remoteClaimedAt = now;
    table.remoteLastHeartbeat = now;

    // Register active game
    this.state.activeGames[gameId] = newGame;

    // Add activity log
    const activity: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Game Started',
      timestamp: now,
      details: `${newGame.player1} vs ${newGame.player2} (${newGame.gameType})`,
      type: 'game_started',
    };
    this.addActivityDirect(activity);

    // Scoped entity sync: Table 1 starting NEVER touches or resets Table 2!
    this.syncTableEntity(tableId, { action: 'START_GAME', activity });

    return { success: true, gameId };
  }

  public updateScore(
    tableId: number,
    playerIndex: 0 | 1,
    delta: number,
    actor?: string,
    switchTurn?: boolean,
    actionNote?: string
  ): { success: boolean; error?: string; newScore?: number; isWinner?: boolean } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game on this table' };
    if (game.status === 'completed') return { success: false, error: 'Match is already completed' };

    const current = playerIndex === 0 ? game.score1 : game.score2;
    const target = current + delta;
    if (target < 0) return { success: false, error: 'Score cannot be negative' };

    const now = Date.now();
    if (playerIndex === 0) {
      game.score1 = target;
    } else {
      game.score2 = target;
    }

    // Determine active player turn
    if (switchTurn === true) {
      const nextPlayerIndex: 0 | 1 = playerIndex === 0 ? 1 : 0;
      game.activePlayerIndex = nextPlayerIndex;
      game.turnStartTime = now;
    } else if (switchTurn === false) {
      game.activePlayerIndex = playerIndex;
      game.turnStartTime = now;
    } else {
      if (delta > 0) {
        const nextPlayerIndex: 0 | 1 = playerIndex === 0 ? 1 : 0;
        game.activePlayerIndex = nextPlayerIndex;
        game.turnStartTime = now;
      } else {
        game.activePlayerIndex = playerIndex;
        game.turnStartTime = now;
      }
    }

    const actionActor = actor || this.state.currentUser.name || (playerIndex === 0 ? game.player1 : game.player2);

    const action: ScoreAction = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      playerIndex,
      change: delta,
      type: 'point',
      score1After: game.score1,
      score2After: game.score2,
      note: actionNote,
      actor: actionActor,
    };
    game.history.push(action);

    const table = this.getTable(tableId);
    if (table) table.lastActivity = now;

    // Check winning condition
    let isWinner = false;
    if (game.targetScore && target >= game.targetScore && delta > 0) {
      isWinner = true;
      const winnerName = playerIndex === 0 ? game.player1 : game.player2;
      game.winner = winnerName;
      if (this.state.settings.soundEffects) playScoreSound('win');
      if (this.state.settings.vibration) triggerVibration(100);
    } else {
      // Sound feedback
      if (this.state.settings.soundEffects) {
        if (delta > 0) playScoreSound('score');
        else playScoreSound('undo');
      }
      if (this.state.settings.vibration) {
        triggerVibration(delta > 0 ? 50 : 30);
      }
    }

    // Add activity
    const playerName = playerIndex === 0 ? game.player1 : game.player2;
    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Score Updated',
      timestamp: now,
      details: actionNote ? `${playerName} ${actionNote} (${game.score1} — ${game.score2})` : `${playerName} score ${delta > 0 ? `+${delta}` : delta} (${game.score1} — ${game.score2})`,
      type: 'score_updated',
    };
    this.addActivityDirect(act);

    // Sync ONLY this table entity
    this.syncTableEntity(tableId, { action: 'SCORE_UPDATE', activity: act });

    return { success: true, newScore: target, isWinner };
  }

  public setDirectScore(
    tableId: number,
    score1: number,
    score2: number,
    actor?: string
  ): { success: boolean; error?: string } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game' };
    const now = Date.now();
    game.score1 = Math.max(0, Math.floor(score1));
    game.score2 = Math.max(0, Math.floor(score2));
    game.turnStartTime = now;

    const actionActor = actor || this.state.currentUser.name || 'Referee';
    game.history.push({
      id: `direct-${now}`,
      timestamp: now,
      playerIndex: game.activePlayerIndex ?? 0,
      change: 0,
      type: 'point',
      score1After: game.score1,
      score2After: game.score2,
      note: `Direct score adjust: ${game.player1} ${game.score1} — ${game.score2} ${game.player2}`,
      actor: actionActor,
    });

    const table = this.getTable(tableId);
    if (table) table.lastActivity = now;

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Direct Score Entry',
      timestamp: now,
      details: `Scores set to ${game.score1} — ${game.score2} by ${actionActor}`,
      type: 'score_updated',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'SCORE_UPDATE', activity: act });
    return { success: true };
  }

  public reportFoulWithPenalty(
    tableId: number,
    foulingPlayerIndex: 0 | 1,
    penaltyPoints: number = 4,
    foulReason?: string,
    actor?: string
  ): { success: boolean; error?: string } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game' };

    const now = Date.now();
    if (foulingPlayerIndex === 0) {
      game.fouls1 += 1;
      if (penaltyPoints > 0) game.score2 += penaltyPoints;
    } else {
      game.fouls2 += 1;
      if (penaltyPoints > 0) game.score1 += penaltyPoints;
    }

    // Switch turn to opponent with fresh shot clock
    game.activePlayerIndex = foulingPlayerIndex === 0 ? 1 : 0;
    game.turnStartTime = now;

    const foulingName = foulingPlayerIndex === 0 ? game.player1 : game.player2;
    const opponentName = foulingPlayerIndex === 0 ? game.player2 : game.player1;

    game.history.push({
      id: `foul-${now}`,
      timestamp: now,
      playerIndex: foulingPlayerIndex,
      change: penaltyPoints,
      type: 'foul',
      score1After: game.score1,
      score2After: game.score2,
      note: `${foulReason || 'Foul'} by ${foulingName} (+${penaltyPoints} pts to ${opponentName})`,
      actor: actor || foulingName,
    });

    if (this.state.settings.soundEffects) playScoreSound('foul');
    if (this.state.settings.vibration) triggerVibration([80, 50, 80]);

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Foul Reported',
      timestamp: now,
      details: `${foulReason || 'Foul'} by ${foulingName} (+${penaltyPoints} pts to ${opponentName})`,
      type: 'score_updated',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'FOUL', activity: act });
    return { success: true };
  }

  public reportFoul(tableId: number, playerIndex: 0 | 1, penaltyPoints = 4): { success: boolean; error?: string } {
    return this.reportFoulWithPenalty(tableId, playerIndex, penaltyPoints, 'Foul committed');
  }

  public pauseGame(tableId: number): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    const game = this.getCurrentGame(tableId);
    if (!table || !game) return { success: false, error: 'No active game' };

    table.status = 'paused';
    game.status = 'paused';
    const now = Date.now();
    table.lastActivity = now;
    game.pausedAt = now;

    game.history.push({
      id: `pause-${now}`,
      timestamp: now,
      playerIndex: 0,
      change: 0,
      type: 'game_pause',
      score1After: game.score1,
      score2After: game.score2,
      actor: this.state.currentUser.name,
    });

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Game Paused',
      timestamp: now,
      details: `${game.player1} vs ${game.player2} paused`,
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'PAUSE', activity: act });
    return { success: true };
  }

  public resumeGame(tableId: number): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    const game = this.getCurrentGame(tableId);
    if (!table || !game) return { success: false, error: 'No paused game' };

    table.status = 'playing';
    game.status = 'playing';
    const now = Date.now();
    table.lastActivity = now;

    if (game.pausedAt) {
      game.totalPausedTime = (game.totalPausedTime || 0) + (now - game.pausedAt);
      game.pausedAt = undefined;
    }
    game.turnStartTime = now;

    game.history.push({
      id: `resume-${now}`,
      timestamp: now,
      playerIndex: 0,
      change: 0,
      type: 'game_resume',
      score1After: game.score1,
      score2After: game.score2,
      actor: this.state.currentUser.name,
    });

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Game Resumed',
      timestamp: now,
      details: `${game.player1} vs ${game.player2} resumed`,
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'RESUME', activity: act });
    return { success: true };
  }

  public switchActivePlayer(tableId: number, targetPlayerIndex?: 0 | 1): { success: boolean; activePlayerIndex?: 0 | 1 } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false };
    const nextIndex: 0 | 1 = targetPlayerIndex === 0 || targetPlayerIndex === 1
      ? targetPlayerIndex 
      : ((game.activePlayerIndex ?? 0) === 0 ? 1 : 0);
    const now = Date.now();
    game.activePlayerIndex = nextIndex;
    game.turnStartTime = now;
    const table = this.getTable(tableId);
    if (table) table.lastActivity = now;

    this.syncTableEntity(tableId, { action: 'TURN_SWITCH' });
    return { success: true, activePlayerIndex: nextIndex };
  }

  public resetPlayerTimer(tableId: number): { success: boolean } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false };
    game.turnStartTime = Date.now();
    const table = this.getTable(tableId);
    if (table) table.lastActivity = Date.now();

    this.syncTableEntity(tableId, { action: 'TIMER_RESET' });
    return { success: true };
  }

  public undoScore(tableId: number): { success: boolean; error?: string } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game' };
    if (!game.history || game.history.length <= 1) {
      return { success: false, error: 'Nothing to undo' };
    }

    // Find last point or foul action
    const lastAction = game.history.pop();
    if (!lastAction) return { success: false, error: 'Nothing to undo' };

    // Restore previous scores from the previous history item
    const prevItem = game.history[game.history.length - 1];
    if (prevItem) {
      game.score1 = prevItem.score1After;
      game.score2 = prevItem.score2After;
    } else {
      game.score1 = 0;
      game.score2 = 0;
    }

    const now = Date.now();
    const table = this.getTable(tableId);
    if (table) table.lastActivity = now;

    if (this.state.settings.soundEffects) playScoreSound('undo');

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Score Undone',
      timestamp: now,
      details: `Reverted last action (${game.score1} — ${game.score2})`,
      type: 'score_updated',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'SCORE_UNDO', activity: act });
    return { success: true };
  }

  public nextRack(tableId: number, rackWinnerIndex?: 0 | 1): { success: boolean; error?: string; currentRack?: number } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game' };

    const now = Date.now();
    game.currentRack = (game.currentRack || 1) + 1;
    game.turnStartTime = now;
    if (rackWinnerIndex !== undefined) {
      game.activePlayerIndex = rackWinnerIndex;
    }

    const table = this.getTable(tableId);
    if (table) table.lastActivity = now;

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'New Rack Started',
      timestamp: now,
      details: `Rack ${game.currentRack} underway`,
      type: 'game_started',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'NEXT_RACK', activity: act });
    return { success: true, currentRack: game.currentRack };
  }

  public updateGameSetup(
    tableId: number,
    updates: {
      player1?: string;
      player2?: string;
      targetScore?: number;
      playerTimerSeconds?: number;
      tableTimerMinutes?: number;
      gameType?: GameType;
      scoringMode?: ScoringMode;
    }
  ): { success: boolean; error?: string } {
    const game = this.getCurrentGame(tableId);
    if (!game) return { success: false, error: 'No active game' };

    if (updates.player1) game.player1 = updates.player1.trim();
    if (updates.player2) game.player2 = updates.player2.trim();
    if (updates.targetScore !== undefined) game.targetScore = updates.targetScore;
    if (updates.playerTimerSeconds !== undefined) game.playerTimerSeconds = updates.playerTimerSeconds;
    if (updates.tableTimerMinutes !== undefined) game.tableTimerMinutes = updates.tableTimerMinutes;
    if (updates.gameType) game.gameType = updates.gameType;
    if (updates.scoringMode) game.scoringMode = updates.scoringMode;

    const table = this.getTable(tableId);
    if (table) table.lastActivity = Date.now();

    this.syncTableEntity(tableId, { action: 'UPDATE_SETUP' });
    return { success: true };
  }

  public endGame(tableId: number, specifiedWinner?: string): { success: boolean; error?: string } {
    return this.endGameInternal(tableId, specifiedWinner, 'Concluded by staff/players');
  }

  private endGameInternal(tableId: number, specifiedWinner?: string, note?: string): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    const game = this.getCurrentGame(tableId);
    if (!table || !game) return { success: false, error: 'No active game' };

    const now = Date.now();
    const winner =
      specifiedWinner ||
      (game.score1 > game.score2 ? game.player1 : game.score2 > game.score1 ? game.player2 : undefined);

    game.status = 'completed';
    game.endTime = now;
    game.winner = winner;

    game.history.push({
      id: `end-${now}`,
      timestamp: now,
      playerIndex: 0,
      change: 0,
      type: 'game_end',
      score1After: game.score1,
      score2After: game.score2,
      note: note || `Match concluded`,
      actor: this.state.currentUser.name,
    });

    // Move completed game copy to history
    const completedGame = { ...game };
    this.state.history.unshift(completedGame);
    delete this.state.activeGames[game.id];

    // Reset table
    table.status = 'available';
    table.currentGameId = null;
    table.lastActivity = now;
    table.activeRemoteDeviceId = null;
    table.activeRemoteDeviceName = null;
    table.remoteClaimedAt = null;
    table.remoteLastHeartbeat = null;

    if (this.state.settings.soundEffects) playScoreSound('win');

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Game Completed',
      timestamp: now,
      details: `${winner ? `${winner} won` : 'Match finished'} (${game.score1} — ${game.score2})`,
      type: 'game_completed',
    };
    this.addActivityDirect(act);

    // Sync table conclusion
    this.syncTableEntity(tableId, {
      action: 'END_GAME',
      historyEntry: completedGame,
      activity: act,
    });

    return { success: true };
  }

  public resetGame(tableId: number): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    const game = this.getCurrentGame(tableId);
    if (!table) return { success: false, error: 'Table not found' };

    const now = Date.now();
    if (game) {
      delete this.state.activeGames[game.id];
    }
    table.status = 'available';
    table.currentGameId = null;
    table.lastActivity = now;
    table.activeRemoteDeviceId = null;
    table.activeRemoteDeviceName = null;
    table.remoteClaimedAt = null;
    table.remoteLastHeartbeat = null;

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Table Reset',
      timestamp: now,
      details: `Table ${tableId} was reset to available`,
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'RESET_TABLE', activity: act });
    return { success: true };
  }

  public setTableMaintenance(tableId: number, maintenance: boolean): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };
    if (maintenance && table.status === 'playing') {
      return { success: false, error: 'Cannot set maintenance while a game is actively playing. Please end or pause the game first.' };
    }

    table.status = maintenance ? 'maintenance' : 'available';
    table.lastActivity = Date.now();

    const act: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Status Changed',
      timestamp: Date.now(),
      details: maintenance ? 'Table placed under maintenance' : 'Table returned to service',
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'MAINTENANCE', activity: act });
    return { success: true };
  }

  public callStaff(tableId: number, reason: string): { success: boolean } {
    const call: StaffCall = {
      id: `call-${Date.now()}-${tableId}`,
      tableId,
      reason: reason || 'Assistance requested at table',
      timestamp: Date.now(),
      status: 'pending',
    };
    this.state.staffCalls.unshift(call);

    if (this.state.settings.soundEffects) playScoreSound('call');

    const act: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Staff Called',
      timestamp: Date.now(),
      details: reason || 'Assistance requested',
      type: 'staff_call',
    };
    this.addActivityDirect(act);

    this.notify(true);
    return { success: true };
  }

  public resolveStaffCall(callId: string): void {
    const call = this.state.staffCalls.find((c) => c.id === callId);
    if (call) {
      call.status = 'resolved';
      this.notify(true);
    }
  }

  public updateSettings(newSettings: Partial<VenueSettings>): void {
    this.state.settings = { ...this.state.settings, ...newSettings };
    if (db && typeof window !== 'undefined') {
      try {
        setDoc(doc(db, 'venue', 'settings'), JSON.parse(JSON.stringify(this.state.settings)), { merge: true }).catch(() => {});
      } catch {
        // Ignore
      }
    }
    this.notify(true);
  }

  public setAuthUser(user: Partial<AuthUser>) {
    this.state.currentUser = {
      ...this.state.currentUser,
      ...user,
    };
    this.notify(false);
  }

  public switchUserRole(role: UserRole): void {
    const roleNames: Record<UserRole, string> = {
      admin: 'Yuvaraja (Venue Mgr)',
      staff: 'Karan (Floor Referee)',
      player: 'Arjun (Mobile Player)',
    };
    this.state.currentUser = {
      ...this.state.currentUser,
      role,
      name: roleNames[role] || this.state.currentUser.name,
    };
    this.notify(false);
  }

  public setTableCameraFeed(tableId: number, feed: CameraFeed | null): { success: boolean; error?: string } {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };

    table.cameraFeed = feed ? { ...feed, lastUpdated: Date.now() } : null;
    table.lastActivity = Date.now();

    const act: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Camera Feed Updated',
      timestamp: Date.now(),
      details: feed ? `IP Camera configured: ${feed.name} (${feed.type.toUpperCase()})` : 'Camera feed removed',
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'CAMERA_UPDATE', activity: act });
    return { success: true };
  }

  private addActivityDirect(activity: ActivityLog) {
    this.state.activities.unshift(activity);
    if (this.state.activities.length > 80) {
      this.state.activities = this.state.activities.slice(0, 80);
    }
  }

  private addActivity(activity: Omit<ActivityLog, 'id'>) {
    const newLog: ActivityLog = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.addActivityDirect(newLog);
  }

  // Remote device controller session locking methods
  public claimTableRemote(
    tableId: number,
    deviceId: string,
    deviceName?: string
  ): {
    granted: boolean;
    inUse: boolean;
    controllerName?: string;
    claimedAt?: number;
  } {
    const table = this.getTable(tableId);
    if (!table) return { granted: false, inUse: false };
    const now = Date.now();
    const HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds

    // Check if claimed by another active device
    const hasActiveOther =
      Boolean(table.activeRemoteDeviceId) &&
      table.activeRemoteDeviceId !== deviceId &&
      Boolean(table.remoteLastHeartbeat) &&
      now - (table.remoteLastHeartbeat || 0) < HEARTBEAT_TIMEOUT_MS;

    if (hasActiveOther) {
      return {
        granted: false,
        inUse: true,
        controllerName: table.activeRemoteDeviceName || 'Another mobile device',
        claimedAt: table.remoteClaimedAt || now,
      };
    }

    // Grant or renew exclusive control for this device
    table.activeRemoteDeviceId = deviceId;
    table.activeRemoteDeviceName = deviceName || 'Mobile Controller';
    table.remoteClaimedAt = table.remoteClaimedAt || now;
    table.remoteLastHeartbeat = now;
    table.lastActivity = now;

    this.syncTableEntity(tableId, { action: 'CLAIM_REMOTE' });
    return {
      granted: true,
      inUse: false,
      controllerName: table.activeRemoteDeviceName,
      claimedAt: table.remoteClaimedAt,
    };
  }

  public heartbeatTableRemote(tableId: number, deviceId: string): boolean {
    const table = this.getTable(tableId);
    if (!table) return false;
    if (table.activeRemoteDeviceId === deviceId) {
      table.remoteLastHeartbeat = Date.now();
      this.persist(this.state);
      return true;
    }
    return false;
  }

  public releaseTableRemote(tableId: number, deviceId: string): boolean {
    const table = this.getTable(tableId);
    if (!table) return false;
    if (table.activeRemoteDeviceId === deviceId) {
      table.activeRemoteDeviceId = null;
      table.activeRemoteDeviceName = null;
      table.remoteClaimedAt = null;
      table.remoteLastHeartbeat = null;
      this.syncTableEntity(tableId, { action: 'RELEASE_REMOTE' });
      return true;
    }
    return false;
  }

  public takeOverTableRemote(tableId: number, deviceId: string, deviceName?: string): boolean {
    const table = this.getTable(tableId);
    if (!table) return false;
    const now = Date.now();
    table.activeRemoteDeviceId = deviceId;
    table.activeRemoteDeviceName = deviceName || 'Mobile Controller';
    table.remoteClaimedAt = now;
    table.remoteLastHeartbeat = now;
    table.lastActivity = now;

    const act: ActivityLog = {
      id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
      tableId,
      action: 'Remote Control Transferred',
      timestamp: now,
      details: `Scoring remote transferred to ${table.activeRemoteDeviceName}`,
      type: 'status_changed',
    };
    this.addActivityDirect(act);

    this.syncTableEntity(tableId, { action: 'TAKEOVER_REMOTE', activity: act });
    return true;
  }

  public getTableRemoteStatus(tableId: number, deviceId: string): {
    isControlledByMe: boolean;
    isInUseByOther: boolean;
    controllerName?: string;
    claimedAt?: number;
  } {
    const table = this.getTable(tableId);
    if (!table) return { isControlledByMe: false, isInUseByOther: false };
    const now = Date.now();
    const HEARTBEAT_TIMEOUT_MS = 30000;

    const hasActiveOther =
      Boolean(table.activeRemoteDeviceId) &&
      table.activeRemoteDeviceId !== deviceId &&
      Boolean(table.remoteLastHeartbeat) &&
      now - (table.remoteLastHeartbeat || 0) < HEARTBEAT_TIMEOUT_MS;

    const isControlledByMe = table.activeRemoteDeviceId === deviceId;

    return {
      isControlledByMe,
      isInUseByOther: hasActiveOther,
      controllerName: table.activeRemoteDeviceName || 'Another mobile device',
      claimedAt: table.remoteClaimedAt || undefined,
    };
  }

  public setTableTheme(tableId: number, theme: 'light' | 'dark') {
    const table = this.getTable(tableId);
    if (!table) return;
    table.theme = theme;
    table.lastActivity = Date.now();
    this.persist(this.state);
    this.syncTableEntity(tableId, { action: 'SET_TABLE_THEME' });
    this.notify();
  }

  public getTableTheme(tableId: number): 'light' | 'dark' {
    const table = this.getTable(tableId);
    return table?.theme || 'dark';
  }

  public resetAllData() {
    this.state = createInitialState();
    this.persist(this.state);
    this.pushToServer();
    this.notify(true);
  }

  public resetToDemoData() {
    this.resetAllData();
  }
}

// Sound FX helper
function playScoreSound(type: 'score' | 'foul' | 'win' | 'call' | 'undo') {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'score') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'foul') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.2);
      });
    } else if (type === 'undo') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'call') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

function triggerVibration(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error
    }
  }
}

export const store = new StoreManager();

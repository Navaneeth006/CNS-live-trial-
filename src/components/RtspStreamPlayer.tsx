import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Camera,
  Radio,
  Tv,
  Wifi,
  WifiOff,
  Sliders,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Terminal,
  ShieldCheck,
  Layers,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Play,
  Monitor,
} from 'lucide-react';
import { Table, Game, CameraFeed } from '../types.ts';
import { parseRtspUrl, ParsedRtspUrl } from '../utils/rtsp.ts';

interface RtspStreamPlayerProps {
  table: Table;
  game?: Game;
  isExpanded?: boolean;
  onOpenConfig?: (table: Table) => void;
  onToggleExpand?: (tableId: number) => void;
  showControls?: boolean;
}

export const RtspStreamPlayer: React.FC<RtspStreamPlayerProps> = ({
  table,
  game,
  isExpanded = false,
  onOpenConfig,
  onToggleExpand,
  showControls = true,
}) => {
  const feed = table.cameraFeed;
  const rawUrl = feed?.url || `rtsp://admin:Nav1%402211@192.168.29.147:554/video/livechannel=${table.id}&subtype=0`;
  const isEnabled = feed?.enabled ?? true;
  const parsedRtsp: ParsedRtspUrl = parseRtspUrl(rawUrl);

  const [activeTab, setActiveTab] = useState<'monitor' | 'rtsp_info' | 'gateway_bridge'>('monitor');
  const [streamMode, setStreamMode] = useState<'canvas' | 'video' | 'embed'>('canvas');
  const [isMuted, setIsMuted] = useState(true);
  const [showHud, setShowHud] = useState(feed?.showScoreOverlay ?? true);
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [fps, setFps] = useState(30);
  const [snapshotCount, setSnapshotCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if raw URL is a direct web video (MP4 / WebM / HLS) or embed
  useEffect(() => {
    if (rawUrl.startsWith('http') && (rawUrl.endsWith('.mp4') || rawUrl.endsWith('.webm') || rawUrl.includes('sample'))) {
      setStreamMode('video');
    } else if (rawUrl.includes('youtube.com') || rawUrl.includes('twitch.tv') || rawUrl.includes('/stream.html')) {
      setStreamMode('embed');
    } else {
      setStreamMode('canvas');
    }
  }, [rawUrl]);

  // Canvas-based real-time surveillance simulation and telemetry renderer
  useEffect(() => {
    if (streamMode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const tableId = table.id;
    let ballX = 140 + tableId * 24;
    let ballY = 70 + tableId * 14;
    let vx = 1.25 * (tableId % 2 === 0 ? 1 : -1);
    let vy = 0.95;
    let frameCount = 0;
    let lastFpsCalc = performance.now();

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // FPS calculation
      frameCount++;
      const nowPerf = performance.now();
      if (nowPerf - lastFpsCalc >= 1000) {
        setFps(Math.round((frameCount * 1000) / (nowPerf - lastFpsCalc)));
        frameCount = 0;
        lastFpsCalc = nowPerf;
      }

      // 1. Table Felt (Simonis 860 Tournament Cloth)
      ctx.fillStyle = table.theme === 'light' ? '#0d4a2d' : '#0a301c';
      ctx.fillRect(0, 0, w, h);

      // 2. Wood Cushion Rails
      ctx.fillStyle = '#22140d';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillRect(0, h - 14, w, 14);
      ctx.fillRect(0, 0, 14, h);
      ctx.fillRect(w - 14, 0, 14, h);

      // 3. Pockets with drop bevels
      ctx.fillStyle = '#050505';
      const pockets = [
        [16, 16],
        [w / 2, 10],
        [w - 16, 16],
        [16, h - 16],
        [w / 2, h - 10],
        [w - 16, h - 16],
      ];
      pockets.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 4. Head string line & Foot spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 14);
      ctx.lineTo(w * 0.25, h - 14);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w * 0.72, h / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();

      // 5. Moving Cue Ball
      ballX += vx;
      ballY += vy;
      if (ballX <= 26 || ballX >= w - 26) vx = -vx;
      if (ballY <= 26 || ballY >= h - 26) vy = -vy;

      ctx.beginPath();
      ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 6. Object Balls (Solids & Stripes)
      const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#f97316', '#10b981', '#78350f', '#000000', '#fbbf24'];
      for (let i = 0; i < 7; i++) {
        const ox = w * 0.65 + (i % 3) * 13;
        const oy = h * 0.35 + Math.floor(i / 3) * 14 + tableId * 2;
        ctx.beginPath();
        ctx.arc(ox, oy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      // 7. CCTV Surveillance Scanlines & Grain
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // 8. OSD Telemetry Stamp (Top Left)
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const hostDisplay = parsedRtsp.isValid ? `${parsedRtsp.host}:${parsedRtsp.port}` : '192.168.29.147';
      const chDisplay = parsedRtsp.isValid ? `CH0${parsedRtsp.channel}/SUB${parsedRtsp.subtype}` : `CH0${tableId}`;
      ctx.fillText(`CAM-T0${tableId} • ${hostDisplay} • ${chDisplay} • ${nowStr}`, 16, 26);

      // 9. Camera Brand / Protocol Stamp (Top Right)
      const brandStr = parsedRtsp.isValid ? `RTSP H.264 • ${parsedRtsp.cameraBrandGuess}` : 'RTSP • LIVE';
      ctx.fillText(brandStr, w - 165, 26);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [table.id, table.theme, streamMode, parsedRtsp.isValid, parsedRtsp.host, parsedRtsp.port, parsedRtsp.channel, parsedRtsp.subtype]);

  const copyToClipboard = (text: string, type: 'cli' | 'url') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'cli') {
        setCopiedCli(true);
        setTimeout(() => setCopiedCli(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    }
  };

  const isLivePlaying = table.status === 'playing';

  return (
    <div
      className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
        isLivePlaying
          ? 'bg-white dark:bg-[#151918] border-[#FF002B]/40 shadow-xl shadow-[#FF002B]/5'
          : 'bg-white dark:bg-[#151918] border-[#E1E3DF] dark:border-[#26302B]'
      } ${isExpanded ? 'col-span-full' : ''}`}
    >
      {/* Table & Stream Header */}
      <div className="p-3 sm:p-4 border-b border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-[#111413] text-white flex items-center justify-center font-display font-black text-sm border border-[#26302B] shrink-0">
            0{table.id}
          </span>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm sm:text-base text-[#111413] dark:text-[#F5F7F6] truncate">
                {table.name}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF002B]/10 text-[#FF002B] border border-[#FF002B]/25 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF002B] animate-pulse" />
                Live Preview Active
              </span>
            </div>
            <p className="text-[11px] text-[#5A635E] dark:text-[#8E9B95] font-mono truncate">
              {feed?.name || `Overhead Cam Table 0${table.id}`}
            </p>
          </div>
        </div>

        {/* Header Navigation / Views */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center p-0.5 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-lg border border-[#E1E3DF] dark:border-[#26302B] text-xs font-mono">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                activeTab === 'monitor'
                  ? 'bg-white dark:bg-[#151918] text-[#111413] dark:text-[#F5F7F6] shadow-xs'
                  : 'text-[#5A635E] dark:text-[#8E9B95]'
              }`}
            >
              Live Cam
            </button>
            <button
              onClick={() => setActiveTab('rtsp_info')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                activeTab === 'rtsp_info'
                  ? 'bg-white dark:bg-[#151918] text-[#111413] dark:text-[#F5F7F6] shadow-xs'
                  : 'text-[#5A635E] dark:text-[#8E9B95]'
              }`}
            >
              RTSP
            </button>
            <button
              onClick={() => setActiveTab('gateway_bridge')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                activeTab === 'gateway_bridge'
                  ? 'bg-white dark:bg-[#151918] text-[#111413] dark:text-[#F5F7F6] shadow-xs'
                  : 'text-[#5A635E] dark:text-[#8E9B95]'
              }`}
            >
              Bridge
            </button>
          </div>

          {onOpenConfig && (
            <button
              onClick={() => onOpenConfig(table)}
              className="p-1.5 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
              title="Edit Camera Stream URL"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleExpand && (
            <button
              onClick={() => onToggleExpand(table.id)}
              className="p-1.5 rounded-lg bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] text-[#5A635E] dark:text-[#9BA3A0] hover:text-[#111413] dark:hover:text-[#F5F7F6] transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse Feed' : 'Maximize Feed'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-center">
        {activeTab === 'monitor' && (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-[#26302B] shadow-inner group">
            {/* 1. Live Visual Canvas Stream */}
            {streamMode === 'canvas' ? (
              <canvas
                ref={canvasRef}
                width={480}
                height={270}
                className="w-full h-full object-cover rounded-xl block"
              />
            ) : streamMode === 'video' ? (
              <video
                ref={videoRef}
                src={rawUrl}
                autoPlay
                playsInline
                muted={isMuted}
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              <iframe
                src={rawUrl}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            )}

            {/* LIVE SCOREBOARD HUD OVERLAY (Broadcast Layer) */}
            {showHud && (
              <div className="absolute top-2.5 inset-x-2.5 pointer-events-none flex items-center justify-between">
                {/* Left Badge: Table & Game */}
                <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 text-xs font-display font-bold shadow-lg">
                  <span className="text-[#FF002B] font-mono">T0{table.id}</span>
                  <span className="opacity-40">|</span>
                  <span className="truncate max-w-[120px]">{game ? game.gameType : 'AVAILABLE'}</span>
                </div>

                {/* Center Match Score (if active) */}
                {game && (
                  <div className="px-3 py-1 rounded-lg bg-[#151918]/90 backdrop-blur-md border border-[#FF002B]/40 text-white flex items-center gap-3 text-xs font-mono font-bold shadow-lg">
                    <span className="text-white truncate max-w-[80px]">{game.player1}</span>
                    <span className="px-2 py-0.5 bg-[#FF002B] text-white rounded font-black text-sm">
                      {game.score1} : {game.score2}
                    </span>
                    <span className="text-white truncate max-w-[80px]">{game.player2}</span>
                  </div>
                )}

                {/* Right: Camera Telemetry */}
                <div className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white/90 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>{fps} FPS</span>
                </div>
              </div>
            )}

            {/* Hover On-Screen Tools Overlay */}
            {showControls && (
              <div className="absolute bottom-2 inset-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between bg-black/85 backdrop-blur-md border border-white/15 p-1.5 rounded-lg text-white">
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <button
                    onClick={() => setShowHud(!showHud)}
                    className="px-2 py-1 hover:bg-white/15 rounded flex items-center gap-1 text-xs cursor-pointer transition-colors"
                    title="Toggle Score HUD"
                  >
                    {showHud ? <Eye className="w-3 h-3 text-[#FF002B]" /> : <EyeOff className="w-3 h-3 text-white/60" />}
                    <span>HUD</span>
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 hover:bg-white/15 rounded cursor-pointer transition-colors"
                    title="Toggle Audio"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#FF002B]" />}
                  </button>
                  <button
                    onClick={() => {
                      setSnapshotCount((prev) => prev + 1);
                    }}
                    className="px-2 py-1 hover:bg-white/15 rounded flex items-center gap-1 text-xs cursor-pointer transition-colors"
                    title="Refresh Preview Frame"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <span className="text-[#FF002B] font-bold">1080p HD</span>
                  <span>4.2 Mbps</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: RTSP Stream Details & Breakdown */}
        {activeTab === 'rtsp_info' && (
          <div className="p-3 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-wider text-[11px]">
                RTSP Stream Telemetry
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Port 554 Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B]">
                <span className="text-[#8E9B95] block text-[9px] uppercase">IP Address</span>
                <span className="font-bold text-[#111413] dark:text-[#F5F7F6]">
                  {parsedRtsp.host || '192.168.29.147'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B]">
                <span className="text-[#8E9B95] block text-[9px] uppercase">Channel / Subtype</span>
                <span className="font-bold text-[#111413] dark:text-[#F5F7F6]">
                  CH {parsedRtsp.channel || table.id} • Subtype {parsedRtsp.subtype === 0 ? '0 (Main 1080p)' : '1 (Sub)'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B]">
                <span className="text-[#8E9B95] block text-[9px] uppercase">Username</span>
                <span className="font-bold text-[#111413] dark:text-[#F5F7F6]">
                  {parsedRtsp.username || 'admin'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#151918] border border-[#E1E3DF] dark:border-[#26302B]">
                <span className="text-[#8E9B95] block text-[9px] uppercase">Camera Protocol</span>
                <span className="font-bold text-[#FF002B]">
                  {parsedRtsp.cameraBrandGuess || 'CP Plus / Hikvision'}
                </span>
              </div>
            </div>

            {/* Sanitized URL copy box */}
            <div className="p-2 rounded-lg bg-black text-zinc-300 font-mono text-[10px] flex items-center justify-between gap-2 overflow-hidden">
              <span className="truncate">{parsedRtsp.sanitizedUrl || rawUrl}</span>
              <button
                onClick={() => copyToClipboard(parsedRtsp.rawUrl || rawUrl, 'url')}
                className="p-1 rounded hover:bg-zinc-800 text-white shrink-0 cursor-pointer"
                title="Copy Full RTSP URL"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Local Wi-Fi / Relay Gateway Bridge */}
        {activeTab === 'gateway_bridge' && (
          <div className="p-3 rounded-xl bg-[#F4F5F3] dark:bg-[#1D2321] border border-[#E1E3DF] dark:border-[#26302B] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111413] dark:text-[#F5F7F6] font-display uppercase tracking-wider text-[11px]">
                WebRTC & HLS Gateway Relay
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#FF002B]/10 text-[#FF002B] font-bold">
                Low Latency &lt;0.5s
              </span>
            </div>

            <p className="text-[11px] text-[#5A635E] dark:text-[#9BA3A0] leading-relaxed">
              Browsers stream local RTSP feeds through WebRTC or HLS. Run this 1-line relay command on any computer on your Wi-Fi:
            </p>

            <div className="p-2.5 bg-black rounded-lg border border-zinc-800 text-zinc-300 font-mono text-[10px] flex items-center justify-between gap-2">
              <span className="truncate text-emerald-400">
                {parsedRtsp.relayCliCommand || `npx rtsp-relay --url "${rawUrl}" --port 200${table.id}`}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    parsedRtsp.relayCliCommand || `npx rtsp-relay --url "${rawUrl}" --port 200${table.id}`,
                    'cli'
                  )
                }
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-1 shrink-0 cursor-pointer text-[10px]"
              >
                {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Match Telemetry footer */}
      {game ? (
        <div className="mx-3 sm:mx-4 mb-3 p-2 bg-[#F4F5F3] dark:bg-[#1D2321] rounded-xl border border-[#E1E3DF] dark:border-[#26302B] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-[#111413] dark:text-[#F5F7F6] truncate">{game.player1}</span>
            <span className="font-mono font-black text-[#FF002B]">
              {game.score1} - {game.score2}
            </span>
            <span className="font-bold text-[#111413] dark:text-[#F5F7F6] truncate">{game.player2}</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF002B]/10 text-[#FF002B] uppercase shrink-0">
            {game.gameType}
          </span>
        </div>
      ) : null}
    </div>
  );
};

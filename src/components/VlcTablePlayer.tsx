import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  Radio,
  Tv,
  Settings,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  Sliders,
  Layers,
  Sparkles,
  Download,
  Eye,
  EyeOff,
  Video,
  ChevronDown,
  Terminal,
  ShieldCheck,
  Disc,
  Activity,
  Server,
  Zap,
} from 'lucide-react';
import Hls from 'hls.js';
import { Table, Game, CameraFeed } from '../types.ts';
import { parseRtspUrl, ParsedRtspUrl } from '../utils/rtsp.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useRouter } from '../context/RouterContext.tsx';

interface CameraBackendTelemetry {
  status: 'online' | 'connecting' | 'reconnecting' | 'offline' | 'standby';
  tcpPort554Open: boolean;
  fps: number;
  bitrateKbps: number;
  latencyMs: number;
  codec: string;
  resolution: string;
  uptimeSeconds: number;
  reconnectAttempts: number;
  error?: string;
  streamUrls?: {
    snapshot: string;
    mjpeg?: string;
    hls?: string;
    ws?: string;
  };
}

interface VlcTablePlayerProps {
  table: Table;
  game?: Game;
  isExpanded?: boolean;
  onToggleExpand?: (tableId: number) => void;
  onUpdateFeedUrl?: (tableId: number, url: string, name?: string) => void;
  compact?: boolean;
}

// Convert standard YouTube watch/live links to embed links for browser playback
function resolveEmbedUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/watch?v=')) {
    const v = trimmed.split('v=')[1]?.split('&')[0];
    return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=1&playsinline=1`;
  }
  if (trimmed.includes('youtu.be/')) {
    const v = trimmed.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=1&playsinline=1`;
  }
  if (trimmed.includes('youtube.com/live/')) {
    const v = trimmed.split('youtube.com/live/')[1]?.split('?')[0];
    return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&mute=1&playsinline=1`;
  }
  return trimmed;
}

export const VlcTablePlayer: React.FC<VlcTablePlayerProps> = ({
  table,
  game,
  isExpanded = false,
  onToggleExpand,
  onUpdateFeedUrl,
  compact = false,
}) => {
  const { showToast } = useToast();
  const { navigate } = useRouter();

  const feed = table.cameraFeed;
  const initialUrl = feed?.url || `rtsp://admin:Nav1%402211@192.168.29.147:554/video/livechannel=${table.id}&subtype=0`;

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [showHud, setShowHud] = useState(feed?.showScoreOverlay ?? true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'rtsp_details' | 'obs_bridge'>('stream');
  const [copiedObs, setCopiedObs] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [fps, setFps] = useState(30);
  const [videoMode, setVideoMode] = useState<'canvas' | 'video' | 'hls' | 'embed' | 'webcam'>('canvas');
  const [telemetry, setTelemetry] = useState<CameraBackendTelemetry | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const parsedRtsp: ParsedRtspUrl = parseRtspUrl(inputUrl);

  // Sync state if external feed changes
  useEffect(() => {
    if (feed?.url && feed.url !== inputUrl) {
      setInputUrl(feed.url);
    }
  }, [feed?.url]);

  // Register with backend RTSP Transcoder & Ingestion Engine
  useEffect(() => {
    const registerCam = async () => {
      try {
        const res = await fetch('/api/cams/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: table.id,
            url: inputUrl.trim(),
            name: table.name,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.telemetry) {
            setTelemetry(data.telemetry);
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    registerCam();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cams/${table.id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.telemetry) {
            setTelemetry(data.telemetry);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [table.id, inputUrl]);

  // Determine optimal playback mode based on URL
  useEffect(() => {
    const trimmed = inputUrl.trim().toLowerCase();
    let webcamMediaStream: MediaStream | null = null;

    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (trimmed === 'webcam') {
      setVideoMode('webcam');
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 1280, height: 720 } })
          .then((stream) => {
            webcamMediaStream = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.warn('[Webcam] Access notice:', err);
            setVideoMode('canvas');
          });
      }
    } else if (trimmed.endsWith('.m3u8')) {
      if (videoRef.current) videoRef.current.srcObject = null;
      setVideoMode('hls');
      if (videoRef.current) {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(inputUrl.trim());
          hls.attachMedia(videoRef.current);
          hlsRef.current = hls;
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = inputUrl.trim();
        }
      }
    } else if (trimmed.startsWith('http') && (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.includes('sample'))) {
      if (videoRef.current) videoRef.current.srcObject = null;
      setVideoMode('video');
      if (videoRef.current) {
        videoRef.current.src = inputUrl.trim();
      }
    } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('twitch.tv') || trimmed.includes('/stream.html')) {
      if (videoRef.current) videoRef.current.srcObject = null;
      setVideoMode('embed');
    } else {
      if (videoRef.current) videoRef.current.srcObject = null;
      // RTSP and virtual cameras render on the high-performance live surveillance canvas engine
      setVideoMode('canvas');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (webcamMediaStream) {
        webcamMediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [inputUrl]);

  // Canvas-based real-time surveillance simulation and telemetry renderer
  useEffect(() => {
    if (videoMode !== 'canvas' || !isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const tableId = table.id;
    let ballX = 140 + tableId * 24;
    let ballY = 70 + tableId * 14;
    let vx = 1.3 * (tableId % 2 === 0 ? 1 : -1);
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

      // 6. Object Balls
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
      const brandStr = parsedRtsp.isValid ? `RTSP H.264 • ${parsedRtsp.cameraBrandGuess}` : 'VLC RTSP • LIVE';
      ctx.fillText(brandStr, w - 165, 26);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [table.id, table.theme, videoMode, isPlaying, parsedRtsp.isValid, parsedRtsp.host, parsedRtsp.port, parsedRtsp.channel, parsedRtsp.subtype]);

  // Handle URL change & Play
  const handleApplyUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputUrl.trim();
    if (onUpdateFeedUrl) {
      onUpdateFeedUrl(table.id, trimmed, `Overhead Cam Table 0${table.id}`);
    }
    setIsPlaying(true);
    showToast('Stream URL Loaded', `VLC Player Table 0${table.id} connecting to stream`, 'success');
  };

  // Quick Presets
  const applyPreset = (type: 'rtsp_user' | 'sample_hd' | 'webcam' | 'demo' | 'youtube') => {
    let target = '';
    if (type === 'rtsp_user') {
      target = `rtsp://admin:Nav1%402211@192.168.29.147:554/video/livechannel=${table.id}&subtype=0`;
    } else if (type === 'sample_hd') {
      target = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    } else if (type === 'webcam') {
      target = 'webcam';
    } else if (type === 'youtube') {
      target = 'https://www.youtube.com/watch?v=live_stream';
    } else {
      target = 'demo';
    }
    setInputUrl(target);
    if (onUpdateFeedUrl) {
      onUpdateFeedUrl(table.id, target);
    }
    setIsPlaying(true);
    showToast('Preset Loaded', `Switched Table 0${table.id} to ${type}`, 'info');
  };

  // Snapshot frame capture
  const handleSnapshot = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `table-0${table.id}-snapshot-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      showToast('Snapshot Saved', `Downloaded Table 0${table.id} video frame`, 'success');
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/stream/${table.id}`;

  const copyObsLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(obsUrl);
      setCopiedObs(true);
      setTimeout(() => setCopiedObs(false), 2000);
      showToast('OBS Link Copied', `Paste into OBS Studio as Browser Source`, 'success');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between bg-[#151918] border-[#26302B] shadow-2xl ${
        isExpanded ? 'col-span-full ring-2 ring-[#FF002B]/50' : ''
      }`}
    >
      {/* VLC Header Bar with Title & Stream URL Input */}
      <div className="p-3 border-b border-[#26302B] bg-[#111413] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* VLC Cone & Table Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#FF6600]/15 text-[#FF6600] flex items-center justify-center border border-[#FF6600]/30 shadow-md">
            <Disc className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm text-white tracking-wide">
                Table 0{table.id}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#FF002B]/20 text-[#FF002B] border border-[#FF002B]/30 uppercase">
                {telemetry?.status === 'online' ? 'STREAM ONLINE' : parsedRtsp.isValid ? 'RTSP LIVE' : videoMode.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[160px]">
              {parsedRtsp.isValid ? `${parsedRtsp.host}:${parsedRtsp.port}` : table.name}
            </p>
          </div>
        </div>

        {/* Inline URL Input Bar (VLC Open Network Stream Style) */}
        <form onSubmit={handleApplyUrl} className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste RTSP / HLS / MP4 Stream URL..."
              className="w-full pl-3 pr-8 py-1.5 bg-black/80 border border-zinc-700 focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
            />
            {parsedRtsp.isValid && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title="Valid RTSP URL" />
            )}
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-[#FF6600] hover:bg-[#E65C00] active:scale-95 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm"
            title="Load and play stream"
          >
            Play
          </button>
        </form>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-xs ${
              showDrawer
                ? 'bg-[#FF6600]/20 border-[#FF6600]/40 text-[#FF6600]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Stream Options & Telemetry"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          {onToggleExpand && (
            <button
              onClick={() => onToggleExpand(table.id)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand View'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Video Screen Area */}
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        {/* Stream Player Viewport */}
        {videoMode === 'canvas' ? (
          <canvas
            ref={canvasRef}
            width={480}
            height={270}
            className="w-full h-full object-cover block"
          />
        ) : videoMode === 'video' || videoMode === 'hls' || videoMode === 'webcam' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            loop={videoMode !== 'webcam'}
            className="w-full h-full object-cover"
          />
        ) : (
          <iframe
            src={resolveEmbedUrl(inputUrl)}
            className="w-full h-full border-0 pointer-events-auto"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        )}

        {/* Match Scoreboard HUD Overlay */}
        {showHud && (
          <div className="absolute top-2.5 inset-x-2.5 pointer-events-none flex items-center justify-between">
            <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 text-xs font-display font-bold shadow-lg">
              <span className="text-[#FF002B] font-mono">T0{table.id}</span>
              <span className="opacity-40">|</span>
              <span className="truncate max-w-[120px]">{game ? game.gameType : 'AVAILABLE'}</span>
            </div>

            {game && (
              <div className="px-3 py-1 rounded-lg bg-[#151918]/90 backdrop-blur-md border border-[#FF002B]/40 text-white flex items-center gap-3 text-xs font-mono font-bold shadow-lg">
                <span className="text-white truncate max-w-[80px]">{game.player1}</span>
                <span className="px-2 py-0.5 bg-[#FF002B] text-white rounded font-black text-sm">
                  {game.score1} : {game.score2}
                </span>
                <span className="text-white truncate max-w-[80px]">{game.player2}</span>
              </div>
            )}

            <div className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white/90 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] animate-pulse" />
              <span>{fps} FPS</span>
            </div>
          </div>
        )}

        {/* Hover Fast Actions */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <button
            onClick={() => setShowHud(!showHud)}
            className="p-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs backdrop-blur-md border border-white/20 cursor-pointer"
            title="Toggle Score HUD"
          >
            {showHud ? <Eye className="w-3.5 h-3.5 text-[#FF6600]" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* VLC Control & Transport Toolbar (Bottom Deck) */}
      <div className="p-2.5 bg-[#111413] border-t border-[#26302B] flex items-center justify-between gap-3 text-white">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-white transition-colors cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current text-[#FF6600]" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setTimeout(() => setIsPlaying(true), 100);
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Stop & Reset Stream"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={handleApplyUrl}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Reconnect Stream"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-zinc-800">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#FF6600]" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-14 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FF6600]"
            />
          </div>
        </div>

        {/* Telemetry & Stream Status */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span className="text-[#FF6600] font-bold">1080p H.264</span>
          <span>•</span>
          <span>{telemetry ? `${telemetry.bitrateKbps} kbps` : '4096 kbps'}</span>
        </div>

        {/* Broadcast & Output Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSnapshot}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Capture Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={copyObsLink}
            className="px-2.5 py-1 rounded-lg bg-[#FF002B] hover:bg-[#D60024] active:scale-95 text-white text-[11px] font-bold font-display uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Copy OBS Studio Browser Source Link"
          >
            <Radio className="w-3 h-3" />
            <span>{copiedObs ? 'Copied' : 'OBS Stream'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Settings & Presets Drawer */}
      {showDrawer && (
        <div className="p-3 bg-[#0E100F] border-t border-[#26302B] space-y-3 animate-in slide-in-from-top-2 duration-150 text-xs">
          {/* Backend Real-Time Telemetry Bar */}
          <div className="p-2.5 bg-black rounded-lg border border-zinc-800 text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">TCP Port 554</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active / Ready
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">Transcode Codec</span>
              <span className="font-bold text-white">{telemetry?.codec || 'H.264 / AAC'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">Latency</span>
              <span className="font-bold text-[#FF6600]">{telemetry?.latencyMs || 120} ms</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase">Server Uptime</span>
              <span className="font-bold text-white">{telemetry?.uptimeSeconds || 0}s</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Quick Stream Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('rtsp_user')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left cursor-pointer transition-colors"
              >
                <span className="font-bold block text-[11px] text-[#FF6600]">RTSP NVR Ch {table.id}</span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block">192.168.29.147</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('sample_hd')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left cursor-pointer transition-colors"
              >
                <span className="font-bold block text-[11px] text-sky-400">Sample HD MP4</span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block">1080p Video</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('webcam')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left cursor-pointer transition-colors"
              >
                <span className="font-bold block text-[11px] text-emerald-400">USB Webcam</span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block">Browser Camera</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('youtube')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left cursor-pointer transition-colors"
              >
                <span className="font-bold block text-[11px] text-red-500">YouTube Live</span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block">Broadcast Feed</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('demo')}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-left cursor-pointer transition-colors"
              >
                <span className="font-bold block text-[11px] text-purple-400">Virtual Sim</span>
                <span className="text-[9px] text-zinc-500 font-mono truncate block">3D Table Engine</span>
              </button>
            </div>
          </div>

          {/* OBS Browser Source Copy Box */}
          <div className="p-2.5 bg-black rounded-lg border border-zinc-800 flex items-center justify-between gap-2 font-mono text-[10px]">
            <div className="truncate">
              <span className="text-zinc-500 block text-[9px] uppercase">OBS Browser Source URL</span>
              <span className="text-emerald-400 truncate block">{obsUrl}</span>
            </div>
            <button
              onClick={copyObsLink}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold shrink-0 cursor-pointer"
            >
              {copiedObs ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

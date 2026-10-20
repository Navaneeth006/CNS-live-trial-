import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface BroadcastScoreboardState {
  tables?: Array<{ id: number; name?: string; currentGameId?: string | null }>;
  activeGames?: Record<
    string,
    {
      status?: string;
      gameType?: string;
      player1?: string;
      player2?: string;
      score1?: number;
      score2?: number;
    }
  >;
}

export interface BroadcastSession {
  tableId: number;
  status: 'idle' | 'connecting' | 'live' | 'reconnecting' | 'stopped';
  rtspUrl: string;
  sanitizedRtspUrl: string;
  youtubeStreamKey: string;
  maskedStreamKey: string;
  rtmpServer: string;
  youtubeWatchUrl: string;
  burnScoreboard: boolean;
  startedAt: number | null;
  uptimeSeconds: number;
  fps: number;
  bitrateKbps: number;
  resolution: string;
  health: 'excellent' | 'good' | 'poor' | 'offline';
  reconnectCount: number;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>;
}

export class TableCastBroadcastManager extends EventEmitter {
  private session: BroadcastSession;
  private ffmpegProcess: ChildProcess | null = null;
  private uptimeInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private scoreboardDirectory: string | null = null;
  private scoreboardFile: string | null = null;
  private scoreboardText = '';
  private currentVenueState: BroadcastScoreboardState = {};

  constructor() {
    super();
    this.session = {
      tableId: 1,
      status: 'idle',
      rtspUrl: 'rtsp://admin:Qwerty%4012345@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
      sanitizedRtspUrl: 'rtsp://admin:******@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
      youtubeStreamKey: '',
      maskedStreamKey: '',
      rtmpServer: 'rtmp://a.rtmp.youtube.com/live2',
      youtubeWatchUrl: '',
      burnScoreboard: true,
      startedAt: null,
      uptimeSeconds: 0,
      fps: 30,
      bitrateKbps: 4500,
      resolution: '1280x720 (720p 60fps)',
      health: 'offline',
      reconnectCount: 0,
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: 'TableCast Ingestion Engine initialized and ready for YouTube Live broadcast.',
        },
      ],
    };
  }

  private addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.session.logs.unshift({ timestamp, level, message });
    if (this.session.logs.length > 100) {
      this.session.logs = this.session.logs.slice(0, 100);
    }
    this.emit('log', { timestamp, level, message });
  }

  private sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
      if (url.includes('@')) {
        const parts = url.split('@');
        const schemeAndUser = parts[0];
        const hostPart = parts[1];
        const userPrefix = schemeAndUser.split(':')[0] + '://' + (schemeAndUser.split('://')[1]?.split(':')[0] || 'admin');
        return `${userPrefix}:******@${hostPart}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '********';
    return `${key.slice(0, 4)}-****-****-${key.slice(-4)}`;
  }

  public getStatus(): BroadcastSession {
    if (this.session.startedAt && this.session.status === 'live') {
      this.session.uptimeSeconds = Math.floor((Date.now() - this.session.startedAt) / 1000);
    }
    return { ...this.session };
  }

  public updateScoreboard(state: BroadcastScoreboardState): void {
    this.currentVenueState = state;
    if (!this.scoreboardFile) return;

    const table = state.tables?.find((item) => item.id === this.session.tableId);
    const game = table?.currentGameId ? state.activeGames?.[table.currentGameId] : undefined;
    const cleanName = (name: string | undefined, fallback: string) =>
      (name || fallback).replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
    const tableName = cleanName(table?.name, `Table 0${this.session.tableId}`);
    const text =
      game && (game.status === 'playing' || game.status === 'paused')
        ? `${tableName}  |  ${cleanName(game.player1, 'Player 1')}  ${game.score1 ?? 0} - ${game.score2 ?? 0}  ${cleanName(game.player2, 'Player 2')}  |  ${(game.gameType || 'POOL').toUpperCase()}${game.status === 'paused' ? '  |  PAUSED' : ''}`
        : `${tableName}  |  WAITING FOR NEXT MATCH`;

    if (text === this.scoreboardText) return;

    try {
      fs.writeFileSync(this.scoreboardFile, text, 'utf8');
      this.scoreboardText = text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog('error', `[Scoreboard] Could not update the live score overlay: ${message}`);
    }
  }

  private cleanupScoreboard(): void {
    if (this.scoreboardDirectory) {
      try {
        fs.rmSync(this.scoreboardDirectory, { recursive: true, force: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.addLog('error', `[Scoreboard] Could not remove temporary overlay files: ${message}`);
      }
    }
    this.scoreboardDirectory = null;
    this.scoreboardFile = null;
    this.scoreboardText = '';
  }

  public updateConfig(config: {
    tableId?: number;
    rtspUrl?: string;
    youtubeStreamKey?: string;
    rtmpServer?: string;
    youtubeWatchUrl?: string;
    burnScoreboard?: boolean;
    resolution?: string;
  }): BroadcastSession {
    if (config.tableId !== undefined) this.session.tableId = config.tableId;
    if (config.rtspUrl !== undefined) {
      this.session.rtspUrl = config.rtspUrl.trim();
      this.session.sanitizedRtspUrl = this.sanitizeUrl(config.rtspUrl);
    }
    if (config.youtubeStreamKey !== undefined) {
      this.session.youtubeStreamKey = config.youtubeStreamKey.trim();
      this.session.maskedStreamKey = this.maskKey(config.youtubeStreamKey.trim());
    }
    if (config.rtmpServer !== undefined) this.session.rtmpServer = config.rtmpServer.trim();
    if (config.youtubeWatchUrl !== undefined) this.session.youtubeWatchUrl = config.youtubeWatchUrl.trim();
    if (config.burnScoreboard !== undefined) this.session.burnScoreboard = config.burnScoreboard;
    if (config.resolution !== undefined) this.session.resolution = config.resolution;

    this.addLog('info', `Broadcast configuration updated for Table 0${this.session.tableId}`);
    return this.getStatus();
  }

  public async startBroadcast(config?: {
    tableId?: number;
    rtspUrl?: string;
    youtubeStreamKey?: string;
    rtmpServer?: string;
    youtubeWatchUrl?: string;
    burnScoreboard?: boolean;
  }): Promise<{ success: boolean; message: string; session: BroadcastSession }> {
    if (config) {
      this.updateConfig(config);
    }

    if (this.session.status === 'live' || this.session.status === 'connecting') {
      return { success: true, message: 'Broadcast is already running', session: this.getStatus() };
    }

    if (!this.session.rtspUrl.trim().toLowerCase().startsWith('rtsp://')) {
      const message = 'A valid RTSP camera URL is required.';
      this.addLog('error', `[TableCast] ${message}`);
      return { success: false, message, session: this.getStatus() };
    }
    if (!this.session.youtubeStreamKey) {
      const message = 'Enter your YouTube Live stream key before starting the broadcast.';
      this.addLog('error', `[TableCast] ${message}`);
      return { success: false, message, session: this.getStatus() };
    }

    let rtmpProtocol: string;
    try {
      rtmpProtocol = new URL(this.session.rtmpServer).protocol;
    } catch {
      rtmpProtocol = '';
    }
    if (rtmpProtocol !== 'rtmp:' && rtmpProtocol !== 'rtmps:') {
      const message = 'The YouTube ingest server must be a valid RTMP or RTMPS URL.';
      this.addLog('error', `[TableCast] ${message}`);
      return { success: false, message, session: this.getStatus() };
    }

    this.session.status = 'connecting';
    this.session.health = 'offline';
    this.session.startedAt = null;
    this.session.reconnectCount = 0;

    const streamKey = this.session.youtubeStreamKey;
    const rtmpDest = `${this.session.rtmpServer.replace(/\/$/, '')}/${streamKey || 'live2'}`;

    this.addLog('info', `[TableCast] Connecting to Table 0${this.session.tableId} RTSP stream: ${this.session.sanitizedRtspUrl}`);
    this.addLog('info', `[TableCast] Target RTMP Ingest: ${this.session.rtmpServer} (Key: ${this.session.maskedStreamKey || 'PREVIEW_MODE'})`);
    this.addLog('info', `[FFmpeg] Protocol: RTSP over TCP | Audio: Continuous Stereo AAC 44.1kHz | Video: H.264 High Profile`);

    let videoFilter: string | null = null;
    if (this.session.burnScoreboard) {
      try {
        this.scoreboardDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'csnlive-broadcast-'));
        this.scoreboardFile = path.join(this.scoreboardDirectory, 'scoreboard.txt');
        this.scoreboardText = '';
        this.updateScoreboard(this.currentVenueState);
        const textFile = this.scoreboardFile.replace(/\\/g, '/').replace(':', '\\:');
        const fontFile =
          process.platform === 'win32' && fs.existsSync('C:\\Windows\\Fonts\\arial.ttf')
            ? `fontfile='C\\:/Windows/Fonts/arial.ttf':`
            : '';
        videoFilter = `drawtext=${fontFile}textfile='${textFile}':reload=1:fontcolor=white:fontsize=h/24:box=1:boxcolor=black@0.76:boxborderw=18:x=(w-text_w)/2:y=h*0.04:expansion=none`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.cleanupScoreboard();
        this.session.status = 'stopped';
        this.session.health = 'offline';
        this.addLog('error', `[Scoreboard] Could not prepare the live score overlay: ${message}`);
        return {
          success: false,
          message: 'Could not prepare the live scoreboard overlay.',
          session: this.getStatus(),
        };
      }
    }

    const ffmpegArgs = [
      '-hide_banner',
      '-loglevel', 'warning',
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-reorder_queue_size', '500',
      '-i', this.session.rtspUrl,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-map', '0:v:0',
      '-map', '1:a:0',
      ...(videoFilter
        ? [
            '-vf', videoFilter,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-pix_fmt', 'yuv420p',
            '-b:v', '8000k',
            '-maxrate', '8000k',
            '-bufsize', '16000k',
          ]
        : ['-c:v', 'copy']),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-flags', '+global_header',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      '-stats_period', '1',
      '-progress', 'pipe:2',
      rtmpDest,
    ];

    return new Promise((resolve) => {
      let settled = false;
      let receivedVideo = false;
      let proc: ChildProcess | null = null;
      const startupTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.session.status = 'stopped';
        this.session.health = 'offline';
        this.session.startedAt = null;
        this.addLog('error', '[FFmpeg] Timed out waiting for video frames to reach the RTMP output.');
        proc?.kill('SIGTERM');
        this.ffmpegProcess = null;
        resolve({
          success: false,
          message: 'FFmpeg started but did not send video frames to YouTube. Check the camera URL and FFmpeg logs.',
          session: this.getStatus(),
        });
      }, 20000);

      const finishStartup = (success: boolean, message: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimeout);
        resolve({ success, message, session: this.getStatus() });
      };

      try {
        proc = spawn('ffmpeg', ffmpegArgs, { windowsHide: true });
      } catch (error) {
        clearTimeout(startupTimeout);
        this.session.status = 'stopped';
        this.session.health = 'offline';
        const message = error instanceof Error ? error.message : 'Unable to start FFmpeg.';
        this.addLog('error', `[FFmpeg] ${message}`);
        finishStartup(false, message);
        return;
      }
      this.ffmpegProcess = proc;

      proc.once('spawn', () => {
        this.addLog('info', '[FFmpeg] Process started; waiting for camera frames and RTMP output.');
      });

      proc.on('error', (error) => {
        this.session.status = 'stopped';
        this.session.health = 'offline';
        this.session.startedAt = null;
        this.ffmpegProcess = null;
        this.cleanupScoreboard();
        const message = `Could not start FFmpeg: ${error.message}`;
        this.addLog('error', `[FFmpeg] ${message}`);
        finishStartup(false, message);
      });

      proc.stderr?.on('data', (data) => {
        const text: string = data.toString().trim();
        if (!text) return;
        const progressFrame = text.match(/(?:^|\r?\n)frame=\s*(\d+)/m);
        const diagnosticText = text
          .split(/\r?\n/)
          .filter((line: string) => !/^(frame|fps|stream_\d+_\d+_q|bitrate|total_size|out_time|dup_frames|drop_frames|speed|progress)=/.test(line.trim()))
          .join('\n')
          .trim();
        if (diagnosticText) {
          const safeText = diagnosticText
            .replaceAll(this.session.rtspUrl, this.session.sanitizedRtspUrl)
            .replaceAll(rtmpDest, `${this.session.rtmpServer.replace(/\/$/, '')}/******`)
            .replaceAll(streamKey, '******');
          this.addLog('warn', `[FFmpeg] ${safeText.slice(0, 240)}`);
        }

        if (!receivedVideo && progressFrame && Number(progressFrame[1]) > 0) {
          receivedVideo = true;
          this.session.status = 'live';
          this.session.health = 'good';
          this.session.startedAt = Date.now();
          if (this.uptimeInterval) clearInterval(this.uptimeInterval);
          this.uptimeInterval = setInterval(() => {
            if (this.session.startedAt && this.session.status === 'live') {
              this.session.uptimeSeconds = Math.floor((Date.now() - this.session.startedAt) / 1000);
            }
          }, 1000);
          this.addLog('success', `[TableCast] Video frames are being sent to YouTube Live for Table 0${this.session.tableId}.`);
          finishStartup(true, `Table 0${this.session.tableId} is sending video to YouTube Live.`);
        }
      });

      proc.on('close', (code) => {
        if (this.ffmpegProcess === proc) this.ffmpegProcess = null;
        this.cleanupScoreboard();
        if (this.uptimeInterval) {
          clearInterval(this.uptimeInterval);
          this.uptimeInterval = null;
        }
        if (this.session.status !== 'stopped') {
          this.session.status = 'stopped';
          this.session.health = 'offline';
          this.session.startedAt = null;
          const message = receivedVideo
            ? `Broadcast process exited with code ${code}. Review the FFmpeg logs for details.`
            : `FFmpeg exited with code ${code} before the broadcast could start. Review the FFmpeg logs for details.`;
          this.addLog('error', `[FFmpeg] ${message}`);
          finishStartup(false, message);
        } else if (!receivedVideo) {
          finishStartup(false, 'FFmpeg stopped before video reached the RTMP output.');
        } else {
          this.addLog('warn', `[FFmpeg] Broadcast process exited with code ${code}.`);
        }
      });
    });
  }

  public stopBroadcast(): { success: boolean; message: string; session: BroadcastSession } {
    if (this.session.status === 'idle' || this.session.status === 'stopped') {
      return { success: true, message: 'Broadcast is not running', session: this.getStatus() };
    }

    this.addLog('info', `[TableCast] Terminating broadcast pipeline for Table 0${this.session.tableId}...`);

    if (this.ffmpegProcess) {
      try {
        this.ffmpegProcess.kill('SIGTERM');
      } catch {}
      this.ffmpegProcess = null;
    } else {
      this.cleanupScoreboard();
    }

    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }

    this.session.status = 'stopped';
    this.session.health = 'offline';
    this.session.startedAt = null;
    this.addLog('info', `[TableCast] Broadcast stopped cleanly. Stream key safely detached.`);

    return {
      success: true,
      message: 'Broadcast stopped successfully',
      session: this.getStatus(),
    };
  }
}

export const tableCastManager = new TableCastBroadcastManager();

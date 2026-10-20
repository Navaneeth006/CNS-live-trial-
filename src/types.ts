export type TableStatus = 'available' | 'playing' | 'paused' | 'maintenance';

export type GameType = '8-Ball' | '9-Ball' | '10-Ball' | 'Straight Pool' | 'Custom';

export type ScoringMode = 'points' | 'frames';

export type UserRole = 'admin' | 'staff' | 'player';

export interface ScoreAction {
  id: string;
  timestamp: number;
  playerIndex: 0 | 1;
  change: number; // +1, -1
  type: 'point' | 'frame' | 'foul' | 'undo' | 'game_start' | 'game_pause' | 'game_resume' | 'game_end';
  score1After: number;
  score2After: number;
  note?: string;
  actor: string;
}

export interface Game {
  id: string;
  tableId: number; // 1 to 6
  matchName?: string;
  gameType: GameType;
  scoringMode: ScoringMode;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  targetScore?: number;
  currentRack?: number;
  fouls1: number;
  fouls2: number;
  status: 'playing' | 'paused' | 'completed';
  startTime: number;
  endTime?: number;
  winner?: string;
  history: ScoreAction[];
  tableTimerMinutes?: number; // Match duration countdown in minutes (e.g. 30, 45, 60, or 0 for count up)
  playerTimerSeconds?: number; // Shot clock countdown in seconds (e.g. 30, 35, 45, 60, or 0 for off)
  activePlayerIndex?: 0 | 1; // Current player shooting (0 = player 1, 1 = player 2)
  turnStartTime?: number; // Timestamp when current turn started
  totalPausedTime?: number;
  pausedAt?: number;
}

export type CameraStreamType = 'auto' | 'rtsp' | 'webrtc' | 'mjpeg' | 'hls' | 'mp4' | 'embed' | 'webcam' | 'demo';

export interface CameraFeed {
  url: string; // IP camera URL, RTSP/HLS stream, MJPEG http url, embed URL, webcam, or demo
  name: string; // e.g. "Overhead Camera", "Pocket View"
  type: CameraStreamType;
  enabled: boolean;
  aspectRatio?: '16:9' | '4:3';
  showScoreOverlay?: boolean;
  notes?: string;
  lastUpdated?: number;
  rtspDetails?: {
    username?: string;
    host?: string;
    port?: number;
    channel?: number;
    subtype?: number;
    relayUrl?: string;
    webrtcUrl?: string;
    snapshotUrl?: string;
  };
}

export interface Table {
  id: number; // 1 to 6
  name: string;
  status: TableStatus;
  currentGameId: string | null;
  notes?: string;
  lastActivity: number;
  activeRemoteDeviceId?: string | null;
  activeRemoteDeviceName?: string | null;
  remoteClaimedAt?: number | null;
  remoteLastHeartbeat?: number | null;
  theme?: 'light' | 'dark'; // Per-table independent theme
  cameraFeed?: CameraFeed | null; // IP Camera Video Feed for this table
}

export interface ActivityLog {
  id: string;
  tableId: number;
  action: string;
  timestamp: number;
  details: string;
  type: 'game_started' | 'score_updated' | 'game_completed' | 'status_changed' | 'staff_call';
}

export interface StaffCall {
  id: string;
  tableId: number;
  reason: string;
  timestamp: number;
  status: 'pending' | 'resolved';
}

export interface VenueSettings {
  venueName: string;
  tableCount: number;
  currency: string;
  featuredTableId: number;
  soundEffects: boolean;
  vibration: boolean;
  overlayStyle: 'broadcast-top' | 'broadcast-bottom' | 'minimal-side';
  showTimerOnOverlay: boolean;
  defaultGameType: GameType;
  defaultTargetScore?: number;
  autoEndGame: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

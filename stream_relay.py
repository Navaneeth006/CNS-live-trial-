#!/usr/bin/env python3
"""
=============================================================================
CSN.Live — 24/7 Autonomous RTSP to YouTube Live RTMP Stream Relay & Bridge
=============================================================================
Ingests local IP camera RTSP feeds (CP Plus / Dahua / Hikvision / ONVIF),
ensures continuous AAC audio track synthesis to prevent YouTube disconnects,
performs zero-CPU video direct copy (-c:v copy), and handles automated
heartbeat monitoring with exponential backoff auto-reconnection.
=============================================================================
"""

import os
import sys
import time
import signal
import socket
import logging
import subprocess
from urllib.parse import urlparse, unquote
from typing import List, Optional

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Relay] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("StreamRelay")

# ---------------------------------------------------------------------------
# Load Configuration (.env fallback)
# ---------------------------------------------------------------------------
def load_env_file(filepath: str = ".env"):
    """Loads key=value pairs from .env file if present."""
    if not os.path.isfile(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = val

# Load from .env or .env.stream if available
load_env_file(".env.stream")
load_env_file(".env")

# ---------------------------------------------------------------------------
# Environment Variables & Defaults
# ---------------------------------------------------------------------------
RTSP_URL = os.getenv(
    "RTSP_URL",
    "rtsp://admin:Qwerty%4012345@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0",
)
YOUTUBE_STREAM_KEY = os.getenv("YOUTUBE_STREAM_KEY", "").strip()
YOUTUBE_RTMP_SERVER = os.getenv("YOUTUBE_RTMP_SERVER", "rtmp://a.rtmp.youtube.com/live2")
RTSP_TRANSPORT = os.getenv("RTSP_TRANSPORT", "tcp")  # 'tcp' is strictly required for stability
ENABLE_LOCAL_HLS = os.getenv("ENABLE_LOCAL_HLS", "false").lower() in ("true", "1", "yes")
LOCAL_HLS_DIR = os.getenv("LOCAL_HLS_DIR", "/tmp/csn_hls")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Backoff configuration
INITIAL_BACKOFF_SEC = int(os.getenv("INITIAL_BACKOFF_SEC", "3"))
MAX_BACKOFF_SEC = int(os.getenv("MAX_BACKOFF_SEC", "60"))
TCP_PROBE_TIMEOUT_SEC = int(os.getenv("TCP_PROBE_TIMEOUT_SEC", "3"))

# ---------------------------------------------------------------------------
# Global State & Clean Shutdown Handling
# ---------------------------------------------------------------------------
active_process: Optional[subprocess.Popen] = None
is_running: bool = True

def sanitize_url_for_logs(url: str) -> str:
    """Masks credentials in RTSP/RTMP URLs for clean logging."""
    if "@" in url:
        prefix = url.split("://")[0] + "://" if "://" in url else ""
        after_scheme = url.split("://", 1)[1] if "://" in url else url
        creds, rest = after_scheme.split("@", 1)
        user = creds.split(":", 1)[0] if ":" in creds else creds
        return f"{prefix}{user}:******@{rest}"
    return url

def signal_handler(sig, frame):
    """Gracefully terminates child FFmpeg processes on SIGINT/SIGTERM."""
    global is_running, active_process
    sig_name = "SIGINT" if sig == signal.SIGINT else "SIGTERM"
    logger.info(f"Received {sig_name}. Shutting down Stream Relay gracefully...")
    is_running = False

    if active_process and active_process.poll() is None:
        logger.info("Terminating FFmpeg child process...")
        active_process.terminate()
        try:
            active_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            logger.warning("FFmpeg did not terminate in time. Forcing SIGKILL...")
            active_process.kill()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ---------------------------------------------------------------------------
# TCP Port 554 Connectivity Probe
# ---------------------------------------------------------------------------
def probe_camera_network(rtsp_url: str, timeout: int = 3) -> bool:
    """
    Performs a lightweight TCP handshake to the camera's RTSP port
    to verify network reachability before spawning heavy FFmpeg pipelines.
    """
    try:
        # Normalize scheme to parse host & port
        parsed = urlparse(rtsp_url.replace("rtsp://", "http://"))
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 554

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            if result == 0:
                return True
            else:
                logger.warning(f"TCP probe failed for {host}:{port} (error code: {result})")
                return False
    except Exception as e:
        logger.warning(f"Network probe error for {rtsp_url}: {e}")
        return False

# ---------------------------------------------------------------------------
# FFmpeg Command Builder
# ---------------------------------------------------------------------------
def build_ffmpeg_command() -> List[str]:
    """
    Constructs an optimized FFmpeg ingestion and broadcast pipeline:
    1. Direct Video Copy (-c:v copy): 0% CPU consumption, pristine original 1080p stream.
    2. Synthetic Silent AAC Audio Track (-f lavfi -i anullsrc): Ensures YouTube Live
       never disconnects due to missing or non-AAC (G.711) audio from IP cameras.
    3. Low-latency TCP Ingest with packet buffer tuning.
    """
    dest_rtmp = f"{YOUTUBE_RTMP_SERVER.rstrip('/')}/{YOUTUBE_STREAM_KEY}"

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "warning",
        # Force RTSP over TCP to eliminate UDP packet loss/artifacts on Wi-Fi
        "-rtsp_transport", RTSP_TRANSPORT,
        # Buffer and socket timeout tuning
        "-timeout", "5000000",        # 5 seconds socket I/O timeout (microseconds)
        "-reorder_queue_size", "500",  # Packet reordering buffer
        "-i", RTSP_URL,
        # Generate synthetic silent stereo AAC track (44.1 kHz, 128 kbps)
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        # Map video stream from camera (input 0) & audio from synthetic generator (input 1)
        "-map", "0:v:0",
        "-map", "1:a:0",
        # Video: Direct stream copy (0% CPU)
        "-c:v", "copy",
        # Audio: High-compatibility AAC encoder for YouTube Live
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        # Force Keyframe & timestamps alignment
        "-flags", "+global_header",
        "-f", "flv",
        "-flvflags", "no_duration_filesize",
        dest_rtmp,
    ]

    return cmd

# ---------------------------------------------------------------------------
# Main Resilient Relay Loop
# ---------------------------------------------------------------------------
def run_relay():
    global active_process, is_running

    logger.info("==================================================================")
    logger.info("  CSN.Live 24/7 RTSP -> YouTube Live Relay Bridge Starting        ")
    logger.info("==================================================================")
    logger.info(f"Source Camera   : {sanitize_url_for_logs(RTSP_URL)}")
    logger.info(f"Target Ingest   : {YOUTUBE_RTMP_SERVER}/******")
    logger.info(f"Transport Mode  : RTSP over {RTSP_TRANSPORT.upper()}")
    logger.info("Video Strategy  : Direct Stream Copy (-c:v copy, ~0% CPU)")
    logger.info("Audio Strategy  : Continuous Synthetic Stereo AAC (44.1kHz)")
    logger.info("==================================================================")

    if not YOUTUBE_STREAM_KEY:
        logger.error("YOUTUBE_STREAM_KEY is missing! Please set it in .env or environment.")
        logger.info("Example: YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx-xxxx")
        sys.exit(1)

    backoff = INITIAL_BACKOFF_SEC

    while is_running:
        # Step 1: Check Camera TCP Connectivity (Port 554)
        logger.info("Probing IP camera reachability...")
        if not probe_camera_network(RTSP_URL, timeout=TCP_PROBE_TIMEOUT_SEC):
            logger.warning(
                f"Camera unreachable on TCP 554. Retrying in {backoff}s (Backoff active)..."
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF_SEC)
            continue

        # Step 2: Build Command & Launch FFmpeg
        cmd = build_ffmpeg_command()
        logger.info("Camera online! Spawning FFmpeg live broadcast pipeline...")
        start_time = time.time()

        try:
            active_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Monitor child process output & health
            while is_running and active_process.poll() is None:
                # Read any warning/error line if available
                line = active_process.stderr.readline()
                if line:
                    line_clean = line.strip()
                    if "error" in line_clean.lower() or "fatal" in line_clean.lower():
                        logger.warning(f"[FFmpeg] {line_clean}")
                    elif "speed=" in line_clean:
                        logger.debug(f"[FFmpeg Telemetry] {line_clean}")
                time.sleep(0.5)

            exit_code = active_process.poll()
            stream_duration = int(time.time() - start_time)

            if exit_code == 0:
                logger.info(f"FFmpeg pipeline ended cleanly after {stream_duration}s streaming.")
                backoff = INITIAL_BACKOFF_SEC
            else:
                stderr_output = active_process.stderr.read().strip() if active_process.stderr else ""
                logger.warning(
                    f"FFmpeg exited with code {exit_code} after {stream_duration}s. Details: {stderr_output[-200:] if stderr_output else 'No stderr'}"
                )

                # If the stream ran stably for more than 60s, reset backoff
                if stream_duration >= 60:
                    backoff = INITIAL_BACKOFF_SEC
                else:
                    backoff = min(backoff * 2, MAX_BACKOFF_SEC)

        except Exception as e:
            logger.error(f"Failed to spawn FFmpeg process: {e}")
            backoff = min(backoff * 2, MAX_BACKOFF_SEC)

        if is_running:
            logger.info(f"Reconnecting to RTSP stream in {backoff}s...")
            time.sleep(backoff)

    logger.info("Stream Relay exited.")

if __name__ == "__main__":
    run_relay()

#!/usr/bin/env bash
# =============================================================================
# CSN.Live — 24/7 Autonomous RTSP to YouTube Live RTMP Shell Relay
# =============================================================================

set -e

# Load .env if present
if [ -f .env.stream ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env.stream | xargs)
elif [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

RTSP_URL="${RTSP_URL:-rtsp://admin:Qwerty%4012345@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0}"
YOUTUBE_STREAM_KEY="${YOUTUBE_STREAM_KEY:-}"
YOUTUBE_RTMP_SERVER="${YOUTUBE_RTMP_SERVER:-rtmp://a.rtmp.youtube.com/live2}"
RTSP_TRANSPORT="${RTSP_TRANSPORT:-tcp}"
INITIAL_BACKOFF=3
MAX_BACKOFF=60
BACKOFF=$INITIAL_BACKOFF

# Trapping SIGINT and SIGTERM for clean process cleanup
cleanup() {
  echo ""
  echo "[Relay] Received termination signal. Killing FFmpeg..."
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

if [ -z "$YOUTUBE_STREAM_KEY" ]; then
  echo "[Error] YOUTUBE_STREAM_KEY is required. Please set it in .env or pass it as an environment variable."
  echo "Example: export YOUTUBE_STREAM_KEY=xxxx-xxxx-xxxx-xxxx-xxxx"
  exit 1
fi

DEST_RTMP="${YOUTUBE_RTMP_SERVER%/}/${YOUTUBE_STREAM_KEY}"

echo "=================================================================="
echo "  CSN.Live 24/7 RTSP -> YouTube Live Shell Relay Bridge           "
echo "=================================================================="
echo "Source Camera   : $RTSP_URL"
echo "Target Ingest   : $YOUTUBE_RTMP_SERVER/******"
echo "Transport Mode  : RTSP over $RTSP_TRANSPORT"
echo "Video Strategy  : Direct Stream Copy (-c:v copy, 0% CPU)"
echo "Audio Strategy  : Synthetic Continuous AAC (44.1kHz Stereo)"
echo "=================================================================="

while true; do
  START_TIME=$(date +%s)
  echo "[Relay] Launching FFmpeg broadcast pipeline..."

  ffmpeg \
    -hide_banner \
    -loglevel warning \
    -rtsp_transport "$RTSP_TRANSPORT" \
    -timeout 5000000 \
    -reorder_queue_size 500 \
    -i "$RTSP_URL" \
    -f lavfi \
    -i anullsrc=channel_layout=stereo:sample_rate=44100 \
    -map 0:v:0 \
    -map 1:a:0 \
    -c:v copy \
    -c:a aac \
    -b:a 128k \
    -ar 44100 \
    -flags +global_header \
    -f flv \
    -flvflags no_duration_filesize \
    "$DEST_RTMP" || true

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  if [ "$DURATION" -ge 60 ]; then
    BACKOFF=$INITIAL_BACKOFF
  else
    BACKOFF=$((BACKOFF * 2))
    if [ "$BACKOFF" -gt "$MAX_BACKOFF" ]; then
      BACKOFF=$MAX_BACKOFF
    fi
  fi

  echo "[Relay] FFmpeg pipeline stopped (ran for ${DURATION}s). Reconnecting in ${BACKOFF}s..."
  sleep "$BACKOFF"
done

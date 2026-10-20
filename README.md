# CueControl

CueControl is a local venue, table-management, live-scoring, and streaming-control application.

## Install on Windows

1. Download this repository as a ZIP from GitHub.
2. Extract the ZIP.
3. Open the extracted project folder.
4. Double-click `Setup.exe` at the top level.
5. Complete the installer. A CueControl desktop shortcut is created automatically.
6. Start CueControl from the desktop shortcut.

The installed app starts its local server automatically. End users do not need Node.js, npm, or a manual localhost command.

## Build the installer

Windows build requirements: Node.js 20 or newer.

```bash
npm install
npm run build:desktop
```

The generated installer is written to `desktop-release/CueControl-Setup-1.0.0.exe`.

## Local development

```bash
npm install
npm run dev
```

## Optional Docker streaming relay

[Dockerfile.relay](./Dockerfile.relay) runs the optional RTSP-to-YouTube relay. It is separate from the desktop installer.

1. Copy `.env.stream.example` to `.env.stream`.
2. Set `RTSP_URL`, `YOUTUBE_STREAM_KEY`, and any required relay settings.
3. Start the relay:

```bash
docker compose -f docker-compose.relay.yml up -d --build
```

View logs with `docker compose -f docker-compose.relay.yml logs -f` and stop it with `docker compose -f docker-compose.relay.yml down`.

Do not commit `.env.stream` or real stream keys.

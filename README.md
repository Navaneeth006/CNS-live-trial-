<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5223f389-17d6-45b5-850c-b2cf0b0a4b5a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Windows desktop app

The desktop package starts the existing Express/WebSocket server locally and opens it inside a CueControl window. The installer creates a desktop shortcut automatically.

Build the installer on Windows:

```bash
npm install
npm run build:desktop
```

The installer is written to `desktop-release/CueControl-Setup-1.0.0.exe`. After installation, users launch CueControl from the desktop shortcut; no Node.js installation or separate localhost command is required.

The application state is stored in the Windows user application-data directory so installed copies can save venue data without requiring administrator permissions.

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3000;
let serverProcess;
let mainWindow;

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('The local CueControl server did not start in time.'));
        } else {
          setTimeout(check, 250);
        }
      });
      request.setTimeout(1000, () => request.destroy());
    };

    check();
  });
}

function startLocalServer() {
  const appRoot = app.getAppPath();
  const serverPath = path.join(appRoot, 'release', 'server.cjs');
  const dataPath = path.join(app.getPath('userData'), 'data');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(PORT),
      CUECONTROL_APP_ROOT: appRoot,
      CUECONTROL_DATA_DIR: dataPath,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  serverProcess.on('exit', (code) => {
    if (code && !app.isQuitting) {
      console.error(`CueControl server exited with code ${code}`);
    }
  });
}

async function createMainWindow() {
  startLocalServer();
  await waitForServer(`http://127.0.0.1:${PORT}`);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1020',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createMainWindow).catch((error) => {
    console.error(error);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
  });
}

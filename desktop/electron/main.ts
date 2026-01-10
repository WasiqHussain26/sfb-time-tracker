import { app, BrowserWindow, powerMonitor, ipcMain, desktopCapturer, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';

// Define paths for build vs dev
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null;
let miniWindow: BrowserWindow | null;

// Use your new logo if available, otherwise default
const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.ico');
const indexHtml = path.join(process.env.DIST, 'index.html');
const devUrl = process.env.VITE_DEV_SERVER_URL;

function createWindows() {
  // 1. MAIN DASHBOARD WINDOW
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    title: "SFB Time Tracker",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // <--- CRITICAL FIX: Prevent timer freeze
    },
    autoHideMenuBar: true,
    resizable: true,
  });

  // --- EXTERNAL LINK HANDLER ---
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://sfbtimetracker.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 2. MINI WIDGET WINDOW
  miniWindow = new BrowserWindow({
    width: 500,
    height: 60,
    title: "SFB Widget",
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // --- LOAD CONTENT ---
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    miniWindow.loadURL(`${devUrl}#widget`);
  } else {
    mainWindow.loadFile(indexHtml);
    miniWindow.loadFile(indexHtml, { hash: 'widget' });
  }

  // --- WINDOW BEHAVIOR ---
  mainWindow.on('minimize', () => miniWindow?.show());
  mainWindow.on('restore', () => miniWindow?.hide());
  mainWindow.on('focus', () => miniWindow?.hide());

  // CRITICAL: Ensure app quits when main window is closed so updates can install
  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  // --- IDLE CHECKING ---
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const idleSeconds = powerMonitor.getSystemIdleTime();
      mainWindow.webContents.send('system-idle-status', idleSeconds);
    }
  }, 1000);

  // --- AUTO UPDATER LOGIC ---
  // --- AUTO UPDATER LOGIC ---
  if (app.isPackaged) {
    // 1. Silent Check (No default notifications)
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false; // Disable "On Quit" because it's looping
    autoUpdater.checkForUpdates();
  }

  autoUpdater.on('update-available', () => {
    // Optional: could notify frontend "Downloading..."
    console.log("Update available, downloading...");
  });

  // 2. Notify Frontend when ready
  autoUpdater.on('update-downloaded', () => {
    console.log("Update downloaded!");
    mainWindow?.webContents.send('update_downloaded');
  });

  // 3. FORCE INSTALL when user clicks button
  ipcMain.on('install-update', () => {
    // true = silent install (no specific reason to be noisy)
    // true = force run after
    autoUpdater.quitAndInstall(false, true);
  });
}

// --- SESSION MANAGEMENT ---
const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');

ipcMain.on('save-session', (_event, data) => {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data));
    console.log("Details saved to:", SESSION_FILE);
  } catch (e) {
    console.error("Failed to save session:", e);
  }
});

ipcMain.handle('get-session', () => {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error("Failed to load session:", e);
  }
  return null;
});

ipcMain.on('clear-session', () => {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
});

// --- IPC EVENTS ---
ipcMain.on('minimize-app', () => {
  mainWindow?.minimize();
});

ipcMain.on('close-app', () => {
  mainWindow?.close();
});

ipcMain.on('update-widget', (_event, data) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('sync-widget-data', data);
  }
});

ipcMain.on('expand-main-window', () => {
  miniWindow?.hide();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('hide-widget', () => {
  miniWindow?.hide();
});

ipcMain.on('widget-toggle-timer', () => {
  if (mainWindow) {
    mainWindow.webContents.send('trigger-timer-toggle');
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.on('widget-trigger-break', () => {
  if (mainWindow) {
    // Silent Break: Do not restore or focus
    mainWindow.webContents.send('trigger-break-mode');
  }
});

// --- SCREENSHOT HANDLER ---
ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    return sources.map(source => source.thumbnail.toDataURL());
  } catch (err) {
    console.error("Main Process Screenshot Error:", err);
    throw err;
  }
});

// --- LIFECYCLE ---
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});

let isQuitting = false;
app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(createWindows);
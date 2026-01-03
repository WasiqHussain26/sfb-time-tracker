import { app, BrowserWindow, powerMonitor, ipcMain, desktopCapturer, shell } from 'electron'
import path from 'path'

// Define paths for build vs dev
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let mainWindow: BrowserWindow | null
let miniWindow: BrowserWindow | null

// Use your new logo if available, otherwise default
const iconPath = path.join(process.env.VITE_PUBLIC || '', 'logo.png'); 
const indexHtml = path.join(process.env.DIST, 'index.html');
const devUrl = process.env.VITE_DEV_SERVER_URL;

function createWindows() {
  // 1. MAIN DASHBOARD WINDOW
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    title: "SFB Time Tracker", // UPDATED: Explicitly setting the window title
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Allowed here for simplicity in this specific architecture
    },
    autoHideMenuBar: true,
    resizable: true,
  })

  // --- NEW: EXTERNAL LINK HANDLER ---
  // This ensures the "Forgot Password" link opens in Chrome/Edge, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://sfbtimetracker.com')) {
      shell.openExternal(url); // Opens in system browser
      return { action: 'deny' }; // Prevents Electron from opening a new window
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
  })

  // --- LOAD CONTENT (Dev vs Prod) ---
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    miniWindow.loadURL(`${devUrl}#widget`)
  } else {
    mainWindow.loadFile(indexHtml)
    miniWindow.loadFile(indexHtml, { hash: 'widget' })
  }

  // --- WINDOW BEHAVIOR LOGIC ---
  mainWindow.on('minimize', () => {
    miniWindow?.show();
  });

  mainWindow.on('restore', () => {
    miniWindow?.hide();
  });

  mainWindow.on('focus', () => {
    miniWindow?.hide();
  });

  // --- IDLE CHECKING ---
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const idleSeconds = powerMonitor.getSystemIdleTime();
      mainWindow.webContents.send('system-idle-status', idleSeconds);
    }
  }, 1000);
}

// --- IPC EVENTS ---
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

// --- SCREENSHOT HANDLER ---
ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: 1280, height: 720 } 
    });
    return sources[0].thumbnail.toDataURL();
  } catch (err) {
    console.error("Main Process Screenshot Error:", err);
    throw err;
  }
});

// --- LIFECYCLE ---
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows()
})

let isQuitting = false;
app.on('before-quit', () => { 
    isQuitting = true; 
});

app.whenReady().then(createWindows)
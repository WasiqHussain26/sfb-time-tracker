import { app, BrowserWindow, powerMonitor, ipcMain, desktopCapturer } from 'electron'
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
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Allowed here for simplicity in this specific architecture
    },
    autoHideMenuBar: true,
    resizable: true,
  })

  // 2. MINI WIDGET WINDOW
  miniWindow = new BrowserWindow({
    width: 500, 
    height: 60,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true, // Hide from taskbar, it acts as a floating widget
    resizable: false,
    show: false, // Hidden by default until main is minimized
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // --- LOAD CONTENT (Dev vs Prod) ---
  if (devUrl) {
    // Development Mode (Vite Server)
    mainWindow.loadURL(devUrl)
    miniWindow.loadURL(`${devUrl}#widget`)
    // Optional: Open DevTools for debugging
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // Production Mode (Built index.html from 'dist' folder)
    mainWindow.loadFile(indexHtml)
    miniWindow.loadFile(indexHtml, { hash: 'widget' })
  }

  // --- WINDOW BEHAVIOR LOGIC ---

  // 1. When Main is Minimized -> Show Widget
  mainWindow.on('minimize', () => {
    miniWindow?.show();
  });

  // 2. When Main is Restored -> Hide Widget
  mainWindow.on('restore', () => {
    miniWindow?.hide();
  });

  // 3. When Main gains focus -> Hide Widget (Optional UX preference)
  mainWindow.on('focus', () => {
    miniWindow?.hide();
  });

  // --- IDLE CHECKING ---
  // Sends 'system-idle-status' event to renderer every second
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const idleSeconds = powerMonitor.getSystemIdleTime();
      mainWindow.webContents.send('system-idle-status', idleSeconds);
    }
  }, 1000);
}

// --- IPC EVENTS (Communication) ---

// 1. Dashboard sends data to Widget (Time, Task Name)
ipcMain.on('update-widget', (_event, data) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('sync-widget-data', data);
  }
});

// 2. Widget asks to Expand (Clicking Task Name or "Stop")
ipcMain.on('expand-main-window', () => {
  miniWindow?.hide();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// 3. Widget asks to Hide (The "Hide" button)
ipcMain.on('hide-widget', () => {
  miniWindow?.hide();
});

// 4. Widget clicks "Start/Stop"
ipcMain.on('widget-toggle-timer', () => {
  if (mainWindow) {
    // Forward the toggle command to the Main Window React App
    mainWindow.webContents.send('trigger-timer-toggle');
    
    // Restore window so user can see what happened
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

    // Return the first screen as a Base64 string
    // This string is sent back to React when it calls ipcRenderer.invoke('capture-screen')
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
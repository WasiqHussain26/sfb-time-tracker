import { useState, useEffect } from 'react';
import Login from './Login';
import TrackerDashboard from './TrackerDashboard';
import MiniWidget from './MiniWidget';

function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isWidget, setIsWidget] = useState(false);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    // Check if we are running as widget
    if (window.location.hash === '#widget') {
      setIsWidget(true);
    }

    // Load Session from Main Process (Disk)
    const loadSession = async () => {
      if (window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const session = await ipcRenderer.invoke('get-session');
          console.log("📥 Loaded Session from Main:", session);

          if (session && session.token && session.user) {
            setToken(session.token);
            setUser(session.user);
          }
        } catch (err) {
          console.error("Failed to load session from main:", err);
        }
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  // --- 2. LOGIN HANDLER ---
  const handleLoginSuccess = (newUser: any, newToken: string) => {
    setUser(newUser);
    setToken(newToken);

    // Save to Main Process (Persist to Disk)
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('save-session', { user: newUser, token: newToken });
      console.log("📤 Sent Login to Main Process");
    }
  };

  // --- 3. LOGOUT HANDLER ---
  const handleLogout = () => {
    console.log("⚠️ Logging out...");
    setUser(null);
    setToken(null);

    // Clear from Main Process
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('clear-session');
    }
  };

  // --- RENDER ---
  if (isWidget) return <MiniWidget />;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-500 text-xs">
        Loading session...
      </div>
    );
  }

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <TrackerDashboard
      user={user}
      token={token}
      onLogout={handleLogout}
    />
  );
}

export default App;
import { useState, useEffect } from 'react';
import Login from './Login';
import TrackerDashboard from './TrackerDashboard';
import MiniWidget from './MiniWidget'; // <--- Import Widget

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isWidget, setIsWidget] = useState(false); // <--- New State

  useEffect(() => {
    // Check if this window is meant to be the Mini Widget
    if (window.location.hash === '#widget') {
      setIsWidget(true);
    }

    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  // 1. SHOW MINI WIDGET
  if (isWidget) {
    return <MiniWidget />;
  }

  // 2. SHOW LOGIN
  if (!user || !token) {
    return <Login onLoginSuccess={(u, t) => { setUser(u); setToken(t); }} />;
  }

  // 3. SHOW MAIN DASHBOARD
  return (
    <TrackerDashboard 
      user={user} 
      token={token} 
      onLogout={handleLogout} 
    />
  );
}

export default App;
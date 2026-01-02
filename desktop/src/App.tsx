import { useState, useEffect } from 'react';
import Login from './Login';
import TrackerDashboard from './TrackerDashboard';
import MiniWidget from './MiniWidget';

function App() {
  // Initialize state directly from localStorage so user stays logged in
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );
  
  const [isWidget, setIsWidget] = useState(false);

  useEffect(() => {
    // Check if this window is meant to be the Mini Widget
    if (window.location.hash === '#widget') {
      setIsWidget(true);
    }
  }, []);

  const handleLoginSuccess = (newUser: any, newToken: string) => {
    // State is updated here, LocalStorage is updated in Login.tsx
    setUser(newUser);
    setToken(newToken);
  };

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

  // 2. SHOW LOGIN (Only if no token exists)
  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. SHOW MAIN DASHBOARD (If logged in)
  return (
    <TrackerDashboard 
      user={user} 
      token={token} 
      onLogout={handleLogout} 
    />
  );
}

export default App;
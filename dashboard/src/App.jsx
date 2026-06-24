import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Global Clean Modern CSS
const globalCSS = `
  * {
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: #22C55E #0D0D0D;
  }

  /* Custom Webkit Scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #0D0D0D;
  }
  ::-webkit-scrollbar-thumb {
    background: #22C55E;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #15803d;
  }

  body {
    background-color: #0D0D0D;
    color: #FFFFFF;
    margin: 0;
    font-family: 'Outfit', sans-serif;
  }
`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return (
    <>
      <style>{globalCSS}</style>
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;

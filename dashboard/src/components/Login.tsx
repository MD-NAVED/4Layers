import React, { useState } from 'react';
import logoImg from '../assets/logo.jpg';

interface LoginProps {
  backendUrl: string;
  onLoginSuccess: (token: string) => void;
}

export default function Login({ backendUrl, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // FastAPI OAuth2PasswordRequestForm expects application/x-www-form-urlencoded body format
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password.trim());

      const response = await fetch(`${backendUrl}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid username or password.');
      }

      const data = await response.json();
      if (data.access_token) {
        onLoginSuccess(data.access_token);
      } else {
        throw new Error('Access token not found in credentials validation payload.');
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setErrorMsg(err.message || 'Connection failed. Please check backend status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand Logo Header */}
        <div style={styles.header}>
          <div style={styles.logoWrapper}>
            <img src={logoImg} alt="4Layers Logo" style={styles.logo} />
          </div>
          <h1 style={styles.title}>4Layers</h1>
          <p style={styles.subtitle}>SmartNest IoT OS v3.5</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {errorMsg ? <div style={styles.errorAlert}>{errorMsg}</div> : null}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. administrator"
              disabled={loading}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Authenticating...' : 'Enter Station'}
          </button>
        </form>

        {/* Footer info */}
        <div style={styles.footer}>
          <span>Secured Session gateway protocol</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0D0D0D',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  logoWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #22C55E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
    marginBottom: '16px',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#FFFFFF',
    margin: '0 0 4px 0',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    backgroundColor: '#0D0D0D',
    border: '1.5px solid #262626',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    backgroundColor: '#22C55E',
    color: '#0D0D0D',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '10px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #EF4444',
    borderRadius: '8px',
    padding: '12px',
    color: '#FCA5A5',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
    fontSize: '10px',
    color: '#4B5563',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

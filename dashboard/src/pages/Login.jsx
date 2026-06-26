import React, { useState } from 'react';
import apiClient from '../api/client';
import { ShieldAlert, KeyRound, User } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter valid credentials to access console.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('username', username.trim());
      urlEncodedData.append('password', password);

      const response = await apiClient.post('/api/users/login', urlEncodedData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      if (access_token) {
        onLogin(access_token);
      } else {
        throw new Error('Access denied');
      }
    } catch (error) {
      console.error('[Login] Auth error:', error);
      const detail = error.response?.data?.detail || 'Authentication failed. Check credentials.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 4Layers Clean Modern Green Logo */}
      <div style={styles.logoContainer}>
        <img src={logoImg} alt="4Layers Logo" style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} />
      </div>

      <h1 style={styles.title}>4Layers</h1>
      <p style={styles.subtitle}>Control Console</p>

      <div style={styles.formCard}>
        <h2 style={styles.formTitle}>Initialize Session</h2>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <KeyRound size={18} color="#9CA3AF" style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    padding: '24px',
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #333333',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0',
    letterSpacing: '-0.5px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  subtitle: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: '6px 0 32px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  formCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '16px',
    padding: '32px',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 24px 0',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1.5px solid #EF4444',
    borderRadius: '8px',
    color: '#FCA5A5',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0D0D0D',
    border: '1.5px solid #262626',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '12px 12px 12px 42px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
    backgroundColor: '#22C55E',
    border: 'none',
    borderRadius: '8px',
    color: '#000000',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease',
  },
};

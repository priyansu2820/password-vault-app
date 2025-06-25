import React, { useState } from 'react';
// import Encryption from '../utils/encryption'; // Not directly used here, but keep if used elsewhere
import Storage from '../utils/storage';
import './Login.css';

function Login({ onLoginSuccess, onForgotPassword }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Load the stored configuration
      const config = await Storage.loadConfig();

      // IMPORTANT: This check ensures the app is configured with a masterPasswordHash.
      // If masterPasswordHash is missing, it means setup wasn't completed correctly.
      if (!config || !config.masterPasswordHash) {
        setError('Application not configured. Please restart or contact support.');
        setLoading(false);
        return;
      }

      // 2. Verify the entered password against the stored hash using Electron API.
      // The verifyPassword function in main.js handles comparing the password against the bcrypt hash.
      // It expects the plain-text password and the stored bcrypt hash.
      const isMatch = await window.electronAPI.verifyPassword(masterPassword, config.masterPasswordHash);

      if (isMatch) {
        alert('Login successful!');
        console.log('Login.jsx: Passing masterPassword to onLoginSuccess.');
        onLoginSuccess(masterPassword); // Pass the actual masterPassword to App.jsx
      } else {
        setError('Incorrect master password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login failed: ${err.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <p>Enter your master password to unlock your vault.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="masterPassword">Master Password:</label>
          <input
            type="password"
            id="masterPassword"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging In...' : 'Unlock Vault'}
        </button>
        <button type="button" className="forgot-password-btn" onClick={onForgotPassword} disabled={loading}>
          Forgot Password?
        </button>
      </form>
    </div>
  );
}

export default Login;
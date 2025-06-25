import React, { useState } from 'react';
import Storage from '../utils/storage'; // For saving configuration
import './Setup.css'; // You'll need to create or adapt this CSS file

function Setup({ onSetupComplete }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (masterPassword.length < 8) {
      setError('Master password must be at least 8 characters long.');
      setLoading(false);
      return;
    }
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setError('Please provide a security question and answer.');
      setLoading(false);
      return;
    }

    try {
      // 1. Hash the master password using Electron's main process
      const masterPasswordHash = await window.electronAPI.hashPassword(masterPassword);

      // 2. Hash the security answer (it's good practice not to store it in plain text)
      // We can use the same hashPassword function from Electron API for simplicity,
      // but ideally, you'd have a separate utility for less critical hashes if needed.
      const securityAnswerHash = await window.electronAPI.hashPassword(securityAnswer);

      // 3. Create the configuration object
      const configToSave = {
        masterPasswordHash: masterPasswordHash,
        security: {
          question: securityQuestion,
          answerHash: securityAnswerHash, // Save the hashed answer
        },
      };

      // 4. Save the configuration using Storage utility
      const saveResult = await Storage.saveConfig(configToSave);

      if (saveResult) { // Storage.saveConfig now returns true on success
        alert('Master password and security question set up successfully!');
        onSetupComplete(); // Navigate to login screen
      } else {
        setError('Failed to save configuration. Please try again.');
      }

    } catch (err) {
      console.error('Setup error:', err);
      setError(`Setup failed: ${err.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container"> {/* You'll need to define .setup-container in Setup.css */}
      <h2>Set Master Password</h2>
      <p>This password will unlock your vault. Keep it safe!</p>
      <form onSubmit={handleSetupSubmit}>
        <div className="form-group">
          <label htmlFor="masterPassword">New Master Password:</label>
          <input
            type="password"
            id="masterPassword"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Master Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <h3>Security Question (for recovery)</h3>
        <div className="form-group">
          <label htmlFor="securityQuestion">Question:</label>
          <input
            type="text"
            id="securityQuestion"
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
            placeholder="e.g., What was your first pet's name?"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="securityAnswer">Answer:</label>
          <input
            type="text"
            id="securityAnswer"
            value={securityAnswer}
            onChange={(e) => setSecurityAnswer(e.target.value)}
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Setting Up...' : 'Set Master Password'}
        </button>
      </form>
    </div>
  );
}

export default Setup;
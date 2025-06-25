// app/src/components/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import Storage from '../utils/storage'; // Utility to interact with app config
import './ForgotPassword.css'; // Styling for this component

/**
 * ForgotPassword component allows users to reset their master password
 * by answering a security question. It also clears old vault data
 * as it becomes inaccessible with the new password.
 */
function ForgotPassword({ onPasswordResetSuccess, onCancel }) {
  // `stage` controls which part of the reset process is currently visible.
  // 'verifySecurityQuestion': User is prompted for the security question answer.
  // 'setNewPassword': User sets and confirms the new master password.
  const [stage, setStage] = useState('verifySecurityQuestion');
  const [securityAnswer, setSecurityAnswer] = useState(''); // State for user's security answer input
  const [newMasterPassword, setNewMasterPassword] = useState(''); // State for new master password input
  const [confirmNewPassword, setConfirmNewPassword] = useState(''); // State for confirming new master password
  const [securityQuestion, setSecurityQuestion] = useState(''); // State to display the loaded security question
  const [error, setError] = useState(''); // State for displaying error messages
  const [loading, setLoading] = useState(false); // State to indicate loading/processing status

  // useEffect to load the security question when the component mounts.
  useEffect(() => {
    const loadQuestion = async () => {
      setLoading(true);
      setError('');
      try {
        const config = await Storage.loadConfig(); // Load the application configuration
        // Check if config and a security question exist
        if (config && config.security && config.security.question) {
          setSecurityQuestion(config.security.question); // Set the loaded question to state
        } else {
          setError('Security question not found in configuration. Cannot reset password.');
        }
      } catch (err) {
        console.error('Failed to load security question for forgot password:', err);
        setError('Failed to load security question. Please restart or contact support.');
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Handles the submission of the security question answer.
   * Verifies the answer against the stored hash.
   */
  const handleVerifyAnswer = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError('');
    setLoading(true);

    if (!securityAnswer.trim()) {
      setError('Please provide an answer to the security question.');
      setLoading(false);
      return;
    }

    try {
      const config = await Storage.loadConfig();
      // Ensure security answer hash exists in config for verification
      if (!config || !config.security || !config.security.answerHash) {
        setError('Security answer hash not found. Cannot verify. Please ensure setup was complete.');
        setLoading(false);
        return;
      }

      // Hash the entered answer and compare it with the stored hash using Electron API
      const isMatch = await window.electronAPI.verifyPassword(securityAnswer, config.security.answerHash);

      if (isMatch) {
        setStage('setNewPassword'); // Move to the "set new password" stage
        setSecurityAnswer(''); // Clear the answer input field
        setError(''); // Clear any previous errors
      } else {
        setError('Incorrect security answer.'); // Display error for incorrect answer
      }
    } catch (err) {
      console.error('Security answer verification error:', err);
      setError(`Verification failed: ${err.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the submission of the new master password.
   * Hashes the new password, updates configuration, and clears old vault data.
   */
  const handleSetNewPassword = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError('');
    setLoading(true);

    // Validate new password inputs
    if (newMasterPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }
    if (newMasterPassword.length < 8) { // Basic password length requirement
      setError('New master password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      // Hash the new master password securely using Electron API
      const newMasterPasswordHash = await window.electronAPI.hashPassword(newMasterPassword);

      // Load existing config to preserve security question and its answer hash
      const config = await Storage.loadConfig();
      if (!config) {
        setError('Application configuration missing. Please restart.');
        setLoading(false);
        return;
      }

      // Update ONLY the master password hash in the configuration
      config.masterPasswordHash = newMasterPasswordHash;

      // Save the updated configuration back to disk
      const saveResult = await Storage.saveConfig(config);

      if (saveResult) {
        // IMPORTANT: Clear the old vault data. Since the master password has changed,
        // any existing vault data encrypted with the old password becomes inaccessible.
        // Clearing it prevents future decryption errors when loading the vault.
        const clearResult = await window.electronAPI.clearVaultData(); // Call the new IPC API

        if (clearResult) {
          // Inform the user that password is reset and old data is cleared
          alert('Master password has been successfully reset! Your old vault data has been cleared. You can now log in with your new password and start fresh.');
        } else {
          // Inform if vault data couldn't be cleared (less critical, but good to know)
          alert('Master password has been successfully reset! Could not clear old vault data. You can now log in with your new password, but previously saved vault data will not be accessible and may cause errors if not manually removed.');
        }

        onPasswordResetSuccess(); // Navigate back to the login screen
      } else {
        setError('Failed to save new password. Please try again.');
      }
    } catch (err) {
      console.error('Set new password error:', err);
      setError(`Password reset failed: ${err.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Forgot Master Password</h2>
      {loading && <p>Loading...</p>} {/* Show loading message */}
      {error && <p className="error-message">{error}</p>} {/* Show error message */}

      {/* Stage 1: Verify Security Question */}
      {stage === 'verifySecurityQuestion' && securityQuestion && (
        <form onSubmit={handleVerifyAnswer}>
          <h3>Security Question:</h3>
          <p className="security-question-text">{securityQuestion}</p>
          <div className="form-group">
            <label htmlFor="securityAnswer">Your Answer:</label>
            <input
              type="text"
              id="securityAnswer"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
              disabled={loading} // Disable input while loading
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Answer'}
          </button>
          <button type="button" className="cancel-button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </form>
      )}

      {/* Stage 2: Set New Master Password */}
      {stage === 'setNewPassword' && (
        <form onSubmit={handleSetNewPassword}>
          <h3>Set New Master Password</h3>
          <p className="warning-text">
            WARNING: Resetting your master password will make any previously saved vault data
            **inaccessible and will clear it**. Only proceed if you are willing to start a new vault.
          </p>
          <div className="form-group">
            <label htmlFor="newMasterPassword">New Master Password:</label>
            <input
              type="password"
              id="newMasterPassword"
              value={newMasterPassword}
              onChange={(e) => setNewMasterPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmNewPassword">Confirm New Master Password:</label>
            <input
              type="password"
              id="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Setting Password...' : 'Reset Master Password'}
          </button>
          <button type="button" className="cancel-button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </form>
      )}

      {/* Message if no security question found and not in loading/error state */}
      {!securityQuestion && !loading && !error && (
        <p>No security question configured. Please set one during initial setup if you need this recovery feature.</p>
      )}
    </div>
  );
}

export default ForgotPassword;

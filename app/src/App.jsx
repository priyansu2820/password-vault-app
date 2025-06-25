// app/src/App.jsx
import React, { useState, useEffect } from 'react';
import Setup from './components/Setup';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import About from './components/About';
import Storage from './utils/storage'; // Utility for interacting with Electron's file system

import './App.css'; // Your main application-wide styling

/**
 * The main application component that manages the overall application state
 * and renders different screens (Setup, Login, Dashboard, ForgotPassword, About).
 */
function App() {
  // `appState` controls which major component/screen is currently displayed.
  // Possible states: 'loading', 'setup', 'login', 'dashboard', 'forgotPassword', 'about'
  const [appState, setAppState] = useState('loading');
  // `masterPassword` stores the decrypted master password in memory after successful login,
  // passed down to Dashboard for encryption/decryption operations.
  const [masterPassword, setMasterPassword] = useState('');
  // `theme` manages the current theme ('light' or 'dark').
  // Initial state can be derived from user preferences (e.g., system preference or stored config).
  const [theme, setTheme] = useState('light'); // Default to 'light' theme

  // Effect to apply the theme class to the document's root element (<html>)
  useEffect(() => {
    // Add or remove the 'dark-theme' class based on the 'theme' state.
    // This class is used by App.css to apply dark mode CSS variables.
    document.documentElement.className = theme === 'dark' ? 'dark-theme' : '';
    // Optionally, save the theme preference to configuration for persistence across sessions.
    // This would involve loading the current config, updating it, and saving it back.
    const saveThemePreference = async () => {
      try {
        const currentConfig = await Storage.loadConfig();
        if (currentConfig) {
          await Storage.saveConfig({ ...currentConfig, themePreference: theme });
        }
      } catch (error) {
        console.error('App.jsx: Failed to save theme preference:', error);
      }
    };
    saveThemePreference();
  }, [theme]); // This effect runs whenever the 'theme' state changes.

  // `useEffect` hook to run checks once when the component mounts.
  // It determines the initial `appState` based on whether a master password is set
  // and also attempts to load the saved theme preference.
  useEffect(() => {
    const checkConfigAndSetState = async () => {
      try {
        const config = await Storage.loadConfig(); // Attempt to load existing application configuration.

        // Load theme preference if it exists in the config
        if (config && config.themePreference) {
          setTheme(config.themePreference);
        }

        // Check if the configuration exists AND it contains the master password hash.
        // If both are true, the app is considered configured and ready for login.
        if (config && config.masterPasswordHash) {
          setAppState('login'); // Set state to 'login' if configured.
          console.log('App.jsx: App is configured. Ready for login.');
        } else {
          // If no config or masterPasswordHash is missing, the app needs initial setup.
          setAppState('setup'); // Set state to 'setup' if not configured.
          console.log('App.jsx: App is not configured. Showing setup screen.');
        }
      } catch (error) {
        // If an error occurs during configuration loading (e.g., malformed JSON),
        // assume the app is not configured and direct to setup.
        console.error('App.jsx: Error checking app configuration:', error);
        setAppState('setup');
      }
    };

    // A small timeout to ensure Electron's IPC (Inter-Process Communication)
    // a moment to fully initialize. This can prevent issues where `window.electronAPI`
    // might not be immediately available on very fast application startups.
    const timer = setTimeout(() => {
        checkConfigAndSetState();
    }, 500);

    // Cleanup function: This will clear the timeout if the component unmounts
    // before the timeout fires, preventing memory leaks.
    return () => clearTimeout(timer);
  }, []); // The empty dependency array `[]` ensures this effect runs only once after the initial render.

  // --- Handlers for State Transitions ---

  /**
   * Handler for when the initial master password setup is successfully completed.
   * Transitions the application state to the 'login' screen.
   */
  const handleSetupComplete = () => {
    setAppState('login'); // Transition to the login screen after setup.
    console.log('App.jsx: Setup complete. Transitioning to Login.');
  };

  /**
   * Handler for a successful master password login.
   * Stores the master password in state and transitions to the 'dashboard'.
   * @param {string} password - The master password entered by the user.
   */
  const handleLoginSuccess = (password) => {
    setMasterPassword(password); // Store the master password (in-memory) for use in Dashboard.
    setAppState('dashboard'); // Transition to the main application dashboard.
    console.log('App.jsx: Login successful. Transitioning to Dashboard.');
  };

  /**
   * Handler for when the user logs out from the dashboard.
   * Clears the master password from state and transitions back to 'login'.
   */
  const handleLogout = () => {
    setMasterPassword(''); // Clear the master password for security.
    setAppState('login'); // Return to the login screen.
    console.log('App.jsx: Logout complete. Transitioning to Login.');
  };

  /**
   * Handler for when the user clicks "Forgot Password?" on the login screen.
   * Transitions to the 'forgotPassword' screen.
   */
  const handleForgotPassword = () => {
    setAppState('forgotPassword');
    console.log('App.jsx: Forgot Password clicked. Transitioning to ForgotPassword screen.');
  };

  /**
   * Called after the master password has been successfully reset via security question.
   * Transitions back to the 'login' screen, as the user now needs to log in with their new password.
   */
  const handlePasswordResetSuccess = () => {
    setAppState('login');
    console.log('App.jsx: Password reset successful. Transitioning to Login.');
  };

  /**
   * Called if the user cancels the password reset process.
   * Transitions back to the 'login' screen.
   */
  const handleCancelPasswordReset = () => {
    setAppState('login');
    console.log('App.jsx: Password reset cancelled. Transitioning to Login.');
  };

  /**
   * Handler to show the About application screen.
   * Transitions to the 'about' screen.
   */
  const handleShowAbout = () => {
    setAppState('about');
    console.log('App.jsx: Showing About screen.');
  };

  /**
   * Handler to go back from the About screen.
   * For simplicity, it transitions back to the 'login' screen. You could make this more dynamic
   * if you had multiple points of entry to the About screen.
   */
  const handleBackFromAbout = () => {
    setAppState('login');
    console.log('App.jsx: Back from About. Transitioning to Login.');
  };

  /**
   * Toggles between 'light' and 'dark' themes.
   * This function will be passed to components like Dashboard to provide a UI control.
   */
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };


  // --- Conditional Rendering based on the current `appState` ---

  // Displays a loading message while the initial configuration check is in progress.
  if (appState === 'loading') {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '24px' }}>
        Loading Application...
        <p>Initializing Electron communication...</p>
      </div>
    );
  }
  // Renders the Setup component if the app is determined to be not configured.
  else if (appState === 'setup') {
    return <Setup onSetupComplete={handleSetupComplete} />;
  }
  // Renders the Login component if the app is configured but the user is not yet logged in.
  else if (appState === 'login') {
    return (
      <>
        {/* The Login component handles user authentication */}
        <Login
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
        {/* Temporary "About" button for quick testing.
            This button is placed directly in App.jsx and overlays the Login screen.
            In a finished app, you'd integrate the "About" button into a menu or toolbar
            within your Dashboard or Login components themselves. */}
        <button
          onClick={handleShowAbout}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#e0e0e0',
            color: '#333',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            zIndex: 100
          }}
        >
          About
        </button>
      </>
    );
  }
  // Renders the ForgotPassword component if the user requests a master password reset.
  else if (appState === 'forgotPassword') {
    return <ForgotPassword onPasswordResetSuccess={handlePasswordResetSuccess} onCancel={handleCancelPasswordReset} />;
  }
  // Renders the About component when the appState is 'about'.
  else if (appState === 'about') {
    return <About onBack={handleBackFromAbout} />;
  }
  // Renders the Dashboard component once the user is successfully logged in.
  else if (appState === 'dashboard') {
    // Passes masterPassword, logout handler, current theme, and theme toggler to Dashboard.
    return (
      <Dashboard
        masterPassword={masterPassword}
        onLogout={handleLogout}
        currentTheme={theme} // Pass current theme to Dashboard
        toggleTheme={toggleTheme} // Pass theme toggle function to Dashboard
      />
    );
  }
  // Fallback return: Should theoretically not be reached if all states are handled.
  return null;
}

export default App;

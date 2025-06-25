// app/src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Encryption from '../utils/encryption'; // Your encryption utility
import Storage from '../utils/storage';       // Your storage utility for saving/loading vault
import PasswordForm from './PasswordForm';   // Component for adding/editing passwords
import './Dashboard.css'; // Dashboard specific styling

// Dashboard component receives masterPassword, onLogout, currentTheme, and toggleTheme as props.
function Dashboard({ masterPassword, onLogout, currentTheme, toggleTheme }) {
  console.log('Dashboard.jsx: Received masterPassword prop:', masterPassword); // Debug Log

  const [passwords, setPasswords] = useState([]); // State to hold all password entries
  const [isLoading, setIsLoading] = useState(true); // State to track loading status of the vault
  const [error, setError] = useState(''); // State to hold any error messages
  const [showPasswordForm, setShowPasswordForm] = useState(false); // State to control visibility of the add/edit form
  const [currentEditEntry, setCurrentEditEntry] = useState(null); // State to hold the password entry being edited
  const [searchTerm, setSearchTerm] = useState(''); // State for the search input

  // Function to toggle password visibility for a specific entry in the UI
  const togglePasswordVisibility = (id) => {
    setPasswords(prevPasswords =>
      prevPasswords.map(entry =>
        entry.id === id ? { ...entry, showPassword: !entry.showPassword } : entry
      )
    );
  };

  // useEffect hook to load and decrypt the vault when the component mounts or masterPassword changes.
  useEffect(() => {
    const loadVault = async () => {
      setIsLoading(true); // Set loading state to true
      setError(''); // Clear any previous errors
      try {
        const encryptedData = await Storage.loadData(); // Load encrypted data from storage
        if (encryptedData) {
          // Attempt to decrypt the loaded data using the master password
          const decryptedDataJson = await Encryption.decrypt(encryptedData, masterPassword);
          // Parse the decrypted JSON string back into a JavaScript array of passwords
          const decryptedPasswords = JSON.parse(decryptedDataJson);
          // Initialize a temporary 'showPassword' property for each entry for UI control
          const initialPasswords = decryptedPasswords.map(p => ({ ...p, showPassword: false }));
          setPasswords(initialPasswords); // Update state with loaded passwords
          console.log('Vault loaded and decrypted successfully.');
        } else {
          setPasswords([]); // If no encrypted data found, start with an empty vault
          console.log('No vault data found. Starting with empty vault.');
        }
      } catch (err) {
        console.error('Error loading or decrypting vault:', err);
        setError(`Failed to load vault: ${err.message}. You might need to re-login.`);
        setPasswords([]); // Clear passwords on error
        // If decryption fails due to incorrect password, alert and force logout
        if (err.message.includes('Incorrect master password')) {
            alert('Decryption failed! Please check your master password and try again. Logging out.');
            onLogout(); // Call the logout handler passed from App.jsx
        }
      } finally {
        setIsLoading(false); // Set loading state to false
      }
    };

    loadVault(); // Call the function to load the vault
  }, [masterPassword, onLogout]); // Dependencies: re-run if masterPassword or onLogout changes

  // Function to encrypt and save the updated password list to storage.
  const saveVault = async (updatedPasswords) => {
    try {
      // Create a copy of passwords to save, removing the temporary 'showPassword' property
      const passwordsToSave = updatedPasswords.map(({ showPassword, ...rest }) => rest);
      // Stringify the passwords array to JSON before encryption
      const dataToEncrypt = JSON.stringify(passwordsToSave);
      console.log('Dashboard.jsx: masterPassword for encryption in saveVault:', masterPassword); // Debug Log
      // Encrypt the data using the master password
      const encryptedData = await Encryption.encrypt(dataToEncrypt, masterPassword);
      await Storage.saveData(encryptedData); // Save the encrypted data
      setPasswords(updatedPasswords); // Update local state (with showPassword property)
      console.log('Vault saved and re-encrypted successfully.');
    } catch (err) {
      console.error('Error saving or encrypting vault:', err);
      setError(`Failed to save vault: ${err.message}`);
    }
  };

  // Function to handle copying text to the clipboard.
  const handleCopy = async (text, type) => {
    try {
      await window.electronAPI.copyToClipboard(text); // Call Electron API to copy
      alert(`${type} copied to clipboard!`); // User feedback

      const clearDelay = 15000; // 15 seconds for clipboard clear (security feature)
      // Check if the clipboard clearing API is available (added in main.js/preload.js)
      if (window.electronAPI && window.electronAPI.clearClipboardAfterDelay) {
        window.electronAPI.clearClipboardAfterDelay(clearDelay);
        console.log(`Clipboard will be cleared in ${clearDelay / 1000} seconds.`);
      } else {
        console.warn('clearClipboardAfterDelay API not available in Electron API.');
      }

    } catch (error) {
      console.error(`Failed to copy ${type}:`, error);
      alert(`Failed to copy ${type} to clipboard.`); // User feedback on failure
    }
  };

  // Handles submission from the PasswordForm (used for both adding new and editing existing entries).
  const handleAddOrEditSubmit = (entry) => {
    let updatedPasswords;
    if (entry.id) {
      // If entry has an ID, it's an edit operation
      updatedPasswords = passwords.map(p =>
        p.id === entry.id ? { ...entry, showPassword: p.showPassword || false } : p // Preserve showPassword state
      );
    } else {
      // If no ID, it's a new entry
      updatedPasswords = [...passwords, { ...entry, id: Date.now().toString(), showPassword: false }]; // Generate ID, initialize showPassword
    }
    saveVault(updatedPasswords); // Save the updated list
    setShowPasswordForm(false); // Close the form
    setCurrentEditEntry(null); // Clear any edit data
  };

  // Opens the PasswordForm to add a new password.
  const handleAddPasswordClick = () => {
    setCurrentEditEntry(null); // Ensure no old data is pre-filled for a new entry
    setShowPasswordForm(true); // Show the form
  };

  // Opens the PasswordForm to edit an existing password.
  const handleEditPassword = (id) => {
    const entryToEdit = passwords.find(p => p.id === id); // Find the entry by ID
    if (entryToEdit) {
      setCurrentEditEntry(entryToEdit); // Set it as the current edit entry
      setShowPasswordForm(true); // Show the form
    }
  };

  // Deletes a password entry after confirmation.
  const handleDeletePassword = (id) => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) { // Confirmation dialog
        const updated = passwords.filter(p => p.id !== id); // Filter out the deleted entry
        saveVault(updated); // Save the updated list
        alert('Password entry deleted successfully.'); // User feedback
    }
  };

  // Handles exporting the encrypted vault data to a file chosen by the user.
  const handleExportVault = async () => {
    try {
      // Load the currently encrypted data from the app's storage location in the main process
      const encryptedData = await Storage.loadData();
      if (!encryptedData) {
        alert('No vault data to export.');
        return;
      }

      // Show Electron's save file dialog
      const { canceled, filePath } = await window.electronAPI.showSaveDialog({
        title: 'Export Password Vault',
        defaultPath: `password_vault_${new Date().toISOString().slice(0,10)}.enc`, // Default file name
        filters: [{ name: 'Encrypted Vault', extensions: ['enc'] }] // File extension filter
      });

      if (!canceled && filePath) {
        // Write the encrypted data (as JSON string) to the chosen file path
        const result = await window.electronAPI.writeFile(filePath, JSON.stringify(encryptedData));
        if (result.success) {
          alert('Vault exported successfully!');
          console.log('Vault exported to:', filePath);
        } else {
          alert(`Failed to export vault: ${result.error}`);
          console.error('Export error:', result.error);
        }
      }
    } catch (error) {
      console.error('Error during vault export:', error);
      alert(`An error occurred during export: ${error.message}`);
    }
  };

  // Handles importing an encrypted vault from a file chosen by the user.
  const handleImportVault = async () => {
    // Confirm overwrite as importing replaces current vault
    if (!window.confirm('Importing a vault will OVERWRITE your current vault. Are you sure you want to proceed?')) {
      return;
    }

    try {
      // Show Electron's open file dialog
      const { canceled, filePaths } = await window.electronAPI.showOpenDialog({
        title: 'Import Password Vault',
        properties: ['openFile'], // Allow opening single file
        filters: [{ name: 'Encrypted Vault', extensions: ['enc'] }]
      });

      if (!canceled && filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        const result = await window.electronAPI.readFile(filePath); // Read file content

        if (result.success) {
          const importedEncryptedData = JSON.parse(result.data); // Parse as JSON
          // Attempt to decrypt the imported data with the CURRENT master password
          const decryptedDataJson = await Encryption.decrypt(importedEncryptedData, masterPassword);
          const importedPasswords = JSON.parse(decryptedDataJson);

          // Update local state and save to storage (effectively overwriting)
          const initialPasswords = importedPasswords.map(p => ({ ...p, showPassword: false }));
          await saveVault(initialPasswords); // Save the imported and decrypted data
          alert('Vault imported successfully!');
          console.log('Vault imported from:', filePath);

        } else {
          alert(`Failed to import vault: ${result.error}`);
          console.error('Import error:', result.error);
        }
      }
    } catch (error) {
      console.error('Error during vault import:', error);
      // Specific error handling for decryption failures during import
      if (error.message.includes('Incorrect master password') || error.message.includes('Decryption failed')) {
        alert('Decryption failed for imported vault. Incorrect master password or corrupted file.');
      } else {
        alert(`An error occurred during import: ${error.message}`);
      }
    }
  };


  // Filtered passwords based on search term
  const filteredPasswords = passwords.filter(entry =>
    entry.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  // Render loading or error states
  if (isLoading) {
    return <div className="dashboard-loading">Loading your vault...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  // Main Dashboard UI
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Your Password Vault</h2>
        <div className="header-buttons-group">
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme} className="theme-toggle-btn">
            {currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          {/* Export and Import Buttons */}
          <button onClick={handleExportVault} className="export-vault-btn">Export Vault</button>
          <button onClick={handleImportVault} className="import-vault-btn">Import Vault</button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="password-list-header">
        <h3>Your Entries ({filteredPasswords.length} of {passwords.length})</h3>
        <button onClick={handleAddPasswordClick} className="add-btn">Add New</button>
      </div>

      {/* Search input field */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search entries (Website, Username, Notes)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>


      {/* Conditional rendering for password list or messages */}
      {filteredPasswords.length === 0 && passwords.length > 0 && searchTerm !== '' ? (
        <p className="no-entries-message">No matching entries found for "{searchTerm}".</p>
      ) : filteredPasswords.length === 0 && passwords.length === 0 ? (
        <p className="no-entries-message">No passwords saved yet. Click "Add New" to begin!</p>
      ) : (
        <div className="password-list">
          {filteredPasswords.map((entry) => (
            <div key={entry.id} className="password-item">
              <div className="item-details">
                <strong>{entry.website}</strong>
                <span>
                  Username: {entry.username}
                  {/* Copy Username Button */}
                  <button
                    onClick={() => handleCopy(entry.username, 'Username')}
                    className="copy-btn"
                    title="Copy Username"
                  >
                    Copy
                  </button>
                </span>
                <span className="password-display-wrapper">
                  Password: {entry.showPassword ? entry.password : '••••••••'}
                  <button
                    onClick={() => togglePasswordVisibility(entry.id)}
                    className="toggle-password-btn"
                    title={entry.showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {entry.showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleCopy(entry.password, 'Password')}
                    className="copy-btn"
                    title="Copy Password"
                  >
                    Copy
                  </button>
                </span>
                {entry.notes && <span className="item-notes">Notes: {entry.notes}</span>}
              </div>
              <div className="item-actions">
                <button onClick={() => handleEditPassword(entry.id)} className="edit-btn">Edit</button>
                <button onClick={() => handleDeletePassword(entry.id)} className="delete-btn">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conditional rendering of the PasswordForm for adding/editing */}
      {showPasswordForm && (
        <PasswordForm
          onSubmit={handleAddOrEditSubmit}
          onCancel={() => { setShowPasswordForm(false); setCurrentEditEntry(null); }}
          initialData={currentEditEntry || {}}
        />
      )}
    </div>
  );
}

export default Dashboard;

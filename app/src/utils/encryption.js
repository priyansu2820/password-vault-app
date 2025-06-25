// app/src/utils/encryption.js

// This file defines the API calls that the React frontend will use
// to interact with the main Electron process for encryption/decryption
// and password hashing. The actual crypto logic resides in the main process.

const Encryption = {
  // Hash a password (e.g., master password)
  // Calls an IPC handler in main.js
  hashPassword: async (password) => {
    if (!window.electronAPI || typeof window.electronAPI.hashPassword !== 'function') {
      console.error('electronAPI.hashPassword not available');
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.hashPassword(password);
  },

  // Encrypt data using AES
  // Calls an IPC handler in main.js
  encrypt: async (data, key) => {
    if (!window.electronAPI || typeof window.electronAPI.encrypt !== 'function') {
      console.error('electronAPI.encrypt not available');
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.encrypt(data, key);
  },

  // Decrypt data using AES
  // Calls an IPC handler in main.js
  decrypt: async (encryptedData, key) => {
    if (!window.electronAPI || typeof window.electronAPI.decrypt !== 'function') {
      console.error('electronAPI.decrypt not available');
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.decrypt(encryptedData, key);
  },

  // Helper to generate a secure random key for AES (e.g., for deriving from master password)
  // This will be called in the main process, but we expose it here for clarity of intent
  generateKey: async () => {
    if (!window.electronAPI || typeof window.electronAPI.generateKey !== 'function') {
      console.error('electronAPI.generateKey not available');
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.generateKey();
  }
};

export default Encryption;
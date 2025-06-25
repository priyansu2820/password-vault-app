const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process via 'electronAPI'
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Hashes a password securely in the main process.
   * @param {string} password - The password string to hash.
   * @returns {Promise<string>} A promise that resolves with the hashed password.
   */
  hashPassword: async (password) => {
    return ipcRenderer.invoke('hash-password', password);
  },

  /**
   * Verifies a password against a stored hash in the main process.
   * @param {string} password - The password string to verify.
   * @param {string} storedHash - The stored bcrypt hash to compare against.
   * @returns {Promise<boolean>} A promise that resolves to true if passwords match, false otherwise.
   */
  verifyPassword: async (password, storedHash) => {
    return ipcRenderer.invoke('verify-password', password, storedHash);
  },

  /**
   * Saves application configuration data to a file via the main process.
   * @param {object} configData - The data object to save.
   * @returns {Promise<boolean>} A promise that resolves to true on success.
   */
  saveConfig: async (configData) => {
    return ipcRenderer.invoke('save-config', configData);
  },

  /**
   * Loads application configuration data from a file via the main process.
   * @returns {Promise<object|null>} A promise that resolves with the loaded config data, or null if not found.
   */
  loadConfig: async () => {
    return ipcRenderer.invoke('load-config');
  },

  /**
   * Saves encrypted data (e.g., vault data) to a file via the main process.
   * This is a generic save for encrypted content.
   * @param {string} encryptedData - The encrypted data string to save.
   * @returns {Promise<boolean>} A promise that resolves to true on success.
   */
  saveData: async (encryptedData) => {
    return ipcRenderer.invoke('save-data', encryptedData);
  },

  /**
   * Loads encrypted data (e.g., vault data) from a file via the main process.
   * This is a generic load for encrypted content.
   * @returns {Promise<string|null>} A promise that resolves with the loaded encrypted data string, or null if not found.
   */
  loadData: async () => {
    return ipcRenderer.invoke('load-data');
  },

  /**
   * Encrypts text using a derived key in the main process.
   * @param {string} text - The plain text to encrypt.
   * @param {string} masterKey - The master key/password for key derivation.
   * @returns {Promise<{iv: string, encryptedText: string, tag: string}>} A promise that resolves with the encrypted data object.
   */
  encrypt: async (text, masterKey) => {
    return ipcRenderer.invoke('encrypt', text, masterKey);
  },

  /**
   * Decrypts text using a derived key in the main process.
   * @param {{iv: string, encryptedText: string, tag: string}} encryptedData - The encrypted data object.
   * @param {string} masterKey - The master key/password for key derivation.
   * @returns {Promise<string>} A promise that resolves with the decrypted plain text.
   */
  decrypt: async (encryptedData, masterKey) => {
    return ipcRenderer.invoke('decrypt', encryptedData, masterKey);
  },

  /**
   * Copies text to the system clipboard via the main process.
   * @param {string} text - The text to copy.
   * @returns {Promise<boolean>} A promise that resolves to true on success.
   */
  copyToClipboard: async (text) => {
    return ipcRenderer.invoke('copy-to-clipboard', text);
  },

  /**
   * Deletes the encrypted vault data file from disk via the main process.
   * This is used during master password reset to ensure a clean start.
   * @returns {Promise<boolean>} A promise that resolves to true on success, false otherwise.
   */
  clearVaultData: async () => {
    return ipcRenderer.invoke('clear-vault-data');
  }
});

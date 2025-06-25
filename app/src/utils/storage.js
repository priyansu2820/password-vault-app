// app/src/utils/storage.js

// This file provides utility functions for interacting with Electron's
// IPC to save and load configuration and encrypted vault data.

// Ensure that window.electronAPI is available (exposed via preload.js)
// If you get 'window.electronAPI is undefined', check preload.js and main.js setup.
if (!window.electronAPI) {
  console.error("Electron API not exposed! Check preload.js.");
  // Potentially throw an error or handle gracefully if the API is critical
}

const Storage = {
  /**
   * Loads the application configuration (master password salt and hash).
   * It calls the 'load-config' IPC handler in the main process.
   * @returns {Promise<object|null>} The configuration object or null if not found/error.
   */
  async loadConfig() {
    try {
      // CORRECTED: Call loadConfig as exposed in preload.js
      const config = await window.electronAPI.loadConfig();
      return config;
    } catch (error) {
      console.error('Error loading config via Electron API:', error);
      throw new Error('Failed to load application configuration.');
    }
  },

  /**
   * Saves the application configuration.
   * It calls the 'save-config' IPC handler in the main process.
   * @param {object} config - The configuration object to save.
   * @returns {Promise<boolean>} True if successful.
   */
  async saveConfig(config) {
    try {
      const result = await window.electronAPI.saveConfig(config); // Assuming saveConfig returns { success: true }
      return result.success; // Return the success status
    } catch (error) {
      console.error('Error saving config via Electron API:', error);
      throw new Error('Failed to save application configuration.');
    }
  },

  /**
   * Loads the encrypted vault data.
   * It calls the 'load-data' IPC handler in the main process.
   * @returns {Promise<object|null>} The encrypted data object or null if not found.
   */
  async loadData() {
    try {
      // Calls the loadData function exposed by preload.js
      const data = await window.electronAPI.loadData();
      return data;
    } catch (error) {
      console.error('Error loading data via Electron API:', error);
      throw new Error('Failed to load vault data.');
    }
  },

  /**
   * Saves the encrypted vault data.
   * It calls the 'save-data' IPC handler in the main process.
   * @param {object} data - The encrypted data object to save.
   * @returns {Promise<boolean>} True if successful.
   */
  async saveData(data) {
    try {
      // Calls the saveData function exposed by preload.js
      const result = await window.electronAPI.saveData(data); // Assuming saveData returns { success: true }
      return result.success; // Return the success status
    } catch (error) {
      console.error('Error saving data via Electron API:', error);
      throw new Error('Failed to save vault data.');
    }
  },
};

export default Storage;
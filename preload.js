// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing methods
  checkConfig: () => ipcRenderer.invoke('check-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  verifyPassword: (password, salt, hash) => ipcRenderer.invoke('verify-password', password, salt, hash),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  encrypt: (text, masterKey) => ipcRenderer.invoke('encrypt', text, masterKey),
  decrypt: (encryptedData, masterKey) => ipcRenderer.invoke('decrypt', encryptedData, masterKey),

  // HashPassword method (used in Setup for initial password hashing)
  hashPassword: (password) => ipcRenderer.invoke('hash-password', password),

  // Copy to Clipboard method
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // Clear Clipboard after delay method
  clearClipboardAfterDelay: (delayMs) => ipcRenderer.invoke('clear-clipboard-after-delay', delayMs),

  // NEW: File Dialog and File System methods for Export/Import
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});
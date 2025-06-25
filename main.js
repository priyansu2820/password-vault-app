// main.js
const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// --- Constants ---
const IS_DEV = process.env.NODE_ENV === 'development';
const CONFIG_FILE = 'encrypt_config.json';
const DATA_FILE = 'encrypted_data.json';
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 16;   // bytes
const ITERATIONS = 100000;
const KEY_LENGTH = 32;  // 32 bytes = 256 bits for AES-256
const DIGEST = 'sha512'; // Hash algorithm for PBKDF2

// Get the user data path for secure storage
const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, CONFIG_FILE);
const dataFilePath = path.join(userDataPath, DATA_FILE);

console.log('User data path:', userDataPath); // Debugging: Check the user data path

// Variable to hold the clipboard clear timeout ID
let clipboardClearTimeout = null;

// --- Utility Functions (IPC handlers use these) ---

// Derives a cryptographic key from a password and salt using PBKDF2
function deriveKey(password, salt) {
  if (typeof password !== 'string' && !Buffer.isBuffer(password)) {
    throw new TypeError('The "password" argument must be of type string or Buffer.');
  }
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

// Encrypts text using AES-256-CBC
function encrypt(text, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH); // Unique salt for each encryption
  const key = deriveKey(masterKey, salt.toString('hex')); // Derive key from masterKey and salt
  const iv = crypto.randomBytes(IV_LENGTH); // Initialization Vector
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Store salt and iv with the encrypted data
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

// Decrypts text using AES-256-CBC
function decrypt(encryptedDataObj, masterKey) {
  try {
    const salt = Buffer.from(encryptedDataObj.salt, 'hex');
    const iv = Buffer.from(encryptedDataObj.iv, 'hex');
    const encryptedText = encryptedDataObj.encryptedData;

    const key = deriveKey(masterKey, salt.toString('hex')); // Re-derive key with stored salt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    if (error.message.includes('bad decrypt') || error.message.includes('Unsupported state')) {
      throw new Error('Decryption failed. Incorrect master password or corrupted data.');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Hashes a password with a generated salt for storage
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = deriveKey(password, salt).toString('hex');
  return { salt, hash };
}

// Verifies a password against a stored salt and hash
function verifyPassword(password, salt, storedHash) {
  const newHash = deriveKey(password, salt).toString('hex');
  return newHash === storedHash;
}

// --- IPC Main Handlers ---

// IPC to check if configuration exists
ipcMain.handle('check-config', async () => {
  try {
    if (fs.existsSync(configFilePath)) {
      const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      console.log('Config loaded from:', configFilePath);
      return config; // Return the config if it exists
    }
    console.log('Config file not found at', configFilePath);
    return null; // No config found
  } catch (error) {
    console.error('Error checking config:', error);
    // If config file is corrupted, act as if it doesn't exist
    return null;
  }
});

// IPC to save configuration (master password hash and salt)
ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config), 'utf8');
    console.log('Config saved to:', configFilePath);
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    throw new Error('Failed to save configuration');
  }
});

// IPC to verify master password
ipcMain.handle('verify-password', async (event, password, salt, hash) => {
  try {
    const isMatch = verifyPassword(password, salt, hash);
    console.log('Password verification attempt:', isMatch ? 'SUCCESS' : 'FAILED');
    return isMatch;
  } catch (error) {
    console.error('Error during password verification:', error);
    throw new Error('Verification process failed');
  }
});

// IPC to save encrypted data
ipcMain.handle('save-data', async (event, encryptedData) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(encryptedData), 'utf8');
    console.log('Data saved to:', dataFilePath);
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    throw new Error('Failed to save data');
  }
});

// IPC to load encrypted data
ipcMain.handle('load-data', async () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      console.log('Data loaded from:', dataFilePath);
      return JSON.parse(data);
    }
    console.log('Data file not found at', dataFilePath + '. Returning empty data.');
    return null; // No data found
  } catch (error) {
    console.error('Error loading data:', error);
    throw new Error('Failed to load data, file might be corrupted.');
  }
});

// IPC to encrypt data
ipcMain.handle('encrypt', async (event, text, masterKey) => {
  try {
    const encrypted = encrypt(text, masterKey);
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption failed');
  }
});

// IPC to decrypt data
ipcMain.handle('decrypt', async (event, encryptedData, masterKey) => {
  try {
    const decrypted = decrypt(encryptedData, masterKey);
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed. Incorrect master password or corrupted data.');
  }
});

// IPC handler for hashing password
ipcMain.handle('hash-password', async (event, password) => {
  try {
    const { salt, hash } = hashPassword(password);
    console.log('Password hashed successfully.');
    return { salt, hash };
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
});

// IPC handler for copy-to-clipboard
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    console.log(`Copied to clipboard: ${text.substring(0, Math.min(text.length, 10))}...`);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
});

// IPC handler for clearing clipboard after a delay
ipcMain.handle('clear-clipboard-after-delay', (event, delayMs) => {
  // Clear any existing timeout to prevent multiple clears from interfering
  if (clipboardClearTimeout) {
    clearTimeout(clipboardClearTimeout);
  }

  clipboardClearTimeout = setTimeout(() => {
    clipboard.clear();
    console.log('Clipboard cleared automatically.');
  }, delayMs);

  return true; // Indicate success
});

// NEW: IPC handler for showing a Save File dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(window, options);
  return result; // { canceled, filePath }
});

// NEW: IPC handler for showing an Open File dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(window, options);
  return result; // { canceled, filePaths }
});

// NEW: IPC handler for writing data to a specific file path
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (error) {
    console.error(`Error writing file to ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

// NEW: IPC handler for reading data from a specific file path
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: data };
    }
    return { success: false, error: 'File not found.' };
  } catch (error) {
    console.error(`Error reading file from ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});


// --- Electron App Lifecycle ---
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the React app in development
  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5174'); // Vite's default port
    mainWindow.webContents.openDevTools(); // Open DevTools automatically in dev
  } else {
    // Load the production build
    mainWindow.loadFile(path.join(__dirname, 'app/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
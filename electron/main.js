const { app, BrowserWindow, ipcMain, clipboard } = require('electron'); // ADDED 'clipboard'
const path = require('node:path'); // Using 'node:path' for clarity, 'path' works too
const bcrypt = require('bcrypt'); // For password hashing
const fs = require('fs-extra'); // Required for robust file system operations (e.g., ensureDir, readJson, writeJson)
const crypto = require('crypto'); // Ensure crypto is imported for deriveKey etc.

// --- Configuration and Vault File Paths ---
const USER_DATA_PATH = app.getPath('userData'); // Gets the user's application data directory (OS-specific)
const CONFIG_FILE_PATH = path.join(USER_DATA_PATH, 'app-config.json'); // Path for main app configuration
const ENCRYPTED_DATA_FILE_PATH = path.join(USER_DATA_PATH, 'encrypted_vault_data.json'); // Path for encrypted vault data

// --- Cryptography Utility Functions ---
// These functions are used for symmetric encryption/decryption of the vault data
// They run in the main process to leverage Node.js crypto module securely.

// Constants for encryption
const SALT_LENGTH = 16;     // bytes for key derivation salt
const IV_LENGTH = 16;       // bytes for Initialization Vector (IV)
const ITERATIONS = 100000;  // Number of iterations for PBKDF2 (for key derivation)
const KEY_LENGTH = 32;      // 32 bytes = 256 bits for AES-256
const DIGEST = 'sha512';    // Hash algorithm for PBKDF2

/**
 * Derives a cryptographic key from a password and salt using PBKDF2.
 * @param {string | Buffer} password - The password/master key.
 * @param {string} salt - The salt (hex string) to use with PBKDF2.
 * @returns {Buffer} The derived cryptographic key.
 */
function deriveKey(password, salt) {
  if (typeof password !== 'string' && !Buffer.isBuffer(password)) {
    throw new TypeError('The "password" argument must be of type string or Buffer.');
  }
  return crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, KEY_LENGTH, DIGEST);
}

/**
 * Encrypts a given text string using AES-256-CBC.
 * A unique salt and IV are generated for each encryption.
 * @param {string} text - The plain text string to encrypt.
 * @param {string} masterKey - The master password/key used for key derivation.
 * @returns {object} An object containing the salt, IV, and encrypted data (all in hex format).
 */
function encrypt(text, masterKey) {
  const salt = crypto.randomBytes(SALT_LENGTH); // Unique salt for this specific encryption operation
  const key = deriveKey(masterKey, salt.toString('hex')); // Derive content encryption key from masterKey and salt
  const iv = crypto.randomBytes(IV_LENGTH); // Initialization Vector for AES-CBC
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return all components needed for decryption later
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

/**
 * Decrypts an encrypted data object using AES-256-CBC.
 * @param {object} encryptedDataObj - Object containing salt, IV, and encrypted data (all in hex format).
 * @param {string} masterKey - The master password/key used for key derivation during decryption.
 * @returns {string} The decrypted plain text string.
 * @throws {Error} If decryption fails (e.g., incorrect key, corrupted data).
 */
function decrypt(encryptedDataObj, masterKey) {
  try {
    const salt = Buffer.from(encryptedDataObj.salt, 'hex');
    const iv = Buffer.from(encryptedDataObj.iv, 'hex');
    const encryptedText = encryptedDataObj.encryptedData;

    const key = deriveKey(masterKey, salt.toString('hex')); // Re-derive key using the stored salt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Main Process: Decryption error:', error);
    // Provide more specific error messages for common decryption failures
    if (error.message.includes('bad decrypt') || error.message.includes('Unsupported state')) {
      throw new Error('Decryption failed. Incorrect master password or corrupted data.');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// --- End Cryptography Utility Functions ---


// --- Main Window Creation ---
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Path to the preload script
      nodeIntegration: false, // Disallow Node.js integration in renderer for security
      contextIsolation: true, // Isolate preload script from renderer's global context for security
      enableRemoteModule: false // Disable remote module for security
    },
  });

  // Load the React app's compiled index.html file
  // Assumes 'app/dist/index.html' relative to the electron/main.js
  mainWindow.loadFile(path.join(__dirname, 'app', 'dist', 'index.html'));

  // Open the DevTools automatically in development mode for easier debugging
  if (process.env.NODE_ENV === 'development') {
    // mainWindow.webContents.openDevTools(); // Uncomment this line to enable DevTools
  }
}

// --- IPC Main Handlers ---
// These functions define how the main process responds to messages from the renderer process (your React app).
app.whenReady().then(() => {
  createWindow(); // Create the main application window once Electron is ready

  // Handler for hashing a password (e.g., during master password setup)
  ipcMain.handle('hash-password', async (event, password) => {
    console.log('Main Process: IPC - Hashing password...');
    try {
      const saltRounds = 10; // Number of salt rounds for bcrypt
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword; // bcrypt hash string includes its own salt
    } catch (error) {
      console.error('Main Process: Error in hash-password IPC:', error);
      throw new Error('Failed to securely hash password.');
    }
  });

  // Handler for verifying a password against a stored hash (e.g., during login)
  ipcMain.handle('verify-password', async (event, password, storedHash) => {
    console.log('Main Process: IPC - Verifying password...');
    try {
      const isMatch = await bcrypt.compare(password, storedHash);
      console.log('Main Process: Password verification attempt:', isMatch ? 'SUCCESS' : 'FAILED');
      return isMatch;
    } catch (error) {
      console.error('Main Process: Error in verify-password IPC:', error);
      throw new Error('Verification process failed.');
    }
  });

  // Handler for saving application configuration (e.g., master password hash, security question)
  ipcMain.handle('save-config', async (event, configData) => {
    console.log('Main Process: IPC - Saving configuration...');
    try {
      await fs.ensureDir(USER_DATA_PATH); // Ensure the user data directory exists
      await fs.writeJson(CONFIG_FILE_PATH, configData, { spaces: 2 }); // Write JSON data with 2-space indentation
      console.log('Main Process: Application configuration saved successfully to:', CONFIG_FILE_PATH);
      return { success: true }; // Return a success object
    } catch (error) {
      console.error('Main Process: Error in save-config IPC:', error);
      throw new Error('Failed to save application configuration.');
    }
  });

  // Handler for loading application configuration
  ipcMain.handle('load-config', async (event) => {
    console.log('Main Process: IPC - Loading configuration...');
    try {
      if (await fs.pathExists(CONFIG_FILE_PATH)) { // Check if the config file exists
        const config = await fs.readJson(CONFIG_FILE_PATH); // Read and parse the JSON file
        console.log('Main Process: Application configuration loaded successfully from:', CONFIG_FILE_PATH);
        return config; // Return the loaded configuration object
      }
      console.log('Main Process: No existing application configuration file found.');
      return null; // Return null if file does not exist
    } catch (error) {
      console.error('Main Process: Error in load-config IPC:', error);
      throw new Error('Failed to load application configuration.');
    }
  });

  // Handler for saving encrypted vault data
  ipcMain.handle('save-data', async (event, encryptedData) => {
    console.log('Main Process: IPC - Saving encrypted vault data...');
    try {
      await fs.ensureDir(USER_DATA_PATH); // Ensure user data directory exists
      await fs.writeJson(ENCRYPTED_DATA_FILE_PATH, encryptedData, { spaces: 2 }); // Save as JSON
      console.log('Main Process: Encrypted vault data saved successfully to:', ENCRYPTED_DATA_FILE_PATH);
      return { success: true };
    } catch (error) {
      console.error('Main Process: Error in save-data IPC:', error);
      throw new Error('Failed to save vault data.');
    }
  });

  // Handler for loading encrypted vault data
  ipcMain.handle('load-data', async (event) => {
    console.log('Main Process: IPC - Loading encrypted vault data...');
    try {
      if (await fs.pathExists(ENCRYPTED_DATA_FILE_PATH)) { // Check if vault file exists
        const data = await fs.readJson(ENCRYPTED_DATA_FILE_PATH); // Read and parse
        console.log('Main Process: Encrypted vault data loaded successfully from:', ENCRYPTED_DATA_FILE_PATH);
        return data;
      }
      console.log('Main Process: No existing encrypted vault data file found.');
      return null; // Return null if file does not exist
    } catch (error) {
      console.error('Main Process: Error in load-data IPC:', error);
      throw new Error('Failed to load vault data.');
    }
  });

  // Handler for encrypting text using the crypto utility function
  ipcMain.handle('encrypt', async (event, text, masterKey) => {
    console.log('Main Process: IPC - Encrypting text...');
    try {
      const encrypted = encrypt(text, masterKey);
      return encrypted;
    } catch (error) {
      console.error('Main Process: Error in encrypt IPC:', error);
      throw new Error('Encryption failed.');
    }
  });

  // Handler for decrypting text using the crypto utility function
  ipcMain.handle('decrypt', async (event, encryptedData, masterKey) => {
    console.log('Main Process: IPC - Decrypting text...');
    try {
      const decrypted = decrypt(encryptedData, masterKey);
      return decrypted;
    } catch (error) {
      console.error('Main Process: Error in decrypt IPC:', error);
      throw new Error('Decryption failed. Check master password or data integrity.');
    }
  });

  // Handler for copying text to the system clipboard
  ipcMain.handle('copy-to-clipboard', async (event, text) => {
    console.log('Main Process: IPC - Copying to clipboard...');
    try {
      clipboard.writeText(text); // Electron's clipboard API
      console.log('Main Process: Text copied to clipboard successfully.');
      return true; // Indicate success back to renderer
    } catch (error) {
      console.error('Main Process: Error in copy-to-clipboard IPC:', error);
      throw new Error(`Clipboard operation failed: ${error.message}`);
    }
  });

  // NEW: Handler to delete the encrypted vault data file
  ipcMain.handle('clear-vault-data', async () => {
    console.log('Main Process: IPC - Clearing vault data...');
    try {
      if (await fs.pathExists(ENCRYPTED_DATA_FILE_PATH)) {
        await fs.remove(ENCRYPTED_DATA_FILE_PATH); // Use fs-extra's remove for robust deletion
        console.log('Main Process: Vault data file deleted successfully.');
        return true;
      }
      console.log('Main Process: No vault data file to delete.');
      return false;
    } catch (error) {
      console.error('Main Process: Error in clear-vault-data IPC:', error);
      throw new Error(`Failed to clear vault data: ${error.message}`);
    }
  });

  // Event listener for when the app is activated (e.g., dock icon clicked on macOS)
  app.on('activate', () => {
    // On macOS, it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Event listener for when all windows are closed
app.on('window-all-closed', () => {
  // Quit the application when all windows are closed, except on macOS where apps typically stay active in the dock.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Electron Reload for Development (Optional) ---
// This block helps in automatically restarting Electron during development when main process files change.
// It should only be active in development environments.
try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    // If you are on Windows, you might need to specify the exact path to electron.exe
    // electron: path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
  });
} catch (e) {
  // This catch block handles cases where electron-reload might not be available (e.g., in production builds)
  // console.error("Electron-reload not loaded:", e.message); // Uncomment for debugging electron-reload issues
}

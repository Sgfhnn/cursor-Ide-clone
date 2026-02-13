import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const preloadPath = path.join(__dirname, 'preload.js');
    console.log('Main: Loading preload from:', preloadPath);

    if (!fs.existsSync(preloadPath)) {
        console.error('CRITICAL: Preload script not found at:', preloadPath);
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        icon: path.join(__dirname, '../../build/icon.png'), // Point to where the icon will be
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            // Disable default CSP to allow Monaco CDN
            webSecurity: true,
        },
        titleBarStyle: 'hiddenInset',
        frame: true,
    });

    // Set CSP to allow Monaco Editor CDN
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' http://localhost:* https:; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob:; " +
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
                    "font-src 'self' https://cdn.jsdelivr.net data:; " +
                    "img-src 'self' data: https:; " +
                    "frame-src 'self' http://localhost:*; " +
                    "connect-src 'self' http://localhost:* https://generativelanguage.googleapis.com https://cdn.jsdelivr.net https://api.openai.com https://api.anthropic.com https://api.firecrawl.dev; " +
                    "worker-src 'self' blob:;"
                ]
            }
        });
    });

    // Load from dev server or production build
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ===== IPC Handlers =====

function setupIpcHandlers() {
    // Open folder dialog
    ipcMain.handle('dialog:openFolder', async () => {
        console.log('IPC: dialog:openFolder called');
        if (!mainWindow) {
            console.error('mainWindow is null');
        }
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Project Folder',
            buttonLabel: 'Select Folder',
        });
        console.log('Dialog result:', result);
        return result.canceled ? null : result.filePaths[0];
    });

    // Read directory contents
    ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            return entries.map((entry) => ({
                name: entry.name,
                path: path.join(dirPath, entry.name),
                isDirectory: entry.isDirectory(),
            }));
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    });

    // Read file contents
    ipcMain.handle('fs:readFile', async (_, filePath: string) => {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    });

    // Write file contents (ensure parent dirs exist)
    ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
        const normalizedPath = path.normalize(filePath);
        console.log(`Main: Writing file to ${normalizedPath}`);
        try {
            const dir = path.dirname(normalizedPath);
            if (!fs.existsSync(dir)) {
                console.log(`Main: Creating directory ${dir}`);
                await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(normalizedPath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error writing file:', error);
            return false;
        }
    });

    // Create new file (ensure parent dirs exist)
    ipcMain.handle('fs:createFile', async (_, filePath: string, content: string) => {
        const normalizedPath = path.normalize(filePath);
        console.log(`Main: Creating file at ${normalizedPath}`);
        try {
            const dir = path.dirname(normalizedPath);
            if (!fs.existsSync(dir)) {
                console.log(`Main: Creating directory ${dir}`);
                await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(normalizedPath, content, 'utf-8');
            return true;
        } catch (error) {
            console.error('Error creating file:', error);
            return false;
        }
    });

    // Delete file
    ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
        try {
            await fs.promises.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    });

    // Delete directory
    ipcMain.handle('fs:deleteDirectory', async (_, dirPath: string) => {
        try {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
            return true;
        } catch (error) {
            console.error('Error deleting directory:', error);
            return false;
        }
    });

    // Check if path exists
    ipcMain.handle('fs:exists', async (_, targetPath: string) => {
        try {
            await fs.promises.access(targetPath);
            return true;
        } catch {
            return false;
        }
    });

    // Get file stats
    ipcMain.handle('fs:getStats', async (_, filePath: string) => {
        try {
            const stats = await fs.promises.stat(filePath);
            return {
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile(),
                size: stats.size,
                modified: stats.mtime.toISOString(),
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    });

    // ===== Terminal Handlers =====

    // Get current working directory
    ipcMain.handle('terminal:getCwd', async () => {
        return process.cwd();
    });

    // Execute terminal command
    ipcMain.handle('terminal:executeCommand', async (_, command: string, cwd?: string) => {
        const { exec } = require('child_process');

        return new Promise((resolve) => {
            const options = {
                cwd: cwd || process.cwd(),
                shell: true,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
            };

            // Handle cd command specially
            if (command.trim().startsWith('cd ')) {
                const newPath = command.trim().substring(3).trim();
                const targetPath = path.isAbsolute(newPath)
                    ? newPath
                    : path.resolve(options.cwd, newPath);

                try {
                    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
                        resolve({
                            stdout: `Changed directory to ${targetPath}`,
                            stderr: '',
                            cwd: targetPath,
                        });
                    } else {
                        resolve({
                            stdout: '',
                            stderr: `Directory not found: ${targetPath}`,
                            cwd: options.cwd,
                        });
                    }
                } catch (error) {
                    resolve({
                        stdout: '',
                        stderr: `Error: ${error}`,
                        cwd: options.cwd,
                    });
                }
                return;
            }

            exec(command, options, (error: Error | null, stdout: string, stderr: string) => {
                resolve({
                    stdout: stdout || '',
                    stderr: error ? (stderr || error.message) : (stderr || ''),
                    cwd: options.cwd,
                });
            });
        });
    });
}

// Initialize handlers
setupIpcHandlers();

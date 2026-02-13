const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script initializing (using require)...');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Dialog
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

    // File system operations
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
        ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath: string, content: string) =>
        ipcRenderer.invoke('fs:createFile', filePath, content),
    exists: (targetPath: string) => ipcRenderer.invoke('fs:exists', targetPath),
    getStats: (filePath: string) => ipcRenderer.invoke('fs:getStats', filePath),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
    deleteDirectory: (dirPath: string) => ipcRenderer.invoke('fs:deleteDirectory', dirPath),

    // Terminal operations
    getCwd: () => ipcRenderer.invoke('terminal:getCwd'),
    executeCommand: (command: string, cwd?: string) =>
        ipcRenderer.invoke('terminal:executeCommand', command, cwd),
});

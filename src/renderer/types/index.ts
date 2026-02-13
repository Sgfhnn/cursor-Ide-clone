// Type definitions for Electron API exposed via preload
export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
}

export interface FileStats {
    isDirectory: boolean;
    isFile: boolean;
    size: number;
    modified: string;
}

export interface ElectronAPI {
    openFolder: () => Promise<string | null>;
    readDirectory: (dirPath: string) => Promise<FileEntry[]>;
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    createFile: (filePath: string, content: string) => Promise<boolean>;
    exists: (targetPath: string) => Promise<boolean>;
    getStats: (filePath: string) => Promise<FileStats | null>;
    deleteFile: (filePath: string) => Promise<boolean>;
    deleteDirectory: (dirPath: string) => Promise<boolean>;

    // Terminal
    getCwd: () => Promise<string>;
    executeCommand: (command: string, cwd?: string) => Promise<{ stdout: string; stderr: string; cwd?: string }>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

// Editor Types
export interface OpenFile {
    path: string;
    name: string;
    content: string;
    language: string;
    isDirty: boolean;
    isPinned: boolean;
}

// Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    context?: {
        filePath?: string;
        selection?: string;
        action?: AIAction;
    };
}

export type AIAction = 'explain' | 'refactor' | 'generate' | 'fix';

// Diff Types
export interface DiffChange {
    type: 'added' | 'removed' | 'unchanged';
    value: string;
    lineNumber?: number;
}

export interface PendingChange {
    id: string;
    filePath: string;
    originalContent: string;
    newContent: string;
    description: string;
}

export interface FileOperation {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    path: string;
    content?: string;
}

export interface AgenticChange {
    id: string;
    operations: FileOperation[];
    description: string;
    timestamp: number;
}

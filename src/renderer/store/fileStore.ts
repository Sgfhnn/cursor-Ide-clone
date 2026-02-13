import { create } from 'zustand';
import { FileEntry } from '../types';

interface FileStore {
    // State
    rootPath: string | null;
    files: FileEntry[];
    expandedDirs: Set<string>;

    // Actions
    setRootPath: (path: string | null) => void;
    setFiles: (files: FileEntry[]) => void;
    toggleDir: (path: string) => void;
    isExpanded: (path: string) => boolean;
    refreshFiles: () => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
    rootPath: null,
    files: [],
    expandedDirs: new Set(),

    setRootPath: (path) => set({ rootPath: path }),

    setFiles: (files) => set({ files }),

    toggleDir: (path) => {
        const { expandedDirs } = get();
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        set({ expandedDirs: newExpanded });
    },

    isExpanded: (path) => get().expandedDirs.has(path),

    refreshFiles: async () => {
        const { rootPath } = get();
        if (rootPath) {
            const files = await window.electronAPI.readDirectory(rootPath);
            set({ files });
        }
    },
}));

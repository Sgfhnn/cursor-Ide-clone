import { create } from 'zustand';
import { OpenFile } from '../types';

interface EditorStore {
    // State
    openFiles: OpenFile[];
    activeFilePath: string | null;
    selection: string | null;

    // Actions
    openFile: (file: OpenFile, pin?: boolean) => void;
    closeFile: (path: string) => void;
    setActiveFile: (path: string | null) => void;
    updateFileContent: (path: string, content: string) => void;
    markFileDirty: (path: string, isDirty: boolean) => void;
    setSelection: (selection: string | null) => void;
    getActiveFile: () => OpenFile | null;
    pinFile: (path: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
    openFiles: [],
    activeFilePath: null,
    selection: null,

    openFile: (file, pin = true) => {
        const { openFiles } = get();
        const existingIndex = openFiles.findIndex((f) => f.path === file.path);

        if (existingIndex !== -1) {
            // Already open. If we are now pinning, update it.
            if (pin && !openFiles[existingIndex].isPinned) {
                set({
                    openFiles: openFiles.map(f => f.path === file.path ? { ...f, isPinned: true } : f),
                    activeFilePath: file.path
                });
            } else {
                set({ activeFilePath: file.path });
            }
            return;
        }

        // Not open. 
        if (pin) {
            set({ openFiles: [...openFiles, { ...file, isPinned: true }], activeFilePath: file.path });
        } else {
            // Preview mode. Replace existing preview if any.
            const previewIndex = openFiles.findIndex(f => !f.isPinned);
            if (previewIndex !== -1) {
                // Replace the existing preview tab
                const newFiles = [...openFiles];
                newFiles[previewIndex] = { ...file, isPinned: false };
                set({ openFiles: newFiles, activeFilePath: file.path });
            } else {
                // No preview tab exists, add a new one in preview mode
                set({ openFiles: [...openFiles, { ...file, isPinned: false }], activeFilePath: file.path });
            }
        }
    },

    pinFile: (path) => {
        set((state) => ({
            openFiles: state.openFiles.map((f) =>
                f.path === path ? { ...f, isPinned: true } : f
            ),
        }));
    },

    closeFile: (path) => {
        const { openFiles, activeFilePath } = get();
        const newFiles = openFiles.filter((f) => f.path !== path);
        let newActive = activeFilePath;

        if (activeFilePath === path) {
            const index = openFiles.findIndex((f) => f.path === path);
            if (newFiles.length > 0) {
                newActive = newFiles[Math.min(index, newFiles.length - 1)]?.path || null;
            } else {
                newActive = null;
            }
        }

        set({ openFiles: newFiles, activeFilePath: newActive });
    },

    setActiveFile: (path) => set({ activeFilePath: path }),

    updateFileContent: (path, content) => {
        set((state) => ({
            openFiles: state.openFiles.map((f) =>
                f.path === path ? { ...f, content, isDirty: true, isPinned: true } : f
            ),
        }));
    },

    markFileDirty: (path, isDirty) => {
        set((state) => ({
            openFiles: state.openFiles.map((f) =>
                f.path === path ? { ...f, isDirty } : f
            ),
        }));
    },

    setSelection: (selection) => set({ selection }),

    getActiveFile: () => {
        const { openFiles, activeFilePath } = get();
        return openFiles.find((f) => f.path === activeFilePath) || null;
    },
}));

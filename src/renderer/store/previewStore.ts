import { create } from 'zustand';

interface PreviewStore {
    isVisible: boolean;
    url: string;
    toggleVisible: () => void;
    setVisible: (visible: boolean) => void;
    setUrl: (url: string) => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
    isVisible: false,
    url: 'http://localhost:3000',
    toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
    setVisible: (visible) => set({ isVisible: visible }),
    setUrl: (url) => set({ url }),
}));

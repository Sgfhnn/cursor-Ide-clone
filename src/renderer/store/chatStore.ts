import { create } from 'zustand';
import { ChatMessage, PendingChange, AgenticChange } from '../types';

interface ChatStore {
    // State
    messages: ChatMessage[];
    isLoading: boolean;
    pendingChange: PendingChange | null;
    agenticChange: AgenticChange | null;
    apiKey: string;
    firecrawlKey: string;
    openAIKey: string;
    contextFiles: string[];
    scrapedDocs: { url: string, content: string }[];
    // AI Configuration
    provider: 'gemini' | 'ollama' | 'openai';
    model: string;
    usageMode: 'trial' | 'custom';

    // Actions
    addMessage: (message: ChatMessage) => void;
    setLoading: (loading: boolean) => void;
    setPendingChange: (change: PendingChange | null) => void;
    setAgenticChange: (change: AgenticChange | null) => void;
    clearMessages: () => void;
    setApiKey: (key: string) => void;
    setFirecrawlKey: (key: string) => void;
    setOpenAIKey: (key: string) => void;
    setProvider: (provider: 'gemini' | 'ollama' | 'openai') => void;
    setModel: (model: string) => void;
    setUsageMode: (mode: 'trial' | 'custom') => void;
    addContextFile: (path: string) => void;
    removeContextFile: (path: string) => void;
    clearContextFiles: () => void;
    addScrapedDoc: (url: string, content: string) => void;
    removeScrapedDoc: (url: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    // State
    messages: [],
    isLoading: false,
    pendingChange: null,
    agenticChange: null,
    apiKey: '',
    firecrawlKey: '',
    openAIKey: '',
    contextFiles: [],
    scrapedDocs: [],
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    usageMode: 'custom',

    // Actions
    addMessage: (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setPendingChange: (change) => set({ pendingChange: change }),

    setAgenticChange: (change) => set({ agenticChange: change }),

    clearMessages: () => set({ messages: [] }),

    setApiKey: (key) => set({ apiKey: key }),

    setFirecrawlKey: (key) => set({ firecrawlKey: key }),

    setOpenAIKey: (key) => set({ openAIKey: key }),

    setProvider: (provider) => set({ provider }),

    setModel: (model) => set({ model }),

    setUsageMode: (mode) => set({ usageMode: mode }),

    addContextFile: (path) => {
        set((state) => ({
            contextFiles: state.contextFiles.includes(path)
                ? state.contextFiles
                : [...state.contextFiles, path]
        }));
    },

    removeContextFile: (path) => {
        set((state) => ({
            contextFiles: state.contextFiles.filter(p => p !== path)
        }));
    },

    clearContextFiles: () => set({ contextFiles: [] }),

    addScrapedDoc: (url, content) => {
        set((state) => ({
            scrapedDocs: [...state.scrapedDocs.filter(d => d.url !== url), { url, content }]
        }));
    },

    removeScrapedDoc: (url) => {
        set((state) => ({
            scrapedDocs: state.scrapedDocs.filter(d => d.url !== url)
        }));
    },
}));

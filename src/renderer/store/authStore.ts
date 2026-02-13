import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string; // Store hash, not plain text
}

interface UsageRecord {
    date: string; // YYYY-MM-DD
    count: number;
}

interface AuthState {
    user: Omit<User, 'passwordHash'> | null;
    users: Record<string, User>; // efficient lookup by email
    usage: Record<string, UsageRecord>; // userId -> UsageRecord
    isAuthenticated: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    signup: (username: string, email: string, password: string) => Promise<boolean>;
    clearError: () => void;

    // Usage tracking
    getRemainingRequests: () => number;
    incrementUsage: (skipQuota?: boolean) => boolean; // returns true if allowed, false if limit reached
}

const DAILY_LIMIT = 10;

// Simple SHA-256 hash for MVP (runs in browser/renderer)
const hashPassword = async (password: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            users: {},
            usage: {},
            isAuthenticated: false,
            error: null,

            login: async (email, password) => {
                const { users } = get();
                const user = users[email];

                if (!user) {
                    set({ error: 'User not found' });
                    return false;
                }

                const hash = await hashPassword(password);
                if (user.passwordHash !== hash) {
                    set({ error: 'Invalid password' });
                    return false;
                }

                set({
                    user: { id: user.id, username: user.username, email: user.email },
                    isAuthenticated: true,
                    error: null
                });
                return true;
            },

            signup: async (username, email, password) => {
                const { users } = get();

                if (users[email]) {
                    set({ error: 'User already exists' });
                    return false;
                }

                if (password.length < 8) {
                    set({ error: 'Password must be at least 8 characters' });
                    return false;
                }

                const passwordHash = await hashPassword(password);
                const newUser: User = {
                    id: email,
                    username,
                    email,
                    passwordHash
                };

                set({
                    users: { ...users, [email]: newUser },
                    user: { id: email, username, email }, // Don't put hash in current user state
                    isAuthenticated: true,
                    error: null
                });
                return true;
            },

            logout: () => {
                set({ user: null, isAuthenticated: false, error: null });
            },

            clearError: () => set({ error: null }),

            getRemainingRequests: () => {
                const { user, usage } = get();
                if (!user) return 0;

                const today = new Date().toISOString().split('T')[0];
                const userUsage = usage[user.id];

                if (!userUsage || userUsage.date !== today) {
                    return DAILY_LIMIT;
                }

                return Math.max(0, DAILY_LIMIT - userUsage.count);
            },

            incrementUsage: (skipQuota?: boolean) => {
                // If user is exempt (own API key, Ollama, OpenAI), skip quota entirely
                if (skipQuota) return true;

                const { user, usage } = get();
                if (!user) return false;

                const today = new Date().toISOString().split('T')[0];
                const userUsage = usage[user.id];

                let newCount = 1;

                if (userUsage && userUsage.date === today) {
                    if (userUsage.count >= DAILY_LIMIT) {
                        return false; // Limit reached
                    }
                    newCount = userUsage.count + 1;
                }

                // Update usage
                set({
                    usage: {
                        ...usage,
                        [user.id]: {
                            date: today,
                            count: newCount
                        }
                    }
                });

                return true;
            }
        }),
        {
            name: 'cursor-clone-auth-v2', // new version for new schema
        }
    )
);

import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { aiService } from '../../services/ai/aiService';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const {
        apiKey, setApiKey,
        firecrawlKey, setFirecrawlKey,
        openAIKey, setOpenAIKey,
        provider, setProvider,
        model, setModel,
        usageMode, setUsageMode
    } = useChatStore();
    const { user, logout } = useAuthStore();
    const [localKey, setLocalKey] = useState(apiKey);
    const [localFirecrawlKey, setLocalFirecrawlKey] = useState(firecrawlKey);
    const [localOpenAIKey, setLocalOpenAIKey] = useState(openAIKey);
    const [localProvider, setLocalProvider] = useState(provider);
    const [localModel, setLocalModel] = useState(model);
    const [localUsageMode, setLocalUsageMode] = useState(usageMode);

    if (!isOpen) return null;

    const handleSave = () => {
        setApiKey(localKey);
        setFirecrawlKey(localFirecrawlKey);
        setOpenAIKey(localOpenAIKey);
        setProvider(localProvider);
        setModel(localModel);
        setUsageMode(localUsageMode);

        // Update service immediately
        aiService.setUsageMode(localUsageMode);
        aiService.setApiKey(localKey);
        aiService.setFirecrawlKey(localFirecrawlKey);
        aiService.setOpenAIKey(localOpenAIKey);
        aiService.setProvider(localProvider);
        aiService.setModel(localModel);

        // Persist keys
        if (localKey) localStorage.setItem('gemini_api_key', localKey);
        if (localFirecrawlKey) localStorage.setItem('firecrawl_api_key', localFirecrawlKey);
        if (localOpenAIKey) localStorage.setItem('openai_api_key', localOpenAIKey);
        localStorage.setItem('usage_mode', localUsageMode);

        onClose();
    };

    return (
        <div className="auth-modal">
            <div className="auth-container" style={{ maxWidth: '500px' }}>
                <div className="auth-header">
                    <h2>Settings</h2>
                    <p>Configure AI Provider & Documentation</p>
                </div>

                <div className="auth-form" style={{ padding: '32px' }}>
                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="form-group">
                            <label>🔍 Documentation Crawler (Firecrawl)</label>
                            <input
                                type="password"
                                value={localFirecrawlKey}
                                onChange={(e) => setLocalFirecrawlKey(e.target.value)}
                                placeholder="fc-..."
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                Required for scraping documentation URLs. Get one at firecrawl.dev
                            </small>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="form-group">
                            <label style={{ marginBottom: '12px', display: 'block', fontWeight: 600 }}>⚡ Usage Mode</label>
                            <div className="usage-mode-toggle" style={{
                                display: 'flex',
                                background: 'var(--bg-tertiary)',
                                padding: '4px',
                                borderRadius: '10px',
                                gap: '4px',
                                marginBottom: '12px'
                            }}>
                                <button
                                    className={`mode-btn ${localUsageMode === 'trial' ? 'active' : ''}`}
                                    onClick={() => setLocalUsageMode('trial')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: localUsageMode === 'trial' ? 'var(--accent-color)' : 'transparent',
                                        color: localUsageMode === 'trial' ? 'white' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    🆓 Free Trial
                                </button>
                                <button
                                    className={`mode-btn ${localUsageMode === 'custom' ? 'active' : ''}`}
                                    onClick={() => setLocalUsageMode('custom')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: localUsageMode === 'custom' ? 'var(--accent-color)' : 'transparent',
                                        color: localUsageMode === 'custom' ? 'white' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    🔑 Custom Keys
                                </button>
                            </div>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.4'
                            }}>
                                {localUsageMode === 'trial'
                                    ? "Using shared AI keys. Limited to 10 requests per day."
                                    : "Using your own API keys. Unlimited requests (subject to your provider limits)."}
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ fontWeight: 600 }}>🤖 AI Provider</label>
                        <select
                            value={localProvider}
                            onChange={(e) => {
                                const p = e.target.value as 'gemini' | 'ollama' | 'openai';
                                setLocalProvider(p);
                                if (p === 'gemini') setLocalModel('gemini-2.5-flash');
                                if (p === 'ollama') setLocalModel('llama3');
                                if (p === 'openai') setLocalModel('gpt-4o');
                            }}
                            className="settings-select"
                        >
                            <option value="gemini">Google Gemini (Cloud)</option>
                            <option value="openai">OpenAI (GPT-4o)</option>
                            <option value="ollama">Ollama (Local)</option>
                        </select>
                    </div>

                    {localProvider === 'gemini' && (
                        <div style={{ animation: 'fadeIn 0.2s ease', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Gemini Model</label>
                                <select
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value)}
                                    className="settings-select"
                                >
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
                                    <option value="gemini-pro">Gemini Pro (Smartest)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label>API Key</label>
                                <input
                                    type="password"
                                    value={localKey}
                                    onChange={(e) => setLocalKey(e.target.value)}
                                    placeholder="AIza..."
                                    disabled={localUsageMode === 'trial'}
                                />
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                    {localUsageMode === 'trial' ? "Managed by system" : "Stored locally and never sent to our servers"}
                                </small>
                            </div>
                        </div>
                    )}

                    {localProvider === 'openai' && (
                        <div style={{ animation: 'fadeIn 0.2s ease', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>OpenAI Model</label>
                                <select
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value)}
                                    className="settings-select"
                                >
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label>OpenAI API Key</label>
                                <input
                                    type="password"
                                    value={localOpenAIKey}
                                    onChange={(e) => setLocalOpenAIKey(e.target.value)}
                                    placeholder="sk-..."
                                    disabled={localUsageMode === 'trial'}
                                />
                                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                    {localUsageMode === 'trial' ? "Managed by system" : "Stored locally and never sent to our servers"}
                                </small>
                            </div>
                        </div>
                    )}

                    {localProvider === 'ollama' && (
                        <div style={{ animation: 'fadeIn 0.2s ease', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div className="form-group">
                                <label>Local Model Name</label>
                                <input
                                    type="text"
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value)}
                                    placeholder="llama3, deepseek-coder, etc."
                                />
                            </div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginTop: '16px',
                                fontSize: '12px',
                                lineHeight: '1.6'
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--accent-color)' }}>
                                    🖥️ How to use Ollama (Free & Local)
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    <strong>1.</strong> Download & install from{' '}
                                    <span style={{ color: 'var(--accent-hover)', cursor: 'pointer', textDecoration: 'underline' }}
                                        onClick={() => window.open('https://ollama.com', '_blank')}>
                                        ollama.com
                                    </span><br />
                                    <strong>2.</strong> Run <code>ollama pull llama3</code><br />
                                    <strong>3.</strong> Start with <code>ollama serve</code><br />
                                    <strong>4.</strong> Come back here and save!
                                </div>
                            </div>
                        </div>
                    )}

                    {user && (
                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontWeight: 600 }}>👤 Account</label>
                                <button
                                    onClick={logout}
                                    style={{
                                        fontSize: '11px',
                                        color: 'var(--error-color)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Sign Out
                                </button>
                            </div>
                            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{user.username}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user.email}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="auth-actions" style={{ flexDirection: 'row', gap: '10px' }}>
                    <button className="auth-btn secondary" onClick={onClose} style={{ flex: 1 }}>
                        Cancel
                    </button>
                    <button className="auth-btn primary" onClick={handleSave} style={{ flex: 1 }}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

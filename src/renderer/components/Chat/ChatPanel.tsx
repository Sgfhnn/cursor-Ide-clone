import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useEditorStore } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage as ChatMessageType, AIAction } from '../../types';
import { aiService } from '../../services/ai/aiService';
import { buildFileTree } from '../../services/ai/contextBuilder';
import { runAgentLoop, AgentStep } from '../../services/ai/agentLoop';
import {
    VscSend, VscLightbulb, VscWand, VscNewFile,
    VscTrash, VscFiles, VscGlobe, VscSparkle, VscDebugStop,
    VscFolderOpened
} from 'react-icons/vsc';

const ChatMessage: React.FC<{ message: ChatMessageType }> = ({ message }) => {
    return (
        <div className={`chat-message ${message.role}`}>
            {message.context?.filePath && (
                <div className="chat-context">
                    📄 {message.context.filePath.split(/[/\\]/).pop()}
                    {message.context.action && ` → ${message.context.action}`}
                </div>
            )}
            <div className="chat-message-bubble">
                {message.content.split('```').map((part, i) => {
                    if (i % 2 === 1) {
                        const [, ...code] = part.split('\n');
                        return (
                            <pre key={i} className="chat-message-code">
                                <code>{code.join('\n')}</code>
                            </pre>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        </div>
    );
};

export const ChatPanel: React.FC = () => {
    const [input, setInput] = useState('');
    const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {
        messages, isLoading, addMessage, setLoading,
        setPendingChange, clearMessages, setApiKey,
        setFirecrawlKey, provider, apiKey, openAIKey, setOpenAIKey,
        contextFiles, addContextFile, removeContextFile,
        scrapedDocs, addScrapedDoc, removeScrapedDoc,
        agenticChange, setAgenticChange, usageMode, setUsageMode
    } = useChatStore();
    const { selection, openFiles, activeFilePath } = useEditorStore();
    const { rootPath } = useFileStore();
    const { incrementUsage, getRemainingRequests, isAuthenticated } = useAuthStore();

    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    const remaining = getRemainingRequests();

    // Default key to check against for quota exemption
    // Default key to check against for quota exemption
    const DEFAULT_KEY = ''; // REMOVED: User must provide their own key or set via env var

    // User is exempt from daily quota if:
    // - Using Ollama (free local)
    // - Using their own Gemini API key (not the default)
    // - Using OpenAI with their own key
    const isExempt = usageMode === 'custom' && (
        provider === 'ollama'
        || (provider === 'gemini' && !!apiKey && apiKey !== DEFAULT_KEY)
        || (provider === 'openai' && !!openAIKey)
    );

    // Set API keys on mount
    useEffect(() => {
        const localKey = localStorage.getItem('gemini_api_key');
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        console.log('[DEBUG] Keys:', {
            localKey: localKey ? 'Make ***' : 'null',
            envKey: envKey ? 'Has Value' : 'undefined',
            default: DEFAULT_KEY
        });

        const storedKey = localKey || envKey || DEFAULT_KEY;
        if (storedKey) {
            setApiKey(storedKey);
            aiService.setApiKey(storedKey);
        }
        const storedFirecrawlKey = localStorage.getItem('firecrawl_api_key') || import.meta.env.VITE_FIRECRAWL_API_KEY || '';
        if (storedFirecrawlKey) {
            setFirecrawlKey(storedFirecrawlKey);
            aiService.setFirecrawlKey(storedFirecrawlKey);
        }
        const storedOpenAIKey = localStorage.getItem('openai_api_key') || '';
        if (storedOpenAIKey) {
            setOpenAIKey(storedOpenAIKey);
            aiService.setOpenAIKey(storedOpenAIKey);
        }

        const storedMode = localStorage.getItem('usage_mode') as 'trial' | 'custom' | null;
        // FORCE MIGRATION: If usage mode is 'trial', switch to 'custom'
        if (storedMode === 'trial') {
            console.log('[MIGRATION] Switching from Trial to Custom mode');
            setUsageMode('custom');
            aiService.setUsageMode('custom');
            localStorage.setItem('usage_mode', 'custom');
        } else if (storedMode) {
            setUsageMode(storedMode);
            aiService.setUsageMode(storedMode);
        }
    }, [setApiKey, setFirecrawlKey, setOpenAIKey, setUsageMode]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleAddCurrentFile = () => {
        if (activeFilePath) {
            addContextFile(activeFilePath);
        }
    };

    const handleCrawlDocs = async () => {
        const url = window.prompt('Enter documentation URL to crawl:');
        if (!url) return;

        setLoading(true);
        try {
            const content = await aiService.scrapeUrl(url);
            addScrapedDoc(url, content);
            addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `Successfully crawled documentation from ${url}. I now have this context for your questions.`,
                timestamp: Date.now(),
            });
        } catch (error) {
            addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `Failed to crawl ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: Date.now(),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyAgenticChange = async () => {
        if (!agenticChange || !rootPath) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const rootBasename = rootPath.split(/[/\\]/).pop();

            for (const op of agenticChange.operations) {
                // Normalize path: strip redundant root folder name if AI included it
                let relativePath = op.path.replace(/^[/\\]+/, ''); // Remove leading slashes
                const pathParts = relativePath.split(/[/\\]/);

                if (pathParts[0] === rootBasename) {
                    relativePath = pathParts.slice(1).join('/');
                }

                const fullPath = `${rootPath}/${relativePath}`;
                let success = false;

                if (op.action === 'CREATE' || op.action === 'UPDATE') {
                    success = await window.electronAPI.writeFile(fullPath, op.content || '');
                } else if (op.action === 'DELETE') {
                    // Check if it's a directory or file? For now we'll try deleteFile
                    // A better way would be checking stats first, but let's try deleteFile
                    success = await window.electronAPI.deleteFile(fullPath);
                    if (!success) {
                        // Try deleteDirectory if deleteFile failed
                        success = await window.electronAPI.deleteDirectory(fullPath);
                    }
                }

                if (success) successCount++;
                else failCount++;
            }

            await useFileStore.getState().refreshFiles();

            addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `### 🚀 Action Complete\nSuccessfully applied **${successCount}** changes.${failCount > 0 ? `\n⚠️ **${failCount}** operations failed.` : ''}`,
                timestamp: Date.now(),
            });
            setAgenticChange(null);
        } catch (error) {
            console.error('Failed to apply changes:', error);
            addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: `Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: Date.now(),
            });
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (content: string, action?: AIAction) => {
        if (!content.trim() && !action) return;
        if (!isAuthenticated) return;

        // Check usage limit
        if (!incrementUsage(isExempt)) {
            addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: '⚠️ **Daily Limit Reached**\n\nYou have used your 10 free daily requests. Please try again tomorrow, or switch to Ollama (Local) / use your own API Key for unlimited access.',
                timestamp: Date.now(),
            });
            return;
        }

        const userMessage: ChatMessageType = {
            id: Date.now().toString(),
            role: 'user',
            content: action ? `[${action.toUpperCase()}] ${content || 'Selected code'}` : content,
            timestamp: Date.now(),
            context: activeFile ? {
                filePath: activeFile.path,
                selection: selection || undefined,
                action,
            } : undefined,
        };

        addMessage(userMessage);
        setInput('');
        setLoading(true);

        try {
            // Build file tree context
            const fileTree = rootPath ? await buildFileTree(rootPath, 2) : undefined;

            // Gather all context files content
            const contextFilesData = await Promise.all(
                contextFiles.map(async (path) => {
                    const fileContent = await window.electronAPI.readFile(path);
                    return { path, content: fileContent };
                })
            );

            // Include scraped docs in context
            const docsContext = scrapedDocs.map(d => `URL: ${d.url}\n\nContent:\n${d.content}`).join('\n\n---\n\n');

            const context = {
                filePath: activeFile?.path,
                language: activeFile?.language,
                code: activeFile?.content,
                selection: selection || undefined,
                fileTree: fileTree,
                additionalFiles: contextFilesData.filter(f => f.content !== null) as { path: string; content: string }[],
                message: content + (docsContext ? `\n\nReference Documentation:\n${docsContext}` : '')
            };

            let response: string;

            switch (action) {
                case 'explain':
                    response = await aiService.explainCode(context);
                    break;
                case 'refactor':
                    response = await aiService.refactorCode({ ...context, instruction: content });
                    if (selection && activeFile) {
                        const newContent = activeFile.content.replace(selection, response);
                        setPendingChange({
                            id: Date.now().toString(),
                            filePath: activeFile.path,
                            originalContent: activeFile.content,
                            newContent,
                            description: 'Refactored code',
                        });
                        response = 'Refactored code ready. Review the diff to apply changes.';
                    }
                    break;
                case 'generate':
                    response = await aiService.generateFile({ ...context, prompt: content });
                    if (activeFile) {
                        setPendingChange({
                            id: Date.now().toString(),
                            filePath: activeFile.path,
                            originalContent: activeFile.content,
                            newContent: response,
                            description: 'Generated code',
                        });
                        response = 'Code generated. Review the diff to apply changes.';
                    }
                    break;
                case 'fix':
                    response = await aiService.fixBug({ ...context, error: content });
                    if (activeFile) {
                        setPendingChange({
                            id: Date.now().toString(),
                            filePath: activeFile.path,
                            originalContent: activeFile.content,
                            newContent: response,
                            description: 'Bug fix applied',
                        });
                        response = 'Bug fix ready. Review the diff to apply changes.';
                    }
                    break;
                default: {
                    // Check if user wants autonomous mode (keywords trigger agent loop)
                    const agentKeywords = [
                        'install', 'create a', 'build', 'set up', 'setup', 'init', 'scaffold',
                        'run', 'fix the', 'deploy', 'npm', 'git', 'mkdir', 'touch', 'generate',
                        'start the app', 'open preview', 'preview the app'
                    ];
                    const isAgentRequest = rootPath && (
                        agentKeywords.some(kw => content.toLowerCase().includes(kw)) ||
                        content.toLowerCase().startsWith('/') // Command-like prefix
                    );

                    if (isAgentRequest) {
                        // Use the autonomous agent loop
                        setIsAgentRunning(true);
                        setAgentSteps([]);
                        const controller = new AbortController();
                        abortControllerRef.current = controller;

                        try {
                            const result = await runAgentLoop({
                                message: content,
                                context,
                                rootPath: rootPath!,
                                maxIterations: 5,
                                abortSignal: controller.signal,
                                onStep: (step) => {
                                    setAgentSteps(prev => {
                                        const existing = prev.findIndex(s => s.id === step.id);
                                        if (existing >= 0) {
                                            const updated = [...prev];
                                            updated[existing] = step;
                                            return updated;
                                        }
                                        return [...prev, step];
                                    });
                                }
                            });
                            response = result.finalResponse;

                            // Show agent steps summary
                            const toolSteps = result.steps.filter(s => s.type === 'tool_call');
                            if (toolSteps.length > 0) {
                                const stepsSummary = toolSteps.map(s =>
                                    `- **${s.tool}**: \`${s.input}\` → ${s.status === 'done' ? '✅' : '❌'}`
                                ).join('\n');
                                response = `### 🤖 Agent Actions\n${stepsSummary}\n\n---\n\n${response}`;
                            }
                        } finally {
                            setIsAgentRunning(false);
                            abortControllerRef.current = null;
                        }
                    } else {
                        response = await aiService.chat(content, context);
                    }
                }
            }

            addMessage({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
            });

            // Check for agentic file operations
            const operations = aiService.parseAgenticFiles(response);
            if (operations && operations.length > 0) {
                setAgenticChange({
                    id: Date.now().toString(),
                    operations,
                    description: 'Suggested multi-file changes',
                    timestamp: Date.now(),
                });
            }
        } catch (error) {
            addMessage({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                timestamp: Date.now(),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <h2>AI Assistant</h2>
                {isAuthenticated && (
                    <div
                        className={`usage-badge ${!isExempt && remaining === 0 ? 'limit-reached' : !isExempt && remaining <= 3 ? 'warning' : ''} ${isExempt ? 'unlimited' : ''}`}
                        title={isExempt ? "Unlimited Usage" : "Daily Requests Remaining"}
                    >
                        {isExempt ? (
                            <>
                                {provider === 'ollama' ? '🦙 Ollama Local' : '⚡ Unlimited'}
                            </>
                        ) : (
                            <>{remaining}/10 requests</>
                        )}
                    </div>
                )}
                <button className="btn-icon" onClick={clearMessages} title="Clear chat">
                    <VscTrash size={16} />
                </button>
            </div>

            {rootPath && (
                <div className="workspace-indicator">
                    <VscFolderOpened size={12} />
                    <span>Working in: <code>{rootPath.split(/[/\\]/).pop()}</code></span>
                    <small>({rootPath})</small>
                </div>
            )}

            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                        <p>Ask me anything about your code!</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>
                            Select code and use the action buttons below.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
                )}
                {isLoading && (
                    <div className="thinking-indicator">
                        <div className="thinking-pulser" />
                        <span>{isAgentRunning ? 'Agent is working...' : 'AI is thinking...'}</span>
                    </div>
                )}

                {/* Agent Steps Indicator */}
                {isAgentRunning && agentSteps.length > 0 && (
                    <div className="agent-steps">
                        {agentSteps.filter(s => s.type === 'tool_call').map((step) => (
                            <div key={step.id} className={`agent-step ${step.status}`}>
                                <span className="agent-step-icon">
                                    {step.status === 'running' ? '⏳' : step.status === 'done' ? '✅' : '❌'}
                                </span>
                                <span className="agent-step-tool">{step.tool}</span>
                                <code className="agent-step-input">{step.input}</code>
                                {step.output && (
                                    <pre className="agent-step-output">{step.output.substring(0, 200)}{step.output.length > 200 ? '...' : ''}</pre>
                                )}
                            </div>
                        ))}
                        <button
                            className="agent-stop-btn"
                            onClick={() => abortControllerRef.current?.abort()}
                            title="Stop agent"
                        >
                            <VscDebugStop size={12} /> Stop Agent
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                {(contextFiles.length > 0 || scrapedDocs.length > 0) && (
                    <div className="context-chips">
                        {contextFiles.map((path) => (
                            <div key={path} className="context-chip">
                                📄 <span>{path.split(/[/\\]/).pop()}</span>
                                <VscTrash
                                    size={10}
                                    onClick={() => removeContextFile(path)}
                                    className="remove-chip"
                                />
                            </div>
                        ))}
                        {scrapedDocs.map((doc) => (
                            <div key={doc.url} className="context-chip doc">
                                🌐 <span>{new URL(doc.url).hostname}</span>
                                <VscTrash
                                    size={10}
                                    onClick={() => removeScrapedDoc(doc.url)}
                                    className="remove-chip"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Agentic Action Center */}
                {agenticChange && (
                    <div className="agentic-action-center">
                        <div className="agentic-header">
                            <VscSparkle className="pulse" />
                            <span>AI Proposing {agenticChange.operations.length} Changes</span>
                        </div>
                        <div className="agentic-list">
                            {agenticChange.operations.map((op, idx) => (
                                <div key={idx} className="agentic-item">
                                    <span className={`op-badge ${op.action.toLowerCase()}`}>{op.action}</span>
                                    <span className="op-path">{op.path.split('/').pop()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="agentic-footer">
                            <button className="reject-btn" onClick={() => setAgenticChange(null)}>Reject All</button>
                            <button className="apply-btn" onClick={() => handleApplyAgenticChange()}>Apply All Changes</button>
                        </div>
                    </div>
                )}

                <div className="chat-actions">
                    <button
                        className="chat-action-btn"
                        onClick={handleAddCurrentFile}
                        disabled={!activeFilePath || contextFiles.includes(activeFilePath)}
                        title="Add current file to context"
                    >
                        <VscFiles size={12} /> + Context
                    </button>
                    <button
                        className="chat-action-btn"
                        onClick={handleCrawlDocs}
                        disabled={isLoading}
                        title="Crawl documentation URL"
                    >
                        <VscGlobe size={12} /> + Docs
                    </button>
                    <button
                        className="chat-action-btn"
                        onClick={() => sendMessage('', 'explain')}
                        disabled={(!selection && !activeFile) || isLoading}
                    >
                        <VscLightbulb size={12} /> Explain
                    </button>
                    <button
                        className="chat-action-btn"
                        onClick={() => sendMessage(input || 'Improve this code', 'refactor')}
                        disabled={(!selection && !activeFile) || isLoading}
                    >
                        <VscWand size={12} /> Refactor
                    </button>
                    <button
                        className="chat-action-btn"
                        onClick={() => sendMessage(input, 'generate')}
                        disabled={!input || isLoading}
                    >
                        <VscNewFile size={12} /> Generate
                    </button>
                </div>

                <div className="chat-input-wrapper">
                    <textarea
                        className="chat-input"
                        placeholder="Ask about your code..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading}
                    >
                        <VscSend size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;

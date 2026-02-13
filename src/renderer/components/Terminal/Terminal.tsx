import React, { useState, useEffect, useRef } from 'react';
import { VscTerminal, VscClearAll, VscClose } from 'react-icons/vsc';

interface TerminalLine {
    id: string;
    type: 'input' | 'output' | 'error';
    content: string;
    timestamp: number;
}

export const Terminal: React.FC = () => {
    const [lines, setLines] = useState<TerminalLine[]>([{
        id: '0',
        type: 'output',
        content: 'Welcome to Cursor Clone Terminal\nType commands and press Enter to execute.',
        timestamp: Date.now(),
    }]);
    const [input, setInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [cwd, setCwd] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Get initial current working directory
        if (window.electronAPI?.getCwd) {
            window.electronAPI.getCwd().then(setCwd);
        }
    }, []);

    useEffect(() => {
        // Scroll to bottom when new lines are added
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines]);

    const executeCommand = async () => {
        if (!input.trim() || isRunning) return;

        const commandLine: TerminalLine = {
            id: Date.now().toString(),
            type: 'input',
            content: `${cwd || '>'} ${input}`,
            timestamp: Date.now(),
        };
        setLines(prev => [...prev, commandLine]);

        const command = input;
        setInput('');
        setIsRunning(true);

        try {
            if (window.electronAPI?.executeCommand) {
                const result = await window.electronAPI.executeCommand(command, cwd);

                if (result.stdout) {
                    setLines(prev => [...prev, {
                        id: Date.now().toString() + '-out',
                        type: 'output',
                        content: result.stdout,
                        timestamp: Date.now(),
                    }]);
                }

                if (result.stderr) {
                    setLines(prev => [...prev, {
                        id: Date.now().toString() + '-err',
                        type: 'error',
                        content: result.stderr,
                        timestamp: Date.now(),
                    }]);
                }

                // Update cwd if command was cd
                if (command.startsWith('cd ') && result.cwd) {
                    setCwd(result.cwd);
                }
            } else {
                setLines(prev => [...prev, {
                    id: Date.now().toString() + '-err',
                    type: 'error',
                    content: 'Terminal API not available. Please restart the app.',
                    timestamp: Date.now(),
                }]);
            }
        } catch (error) {
            setLines(prev => [...prev, {
                id: Date.now().toString() + '-err',
                type: 'error',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: Date.now(),
            }]);
        } finally {
            setIsRunning(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeCommand();
        }
    };

    const clearTerminal = () => {
        setLines([{
            id: Date.now().toString(),
            type: 'output',
            content: 'Terminal cleared.',
            timestamp: Date.now(),
        }]);
    };

    if (!isVisible) {
        return (
            <div className="terminal-collapsed" onClick={() => setIsVisible(true)}>
                <VscTerminal size={16} />
                <span>Terminal</span>
            </div>
        );
    }

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <div className="terminal-title">
                    <VscTerminal size={14} />
                    <span>Terminal</span>
                    <span className="terminal-cwd">{cwd}</span>
                </div>
                <div className="terminal-actions">
                    <button className="btn-icon" onClick={clearTerminal} title="Clear">
                        <VscClearAll size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => setIsVisible(false)} title="Minimize">
                        <VscClose size={14} />
                    </button>
                </div>
            </div>
            <div className="terminal-output" ref={outputRef}>
                {lines.map(line => (
                    <div key={line.id} className={`terminal-line ${line.type}`}>
                        <pre>{line.content}</pre>
                    </div>
                ))}
            </div>
            <div className="terminal-input-row">
                <span className="terminal-prompt">{cwd || '>'}</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="terminal-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRunning ? 'Running...' : 'Enter command...'}
                    disabled={isRunning}
                    autoFocus
                />
            </div>
        </div>
    );
};

export default Terminal;

import * as React from 'react';
import { useRef, useCallback, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useChatStore } from '../../store/chatStore';
import type * as Monaco from 'monaco-editor';
import { OpenFile } from '../../types';
import { registerGhostText } from '../../services/ai/ghostText';
import { QuickEditWidget } from './QuickEditWidget';

export const MonacoEditor: React.FC = () => {
    const { openFiles, activeFilePath, updateFileContent, setSelection } = useEditorStore();
    const { setPendingChange } = useChatStore();
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const [quickEditPos, setQuickEditPos] = useState<{ top: number; left: number } | null>(null);

    const activeFile = openFiles.find((f: OpenFile) => f.path === activeFilePath);

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Register Ghost Text Provider
        registerGhostText(monaco);

        // Add Command for Quick Edit (Cmd+K)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            const position = editor.getPosition();
            if (position) {
                const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);
                if (scrolledVisiblePosition) {
                    const domNode = editor.getDomNode();
                    const rect = domNode?.getBoundingClientRect();

                    if (rect) {
                        setQuickEditPos({
                            top: rect.top + scrolledVisiblePosition.top + 20,
                            left: rect.left + scrolledVisiblePosition.left
                        });
                    }
                }
            }
        });

        // Listen for selection changes
        editor.onDidChangeCursorSelection((e: Monaco.editor.ICursorSelectionChangedEvent) => {
            const selection = editor.getModel()?.getValueInRange(e.selection);
            setSelection(selection || null);
        });
    };

    const handleChange: OnChange = useCallback(
        (value: string | undefined) => {
            if (activeFilePath && value !== undefined) {
                updateFileContent(activeFilePath, value);
            }
        },
        [activeFilePath, updateFileContent]
    );

    const handleCloseQuickEdit = () => setQuickEditPos(null);

    if (!activeFile) {
        return (
            <div className="editor-empty">
                <h3>No file open</h3>
                <p>Open a file from the explorer to start editing</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Editor
                key={activeFile.path}
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                theme="vs-dark"
                onChange={handleChange}
                onMount={handleEditorMount}
                options={{
                    fontSize: 14,
                    fontFamily: "'Consolas', 'Courier New', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    padding: { top: 10 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                }}
            />
            {quickEditPos && (
                <QuickEditWidget
                    position={quickEditPos}
                    onClose={handleCloseQuickEdit}
                />
            )}
        </div>
    );
};

export default MonacoEditor;

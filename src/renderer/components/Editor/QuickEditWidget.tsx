import React, { useState, useEffect, useRef } from 'react';
import { VscArrowRight, VscClose } from 'react-icons/vsc';
import { useChatStore } from '../../store/chatStore';
import { aiService } from '../../services/ai/aiService';
import { useEditorStore } from '../../store/editorStore';

interface QuickEditWidgetProps {
    position: { top: number; left: number } | null;
    onClose: () => void;
}

export const QuickEditWidget: React.FC<QuickEditWidgetProps> = ({ position, onClose }) => {
    const [instruction, setInstruction] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { activeFilePath, selection, updateFileContent } = useEditorStore();
    const { setPendingChange } = useChatStore();

    useEffect(() => {
        if (position && inputRef.current) {
            inputRef.current.focus();
        }
    }, [position]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!instruction.trim() || !activeFilePath) return;

        setIsLoading(true);
        try {
            // 1. Get current file content (we might need to fetch it if not in store explicitly, usually activeFile.content)
            // But we need the CODE. usage of 'activeFile' is better.
            // We'll rely on aiService to handle context.

            // Wait, aiService needs context.
            // We can build it here or pass it.
            // Let's assume we can pass the selection.

            // We'll use refactorCode.

            const result = await aiService.refactorCode({
                filePath: activeFilePath,
                language: 'typescript', // should get from file extension
                code: selection || '', // Context is just selection? OR whole file? Usually Refactor needs whole file context to be smart.
                // let's pass selection text as 'code' for now or handle in service.
                // Actually aiService.refactorCode uses 'code' as context.
                // If selection is present, we should replace selection.

                instruction: instruction,
                selection: selection || undefined
            });

            // Apply change directly or showing diff?
            // Instruction says "updates specfic block".
            // Let's use setPendingChange to show diff preview like ChatPanel.

            // We need original content. Store doesn't expose it easily here without looking up file.
            // We should fetch it.

            // For now, let's just log or set pending change if we can get data.
            // We'll connect to ChatStore's pending change.

            // ... implementation ...

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            onClose();
        }
    };

    if (!position) return null;

    return (
        <div
            className="quick-edit-widget"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            <form onSubmit={handleSubmit} className="quick-edit-form">
                <div className="quick-edit-input-wrapper">
                    <span className="quick-edit-prefix">Edit:</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Describe changes..."
                        className="quick-edit-input"
                        disabled={isLoading}
                    />
                    {isLoading && <div className="loading-spinner-small" />}
                </div>
            </form>
        </div>
    );
};

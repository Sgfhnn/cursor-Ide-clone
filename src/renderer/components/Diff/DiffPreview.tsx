import React from 'react';
import { useChatStore } from '../../store/chatStore';
import { useEditorStore } from '../../store/editorStore';
import { diffEngine } from '../../services/diff/diffEngine';
import { VscCheck, VscClose } from 'react-icons/vsc';

export const DiffPreview: React.FC = () => {
    const { pendingChange, setPendingChange } = useChatStore();
    const { updateFileContent, markFileDirty } = useEditorStore();

    if (!pendingChange) return null;

    const diffChanges = diffEngine.generateDiff(
        pendingChange.originalContent,
        pendingChange.newContent
    );

    const handleAccept = async () => {
        // Write the new content to file
        const success = await window.electronAPI.writeFile(
            pendingChange.filePath,
            pendingChange.newContent
        );

        if (success) {
            // Update editor content
            updateFileContent(pendingChange.filePath, pendingChange.newContent);
            markFileDirty(pendingChange.filePath, false);
        }

        setPendingChange(null);
    };

    const handleReject = () => {
        setPendingChange(null);
    };

    return (
        <>
            <div className="diff-overlay" onClick={handleReject} />
            <div className="diff-preview">
                <div className="diff-header">
                    <h3>{pendingChange.description}</h3>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {pendingChange.filePath.split(/[/\\]/).pop()}
                    </span>
                </div>

                <div className="diff-content">
                    {diffChanges.map((change, index) => (
                        <div
                            key={index}
                            className={`diff-line ${change.type}`}
                        >
                            <span style={{
                                display: 'inline-block',
                                width: '20px',
                                color: 'var(--text-muted)',
                                marginRight: '8px'
                            }}>
                                {change.type === 'added' && '+'}
                                {change.type === 'removed' && '-'}
                                {change.type === 'unchanged' && ' '}
                            </span>
                            {change.value}
                        </div>
                    ))}
                </div>

                <div className="diff-actions">
                    <button className="diff-btn reject" onClick={handleReject}>
                        <VscClose size={14} style={{ marginRight: '6px' }} />
                        Reject
                    </button>
                    <button className="diff-btn accept" onClick={handleAccept}>
                        <VscCheck size={14} style={{ marginRight: '6px' }} />
                        Accept Changes
                    </button>
                </div>
            </div>
        </>
    );
};

export default DiffPreview;

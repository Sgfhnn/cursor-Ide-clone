import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { VscClose } from 'react-icons/vsc';

export const EditorTabs: React.FC = () => {
    const { openFiles, activeFilePath, setActiveFile, closeFile, markFileDirty, pinFile } = useEditorStore();

    const handleSave = async (path: string) => {
        const file = openFiles.find((f) => f.path === path);
        if (file && file.isDirty) {
            const success = await window.electronAPI.writeFile(path, file.content);
            if (success) {
                markFileDirty(path, false);
            }
        }
    };

    // Save on Ctrl+S
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeFilePath) {
                    handleSave(activeFilePath);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFilePath, openFiles]);

    if (openFiles.length === 0) {
        return <div className="editor-tabs" />;
    }

    return (
        <div className="editor-tabs">
            {openFiles.map((file) => (
                <div
                    key={file.path}
                    className={`editor-tab ${file.path === activeFilePath ? 'active' : ''} ${!file.isPinned ? 'preview' : ''}`}
                    onClick={() => setActiveFile(file.path)}
                    onDoubleClick={() => pinFile(file.path)}
                    title={!file.isPinned ? "Double-click to pin" : file.path}
                >
                    <span className="editor-tab-name">
                        {file.isDirty && <span style={{ color: 'var(--warning-color)' }}>● </span>}
                        {file.name}
                    </span>
                    <span
                        className="editor-tab-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeFile(file.path);
                        }}
                    >
                        <VscClose size={14} />
                    </span>
                </div>
            ))}
        </div>
    );
};

export default EditorTabs;

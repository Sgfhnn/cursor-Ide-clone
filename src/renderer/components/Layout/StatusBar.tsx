import React from 'react';
import { useFileStore } from '../../store/fileStore';
import { usePreviewStore } from '../../store/previewStore';
import { VscFolderOpened, VscBrowser } from 'react-icons/vsc';

export const StatusBar: React.FC = () => {
    const { rootPath } = useFileStore();
    const { isVisible, toggleVisible } = usePreviewStore();

    return (
        <div className="status-bar">
            <div className="status-bar-item">
                {rootPath && (
                    <>
                        <VscFolderOpened size={14} />
                        <span>{rootPath}</span>
                    </>
                )}
            </div>
            <div className="status-bar-item" style={{ flex: 1, justifyContent: 'center' }}>
                <button
                    className={`status-btn ${isVisible ? 'active' : ''}`}
                    onClick={toggleVisible}
                    title="Toggle Live Preview"
                >
                    <VscBrowser size={14} />
                    <span>Live Preview</span>
                </button>
            </div>
            <div className="status-bar-item">
                <span>Cursor Clone</span>
            </div>
        </div>
    );
};

export default StatusBar;

import React from 'react';
import { useFileStore } from '../../store/fileStore';
import { useAuthStore } from '../../store/authStore';
import FileTree from '../FileExplorer/FileTree';
import { VscFiles, VscFolderOpened, VscAccount, VscSignOut, VscSettingsGear } from 'react-icons/vsc';

interface SidebarProps {
    onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
    const { rootPath, setRootPath } = useFileStore();
    const { user, logout, isAuthenticated } = useAuthStore();

    const handleOpenFolder = async () => {
        console.log('Open folder button clicked');
        if (!window.electronAPI) {
            console.error('electronAPI is not available on window');
            return;
        }
        try {
            const path = await window.electronAPI.openFolder();
            console.log('Selected path:', path);
            if (path) {
                setRootPath(path);
            }
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>Explorer</h2>
                <button className="btn-icon" onClick={handleOpenFolder} title="Open Folder">
                    <VscFolderOpened size={16} />
                </button>
            </div>
            <div className="sidebar-content">
                {rootPath ? (
                    <FileTree />
                ) : (
                    <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <VscFiles size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>No folder opened</p>
                        <button
                            onClick={handleOpenFolder}
                            style={{
                                marginTop: '12px',
                                padding: '8px 16px',
                                background: 'var(--accent-color)',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Open Folder
                        </button>
                    </div>
                )}
            </div>

            <div style={{
                padding: '12px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {isAuthenticated && user ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <VscAccount size={14} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {user.username}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                className="btn-icon"
                                onClick={onOpenSettings}
                                title="Settings"
                            >
                                <VscSettingsGear size={14} />
                            </button>
                            <button
                                className="btn-icon"
                                onClick={logout}
                                title="Sign Out"
                            >
                                <VscSignOut size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            className="btn-icon"
                            onClick={onOpenSettings}
                            title="Settings"
                            style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                        >
                            <VscSettingsGear size={14} />
                            <span>Settings</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;

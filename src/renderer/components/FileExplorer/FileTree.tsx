import React, { useEffect, useState } from 'react';
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';
import { FileEntry } from '../../types';
import { VscFolder, VscFolderOpened, VscFile, VscChevronRight, VscChevronDown } from 'react-icons/vsc';

// Get language from file extension
function getLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        rs: 'rust',
        go: 'go',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        h: 'c',
        hpp: 'cpp',
        css: 'css',
        scss: 'scss',
        html: 'html',
        json: 'json',
        md: 'markdown',
        yaml: 'yaml',
        yml: 'yaml',
        xml: 'xml',
        sql: 'sql',
        sh: 'shell',
        bash: 'shell',
        ps1: 'powershell',
    };
    return langMap[ext] || 'plaintext';
}

interface FileNodeProps {
    entry: FileEntry;
    depth: number;
}

const FileNode: React.FC<FileNodeProps> = ({ entry, depth }) => {
    const { toggleDir, isExpanded } = useFileStore();
    const { openFile, activeFilePath } = useEditorStore();
    const [children, setChildren] = useState<FileEntry[]>([]);
    const expanded = isExpanded(entry.path);

    useEffect(() => {
        if (entry.isDirectory && expanded) {
            window.electronAPI.readDirectory(entry.path).then(setChildren);
        }
    }, [entry.path, entry.isDirectory, expanded]);

    const handleClick = async () => {
        if (entry.isDirectory) {
            toggleDir(entry.path);
        } else {
            const content = await window.electronAPI.readFile(entry.path);
            if (content !== null) {
                // Single click = preview (false)
                openFile({
                    path: entry.path,
                    name: entry.name,
                    content,
                    language: getLanguage(entry.name),
                    isDirty: false,
                    isPinned: false
                }, false);
            }
        }
    };

    const handleDoubleClick = async () => {
        if (!entry.isDirectory) {
            const content = await window.electronAPI.readFile(entry.path);
            if (content !== null) {
                // Double click = pin (true)
                openFile({
                    path: entry.path,
                    name: entry.name,
                    content,
                    language: getLanguage(entry.name),
                    isDirty: false,
                    isPinned: true
                }, true);
            }
        }
    };

    const isActive = activeFilePath === entry.path;

    return (
        <div className="file-node-wrapper">
            <div
                className={`file-node ${entry.isDirectory ? 'directory' : ''} ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
            >
                {entry.isDirectory && (
                    <span className="file-node-icon">
                        {expanded ? <VscChevronDown size={16} /> : <VscChevronRight size={16} />}
                    </span>
                )}
                <span className="file-node-icon">
                    {entry.isDirectory ? (
                        expanded ? <VscFolderOpened size={16} color="#dcb67a" /> : <VscFolder size={16} color="#dcb67a" />
                    ) : (
                        <VscFile size={16} color="#519aba" />
                    )}
                </span>
                <span className="file-node-name">{entry.name}</span>
            </div>
            {entry.isDirectory && expanded && children.length > 0 && (
                <div className="file-node-children">
                    {children
                        .sort((a, b) => {
                            if (a.isDirectory && !b.isDirectory) return -1;
                            if (!a.isDirectory && b.isDirectory) return 1;
                            return a.name.localeCompare(b.name);
                        })
                        .map((child) => (
                            <FileNode key={child.path} entry={child} depth={depth + 1} />
                        ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC = () => {
    const { rootPath, files, setFiles } = useFileStore();

    useEffect(() => {
        if (rootPath) {
            window.electronAPI.readDirectory(rootPath).then(setFiles);
        }
    }, [rootPath, setFiles]);

    if (!rootPath) {
        return (
            <div className="file-tree" style={{ padding: '12px', color: 'var(--text-muted)' }}>
                No folder opened
            </div>
        );
    }

    return (
        <div className="file-tree">
            {files
                .sort((a, b) => {
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                })
                .map((entry) => (
                    <FileNode key={entry.path} entry={entry} depth={0} />
                ))}
        </div>
    );
};

export default FileTree;

// Context builder for AI - builds a summary of the codebase structure
import { FileEntry } from '../../types';

interface CodebaseContext {
    fileTree: string;
    openFiles: string[];
    currentFile: {
        path: string;
        language: string;
        content: string;
    } | null;
    selection: string | null;
}

// Build a text representation of the file tree
export async function buildFileTree(rootPath: string, maxDepth: number = 3): Promise<string> {
    if (!rootPath || !window.electronAPI) {
        return 'No folder opened';
    }

    const lines: string[] = [];
    const rootName = rootPath.split(/[/\\]/).pop() || rootPath;
    lines.push(`📁 ${rootName}/`);

    await traverseDirectory(rootPath, lines, 1, maxDepth);

    return lines.join('\n');
}

async function traverseDirectory(
    dirPath: string,
    lines: string[],
    depth: number,
    maxDepth: number
): Promise<void> {
    if (depth > maxDepth) {
        lines.push(`${'  '.repeat(depth)}...`);
        return;
    }

    try {
        const entries: FileEntry[] = await window.electronAPI.readDirectory(dirPath);

        // Sort: directories first, then files, alphabetically
        entries.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        // Filter out common non-essential directories
        const filtered = entries.filter(e =>
            !['node_modules', '.git', 'dist', '.next', '__pycache__', '.cache', 'build'].includes(e.name)
        );

        for (const entry of filtered) {
            const prefix = '  '.repeat(depth);
            if (entry.isDirectory) {
                lines.push(`${prefix}📁 ${entry.name}/`);
                await traverseDirectory(entry.path, lines, depth + 1, maxDepth);
            } else {
                const icon = getFileIcon(entry.name);
                lines.push(`${prefix}${icon} ${entry.name}`);
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

function getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
        ts: '📘',
        tsx: '📘',
        js: '📒',
        jsx: '📒',
        json: '📋',
        css: '🎨',
        scss: '🎨',
        html: '🌐',
        md: '📝',
        py: '🐍',
        rs: '🦀',
        go: '🔷',
        java: '☕',
    };
    return iconMap[ext] || '📄';
}

// Build complete context for AI
export async function buildCodebaseContext(
    rootPath: string | null,
    openFiles: { path: string; language: string; content: string }[],
    activeFilePath: string | null,
    selection: string | null
): Promise<CodebaseContext> {
    const fileTree = rootPath ? await buildFileTree(rootPath) : 'No folder opened';

    const activeFile = openFiles.find(f => f.path === activeFilePath);

    return {
        fileTree,
        openFiles: openFiles.map(f => f.path),
        currentFile: activeFile ? {
            path: activeFile.path,
            language: activeFile.language,
            content: activeFile.content,
        } : null,
        selection,
    };
}

// Format context for AI prompt
export function formatContextForAI(context: CodebaseContext): string {
    const parts: string[] = [];

    parts.push('=== PROJECT STRUCTURE ===');
    parts.push(context.fileTree);
    parts.push('');

    if (context.openFiles.length > 0) {
        parts.push('=== OPEN FILES ===');
        context.openFiles.forEach(f => parts.push(`- ${f.split(/[/\\]/).pop()}`));
        parts.push('');
    }

    if (context.currentFile) {
        parts.push('=== CURRENT FILE ===');
        parts.push(`File: ${context.currentFile.path}`);
        parts.push(`Language: ${context.currentFile.language}`);
        parts.push('');
        parts.push('```' + context.currentFile.language);
        parts.push(context.currentFile.content);
        parts.push('```');
    }

    if (context.selection) {
        parts.push('');
        parts.push('=== SELECTED CODE ===');
        parts.push('```' + (context.currentFile?.language || ''));
        parts.push(context.selection);
        parts.push('```');
    }

    return parts.join('\n');
}

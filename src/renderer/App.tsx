import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import StatusBar from './components/Layout/StatusBar';
import MonacoEditor from './components/Editor/MonacoEditor';
import EditorTabs from './components/Editor/EditorTabs';
import ChatPanel from './components/Chat/ChatPanel';
import LivePreview from './components/Preview/LivePreview';
import DiffPreview from './components/Diff/DiffPreview';
import Terminal from './components/Terminal/Terminal';
import { AuthModal } from './components/Auth/AuthModal';
import { SettingsModal } from './components/Settings/SettingsModal';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="app-container">
            <div className="main-content">
                <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
                <div className="editor-area">
                    <EditorTabs />
                    <div className="editor-content">
                        <MonacoEditor />
                    </div>
                </div>
                <ChatPanel />
                <LivePreview />
            </div>
            <Terminal />
            <StatusBar />
            <DiffPreview />
            <AuthModal />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default App;

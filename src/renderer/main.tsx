import React from 'react';
import ReactDOM from 'react-dom/client';
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import App from './App';
import './styles/globals.css';
import './styles/terminal.css';
import './styles/auth.css';
import './styles/settings.css';
import './styles/quick-edit.css';

// Configure Monaco Editor to use local instance instead of CDN
// This avoids CSP issues in Electron
loader.config({ monaco });

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

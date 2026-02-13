import React, { useState, useEffect } from 'react';
import { usePreviewStore } from '../../store/previewStore';
import { VscRefresh, VscLinkExternal, VscChromeClose, VscBrowser } from 'react-icons/vsc';

export const LivePreview: React.FC = () => {
    const { isVisible, url, setUrl, toggleVisible, setVisible } = usePreviewStore();
    const [inputUrl, setInputUrl] = useState(url);
    const [iframeKey, setIframeKey] = useState(0);

    // Sync inputUrl when store url changes
    useEffect(() => {
        setInputUrl(url);
    }, [url]);

    // Handle open-preview event from Agent Loop
    useEffect(() => {
        const handleOpenPreview = (e: any) => {
            const newUrl = e.detail.url;
            if (newUrl) setUrl(newUrl);
            setVisible(true);
        };
        window.addEventListener('open-preview', handleOpenPreview);
        return () => window.removeEventListener('open-preview', handleOpenPreview);
    }, [setUrl, setVisible]);

    if (!isVisible) return null;

    const handleRefresh = () => {
        setIframeKey(prev => prev + 1);
    };

    const handleNavigate = () => {
        setUrl(inputUrl);
        setIframeKey(prev => prev + 1);
    };

    const handleOpenExternal = () => {
        window.open(url, '_blank');
    };

    return (
        <div className="live-preview-panel">
            <div className="preview-header">
                <div className="preview-title">
                    <VscBrowser size={14} />
                    <span>Preview</span>
                </div>
                <div className="preview-address-bar">
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder="http://localhost:3000"
                    />
                </div>
                <div className="preview-actions">
                    <button onClick={handleRefresh} title="Refresh">
                        <VscRefresh size={14} />
                    </button>
                    <button onClick={handleOpenExternal} title="Open in Browser">
                        <VscLinkExternal size={14} />
                    </button>
                    <button onClick={toggleVisible} title="Close Preview">
                        <VscChromeClose size={14} />
                    </button>
                </div>
            </div>
            <div className="preview-body">
                <iframe
                    key={iframeKey}
                    id="preview-iframe"
                    src={url}
                    title="Live Preview"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
            </div>
        </div>
    );
};

export default LivePreview;

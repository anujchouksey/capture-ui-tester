import React, { useEffect, useState } from 'react';
import { AppSettings, CapturedElement, GeneratedCode } from '../domain/types';
import { LLMServiceFactory } from '../services/LLMService';
import { SettingsRepository } from '../services/SettingsRepository';
import { Button } from './components/Button';
import { ElementList } from './features/ElementList';
import { SettingsForm } from './features/SettingsForm';

export const App = () => {
    const [view, setView] = useState<'capture' | 'settings'>('capture');
    const [elements, setElements] = useState<CapturedElement[]>([]);
    const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [loadingCode, setLoadingCode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for messages from content script
        const messageListener = (message: any) => {
            if (message.type === 'ELEMENT_CAPTURED') {
                setElements(prev => [...prev, message.payload]);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, []);

    const handleStartCapture = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            setIsCapturing(true);
            // Send message to content script
            await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
            window.close(); // Optional: close panel if it was a popup, but for sidepanel we keep it open.
            // Actually for sidepanel, we just want to signal the content script.
        }
    };

    const handleStopCapture = async () => {
        setIsCapturing(false);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' });
        }
    };

    const handleGenerate = async () => {
        setLoadingCode(true);
        setError(null);
        try {
            const settings = await SettingsRepository.load();
            const provider = LLMServiceFactory.getProvider(settings);
            const result = await provider.generateCode(elements, settings);
            setGeneratedCode(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate code');
        } finally {
            setLoadingCode(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode.code);
        }
    };

    return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Header */}
            <header className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Capture UI
                </h1>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView(view === 'capture' ? 'settings' : 'capture')}
                >
                    {view === 'capture' ? '⚙️ Settings' : '← Back'}
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 overflow-y-auto">
                {view === 'settings' ? (
                    <SettingsForm onSave={() => setView('capture')} />
                ) : (
                    <div className="space-y-4">
                        {/* Action Bar */}
                        <div className="flex gap-2">
                            {!isCapturing ? (
                                <Button onClick={handleStartCapture} className="flex-1">
                                    Start Capture
                                </Button>
                            ) : (
                                <Button onClick={handleStopCapture} variant="danger" className="flex-1 animate-pulse">
                                    Stop Capture
                                </Button>
                            )}
                        </div>

                        <ElementList
                            elements={elements}
                            onRemove={(id) => setElements(prev => prev.filter(e => e.id !== id))}
                            onClear={() => { setElements([]); setGeneratedCode(null); }}
                        />

                        {elements.length > 0 && (
                            <Button
                                onClick={handleGenerate}
                                disabled={loadingCode}
                                className="w-full"
                                variant="secondary"
                            >
                                {loadingCode ? 'Generating...' : 'Generate Code'}
                            </Button>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                                {error}
                            </div>
                        )}

                        {generatedCode && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-slate-800">Generated Code ({generatedCode.language})</h3>
                                    <Button size="sm" variant="ghost" onClick={copyToClipboard}>Copy</Button>
                                </div>
                                <pre className="p-3 bg-slate-900 text-slate-50 text-xs rounded-md overflow-x-auto font-mono">
                                    {generatedCode.code}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

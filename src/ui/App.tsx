import React, { useEffect, useState } from 'react';
import { AppSettings, CapturedElement, GeneratedCode, CapturedRequest } from '../domain/types';
import { LLMServiceFactory } from '../services/LLMService';
import { SettingsRepository } from '../services/SettingsRepository';
import { Button } from './components/Button';
import { ElementList } from './features/ElementList';
import { SettingsForm } from './features/SettingsForm';
import { NetworkList } from './features/NetworkList';

export const App = () => {
    const [view, setView] = useState<'capture' | 'settings'>('capture');
    const [activeTab, setActiveTab] = useState<'elements' | 'network'>('elements');

    const [elements, setElements] = useState<CapturedElement[]>([]);
    const [requests, setRequests] = useState<CapturedRequest[]>([]);

    const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [loadingCode, setLoadingCode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const messageListener = (message: any) => {
            if (message.type === 'ELEMENT_CAPTURED') {
                setElements(prev => [...prev, message.payload]);
            } else if (message.type === 'ELEMENTS_DISCOVERED') {
                // Avoid duplicates based on ID or selector if possible, but for now just replacing or appending?
                // Let's replace if empty, or append unique ones.
                // User asked to "load all elements", implying this should be the state.
                // Since it happens on start capture, we might want to prioritize these.
                // Let's append but filter by ID.
                setElements(prev => {
                    const newEls = message.payload as CapturedElement[];
                    const existingIds = new Set(prev.map(e => e.id));
                    const uniqueNew = newEls.filter(e => !existingIds.has(e.id));
                    return [...prev, ...uniqueNew];
                });
            } else if (message.type === 'NETWORK_REQUEST') {
                // Append new request
                setRequests(prev => [...prev, message.data]);
            } else if (message.type === 'NETWORK_RESPONSE') {
                // Update existing request with status and body
                setRequests(prev => prev.map(req =>
                    req.id === message.data.id
                        ? { ...req, status: message.data.status, responseBody: message.data.responseBody }
                        : req
                ));
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, []);

    const handleStartCapture = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            setError("No active tab found.");
            return;
        }

        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
            setError("Cannot capture on browser system pages.");
            return;
        }

        setIsCapturing(true);
        setError(null);

        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
        } catch (err) {
            console.log("Message failed, attempting injection...", err);
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['scripts/content.js']
                });

                setTimeout(async () => {
                    try {
                        if (tab.id) await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
                    } catch (retryErr) {
                        console.error("Retry failed", retryErr);
                        setError("Failed to start capture. Please refresh the page.");
                        setIsCapturing(false);
                    }
                }, 100);
            } catch (injectErr: any) {
                console.error("Injection failed", injectErr);
                setError("Cannot capture on this page. (Restricted or Developer Tools)");
                setIsCapturing(false);
            }
        }
    };

    const handleStopCapture = async () => {
        setIsCapturing(false);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' });
            } catch (e) {
                // Ignore
            }
        }
    };

    const handleGenerate = async () => {
        setLoadingCode(true);
        setError(null);
        try {
            const settings = await SettingsRepository.load();
            const provider = LLMServiceFactory.getProvider(settings);
            // Pass both elements and network requests to LLM
            // Note: We might want to filter requests or let LLM decide
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

            <main className="flex-1 p-4 overflow-y-auto">
                {view === 'settings' ? (
                    <SettingsForm onSave={() => setView('capture')} />
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {!isCapturing ? (
                                <Button onClick={handleStartCapture} className="flex-1">Start Capture</Button>
                            ) : (
                                <Button onClick={handleStopCapture} variant="danger" className="flex-1 animate-pulse">Stop Capture</Button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button
                                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'elements' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('elements')}
                            >
                                Elements ({elements.length})
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'network' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setActiveTab('network')}
                            >
                                Network ({requests.length})
                            </button>
                        </div>

                        {activeTab === 'elements' ? (
                            <ElementList
                                elements={elements}
                                onRemove={(id) => setElements(prev => prev.filter(e => e.id !== id))}
                                onClear={() => { setElements([]); setGeneratedCode(null); }}
                            />
                        ) : (
                            <NetworkList
                                requests={requests}
                                onClear={() => setRequests([])}
                            />
                        )}

                        {(elements.length > 0 || requests.length > 0) && (
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

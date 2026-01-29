import React from 'react';
import { CapturedRequest } from '../../domain/types';
import { Button } from '../components/Button';

interface NetworkListProps {
    requests: CapturedRequest[];
    onClear: () => void;
}

export const NetworkList: React.FC<NetworkListProps> = ({ requests, onClear }) => {
    if (requests.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>No network requests captured.</p>
                <p className="text-sm">Interact with the page to see API calls.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-medium text-slate-900">Network Log ({requests.length})</h3>
                <Button variant="ghost" size="sm" onClick={onClear} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                    Clear
                </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {requests.map((req) => (
                    <div key={req.id} className="p-3 bg-white border border-slate-200 rounded-md shadow-sm text-xs font-mono">
                        <div className="flex justify-between mb-1">
                            <span className={`font-bold ${req.method === 'GET' ? 'text-blue-600' : 'text-green-600'}`}>
                                {req.method}
                            </span>
                            <span className={req.status && req.status >= 400 ? 'text-red-500' : 'text-slate-500'}>
                                {req.status || 'Pending'}
                            </span>
                        </div>
                        <div className="truncate text-slate-700" title={req.url}>
                            {req.url.split('?')[0].split('/').pop() || req.url}
                        </div>
                        <div className="text-slate-400 text-[10px] truncate mt-0.5">
                            {req.url}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

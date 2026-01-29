import React from 'react';
import { CapturedElement } from '../../domain/types';
import { Button } from '../components/Button';

interface ElementListProps {
    elements: CapturedElement[];
    onRemove: (id: string) => void;
    onClear: () => void;
}

export const ElementList: React.FC<ElementListProps> = ({ elements, onRemove, onClear }) => {
    if (elements.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p>No elements captured yet.</p>
                <p className="text-sm">Click "Start Capture" to begin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-medium text-slate-900">Captured Elements ({elements.length})</h3>
                <Button variant="ghost" size="sm" onClick={onClear} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                    Clear All
                </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {elements.map((el) => (
                    <div key={el.id} className="p-3 bg-white border border-slate-200 rounded-md shadow-sm group hover:border-blue-400 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {el.tagName}
                            </span>
                            <button
                                onClick={() => onRemove(el.id)}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="text-xs font-mono bg-slate-50 p-1.5 rounded text-slate-600 truncate mb-1">
                            {el.selectors.css || el.selectors.xpath}
                        </div>
                        {el.attributes['data-testid'] && (
                            <div className="text-xs text-green-600 font-mono">
                                testid: {el.attributes['data-testid']}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

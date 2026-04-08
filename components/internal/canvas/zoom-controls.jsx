"use client";
import React from 'react';
import { useReactFlow } from '@xyflow/react';

export default function ZoomControls() {
    const { zoomIn, zoomOut } = useReactFlow();

    return (
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[60]">
            <div className="flex flex-col bg-[#161616]/60 backdrop-blur-md rounded-lg shadow-xl border border-[#2a2a2a]/50 overflow-hidden">
                <button
                    onClick={() => zoomIn({ duration: 300 })}
                    className="p-2 hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-colors border-b border-[#2a2a2a]/50 last:border-b-0"
                    title="Zoom In"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <button
                    onClick={() => zoomOut({ duration: 300 })}
                    className="p-2 hover:bg-[#2a2a2a] text-zinc-400 hover:text-white transition-colors"
                    title="Zoom Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
}

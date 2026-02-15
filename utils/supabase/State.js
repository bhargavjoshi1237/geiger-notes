"use client";

import { useState, useEffect } from 'react';

/**
 * Hook to fetch and manage canvas state from database
 * @param {string} userId - The user ID
 * @returns {Object} { nodes, edges, viewport, isLoading, error }
 */
export function useCanvasState(userId, boardId) {
    const [state, setState] = useState({
        nodes: null,
        edges: null,
        viewport: null,
        isLoading: true,
        error: null
    });

    useEffect(() => {
        // Reset state immediately when switching context to prevent stale data
        setState(prev => ({ 
            ...prev, 
            nodes: null, 
            edges: null, 
            viewport: null, 
            isLoading: true 
        }));

        async function loadState() {
            try {
                const isProd = process.env.NODE_ENV === 'production';
                const basePath = isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || '/notes') : '';
                const baseApiUrl = `${basePath}/api/load-state`;
                const url = boardId ? `${baseApiUrl}?boardId=${boardId}` : baseApiUrl;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error('Failed to load state');
                }

                const data = await response.json();
                
                // Parse JSON strings if they exist
                const parsedNodes = data.nodes ? JSON.parse(data.nodes) : null;
                const parsedEdges = data.edges ? JSON.parse(data.edges) : null;
                const parsedViewport = data.viewport ? JSON.parse(data.viewport) : null;

                setState({
                    nodes: parsedNodes,
                    edges: parsedEdges,
                    viewport: parsedViewport,
                    name: data.name,
                    isLoading: false,
                    error: null
                });
            } catch (error) {
                console.error('Error loading canvas state:', error);
                setState({
                    nodes: null,
                    edges: null,
                    viewport: null,
                    isLoading: false,
                    error: error.message
                });
            }
        }

        if (userId) {
            loadState();
        }
    }, [userId, boardId]);

    return state;
}

export async function saveCanvasState(userId, nodes, edges, viewport, boardId) {
    const isProd = process.env.NODE_ENV === 'production';
    const basePath = isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || '/notes') : '';
    try {
        const payload = JSON.stringify({
            userId,
            nodes,
            edges,
            viewport,
            boardId
        });

        // NOTE: Do NOT use `keepalive: true` here.
        // keepalive limits the request body to 64 KB, which is easily
        // exceeded when nodes contain base64 drawing data from ImageNode.
        const response = await fetch(`${basePath}/api/save-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || `HTTP ${response.status}`);
        }

        console.log('State saved to DB');
    } catch (error) {
        console.error('Failed to save state:', error);
        throw error;
    }
}

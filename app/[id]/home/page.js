"use client";

import React, { useCallback, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import BoardCanvas from '@/components/internal/canvas/BoardCanvas';
import WorkspaceShell from '@/components/internal/canvas/WorkspaceShell';

const SketchEditor = nextDynamic(
    () => import('@/components/internal/sketch/SketchEditor'),
    { ssr: false, loading: () => <WorkspaceShell /> }
);

const DocumentDialog = nextDynamic(
    () => import('@/components/internal/dialogs/DocumentDialog'),
    { ssr: false }
);

export default function Home({ params }) {
    const { id } = React.use(params);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const sketchId = searchParams.get('sketch');
    // A ?document=<id> link (from a sketch element) opens the document over the
    // board it was linked from.
    const documentId = searchParams.get('document');
    // The open sub-board lives in the URL so it survives a refresh and can be
    // linked to; the ancestor trail stays in state (a cold deep link shows one level).
    const activeBoardId = searchParams.get('board');
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    const setBoardParam = useCallback((boardId) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('sketch');
        if (boardId) params.set('board', boardId);
        else params.delete('board');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    }, [router, pathname, searchParams]);

    const closeDocument = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('document');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, [router, pathname, searchParams]);

    const closeSketch = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('sketch');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, [router, pathname, searchParams]);

    // A cold ?board=<id> load has no trail; seed one level once the canvas
    // reports the board's name.
    const handleBoardNameResolved = useCallback((boardId, name) => {
        setBreadcrumbs((prev) =>
            prev.some((b) => b.id === boardId)
                ? prev
                : [{ id: boardId, name: name || 'Untitled Board' }]
        );
    }, []);

    const onBreadcrumbClick = (boardId) => {
        if (boardId === null) {
            setBreadcrumbs([]);
            setBoardParam(null);
        } else {
            const index = breadcrumbs.findIndex(b => b.id === boardId);
            if (index !== -1) {
                setBreadcrumbs(breadcrumbs.slice(0, index + 1));
                setBoardParam(boardId);
            }
        }
    };

    const handleNavigate = (boardId, name) => {
        setBreadcrumbs(prev => {
             if (prev.some(b => b.id === boardId)) return prev;
             return [...prev, { id: boardId, name: name || 'Untitled Board' }]
        });
        setBoardParam(boardId);
    };

    if (sketchId) {
        return (
            <SketchEditor
                key={sketchId}
                sketchId={sketchId}
                canEdit
                onBack={closeSketch}
                breadcrumbs={breadcrumbs}
                onBreadcrumbClick={onBreadcrumbClick}
            />
        );
    }

    return (
        <>
            <BoardCanvas 
                key={activeBoardId || 'home'} // Forces unmount/remount when board changes
                id={id}
                boardId={activeBoardId}
                onNavigate={handleNavigate}
                breadcrumbs={breadcrumbs}
                onBreadcrumbClick={onBreadcrumbClick}
                onBoardNameResolved={handleBoardNameResolved}
            />
            {documentId && (
                <DocumentDialog isOpen onClose={closeDocument} documentId={documentId} />
            )}
        </>
    );
}

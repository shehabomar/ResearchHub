import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Paper } from '../services/api';

interface ExplorationPathItem {
    paperId: string;
    title: string;
    authors?: string;
    explorationType: 'search' | 'citation' | 'reference' | 'author' | 'similar';
}

interface ExplorationContextType {
    path: ExplorationPathItem[];
    addToPath: (item: ExplorationPathItem) => void;
    removeFromPath: (index: number) => void;
    clearPath: () => void;
    navigateToPathIndex: (index: number) => void;
}

const ExplorationContext = createContext<ExplorationContextType | undefined>(undefined);

export const useExploration = () => {
    const context = useContext(ExplorationContext);
    if (!context) {
        throw new Error('useExploration must be used within an ExplorationProvider');
    }
    return context;
};

interface ExplorationProviderProps {
    children: ReactNode;
}

export const ExplorationProvider: React.FC<ExplorationProviderProps> = ({ children }) => {
    const [path, setPath] = useState<ExplorationPathItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem('exploration:path');
            if (raw) {
                const saved: ExplorationPathItem[] = JSON.parse(raw);
                if (Array.isArray(saved)) {
                    setPath(saved);
                }
            }
        } catch {
            // ignore corrupt storage
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist to localStorage whenever path changes
    useEffect(() => {
        try {
            localStorage.setItem('exploration:path', JSON.stringify(path));
        } catch {
            // ignore storage errors
        }
    }, [path]);

    const addToPath = (item: ExplorationPathItem) => {
        setPath(current => {
            const existingIndex = current.findIndex(pathItem => pathItem.paperId === item.paperId);
            if (existingIndex !== -1) {
                // Move to that point and refresh metadata (title/authors/type may change)
                const updated = [...current.slice(0, existingIndex + 1)];
                updated[existingIndex] = { ...updated[existingIndex], ...item };
                return updated;
            }
            return [...current, item];
        });
    };

    const removeFromPath = (index: number) => {
        setPath(current => current.slice(0, index));
    };

    const clearPath = () => {
        setPath([]);
    };

    const navigateToPathIndex = (index: number) => {
        setPath(current => current.slice(0, index + 1));
    };

    const value: ExplorationContextType = {
        path,
        addToPath,
        removeFromPath,
        clearPath,
        navigateToPathIndex,
    };

    return (
        <ExplorationContext.Provider value={value}>
            {children}
        </ExplorationContext.Provider>
    );
};

// Helper function to convert Paper to ExplorationPathItem
export const paperToPathItem = (paper: Paper, explorationType: ExplorationPathItem['explorationType'] = 'search'): ExplorationPathItem => {
    const authorsString = paper.authors?.map(a => a.name).join(', ') || 'Unknown authors';

    return {
        paperId: paper.id,
        title: paper.title,
        authors: authorsString,
        explorationType
    };
};

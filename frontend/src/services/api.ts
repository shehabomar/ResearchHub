import axios from 'axios';

// Prefer Vite proxy in dev to avoid CORS. Override with VITE_API_BASE_URL as needed.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interfaces matching your backend types
export interface Paper {
    id: string;
    title: string;
    abstract?: string;
    authors: Array<{
        id?: string;
        name: string;
        affiliation?: string;
    }>;
    publication_date?: string;
    citation_count: number;
    api_source: string;
    external_ids?: Record<string, any>;
    meta_data?: Record<string, any>;
    created_at?: Date;
}

export interface SearchResult {
    success: boolean;
    data?: {
        papers: Paper[];
        total: number;
        offset: number;
        source: 'database' | 'api' | 'hybrid';
        cached?: boolean;
    };
    message?: string;
    error?: string;
}

export interface CitationTreeNode {
    paper: Paper;
    references: CitationTreeNode[];
    depth: number;
    totalNodes?: number;
}

export interface CitationTreeResult {
    success: boolean;
    data?: {
        tree: CitationTreeNode;
        statistics: {
            totalNodes: number;
            maxDepth: number;
            averageReferences: number;
            totalCitations: number;
        };
        flattened: Array<{
            paperId: string;
            title: string;
            depth: number;
            parentId?: string;
            citationCount: number;
        }>;
    };
    message?: string;
    error?: string;
}

class ApiService {
    // Paper search
    async searchPapers(query: string, limit: number = 10, offset: number = 0): Promise<SearchResult> {
        try {
            const response = await api.post('/papers/search', {
                query,
                limit,
                offset,
                saveToDb: true
            });
            return response.data;
        } catch (error) {
            console.error('Error searching papers:', error);
            throw error;
        }
    }

    // Get paper by ID
    async getPaperById(paperId: string): Promise<{ success: boolean; data?: { paper: Paper; source: string }; message?: string; error?: string }> {
        try {
            const response = await api.get(`/papers/${paperId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting paper by ID:', error);
            throw error;
        }
    }

    // Build citation tree
    async buildCitationTree(paperId: string, maxDepth: number = 2, maxReferencesPerLevel: number = 3): Promise<CitationTreeResult> {
        try {
            const response = await api.post(`/citations/tree/${paperId}`, {
                maxDepth,
                maxReferencesPerLevel,
                includeMetrics: true
            });
            return response.data;
        } catch (error) {
            console.error('Error building citation tree:', error);
            throw error;
        }
    }

    // Get recent papers
    async getRecentPapers(limit: number = 20): Promise<{ success: boolean; data?: { papers: Paper[]; total: number }; message?: string; error?: string }> {
        try {
            const response = await api.get(`/papers/recent?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error getting recent papers:', error);
            throw error;
        }
    }

    // Search by author
    async searchByAuthor(authorName: string, limit: number = 10): Promise<SearchResult> {
        try {
            const response = await api.post('/papers/search/author', {
                authorName,
                limit
            });
            return response.data;
        } catch (error) {
            console.error('Error searching by author:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
export default apiService;

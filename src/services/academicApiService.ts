import axios, { AxiosResponse, AxiosError } from 'axios';

interface Author {
    id?: string;
    name: string;
    affiliation?: string;
}

interface Paper {
    id: string;
    title: string;
    abstract?: string;
    authors: Author[];
    publicationDate?: string;
    citationCount: number;
    venue?: string;
    url?: string;
    references?: string[];
    citations?: string[];
    apiSource: 'semantic_scholar' | 'openalex';
    externalIds?: Record<string, string>;
}

interface SearchParams {
    query: string;
    limit?: number;
    offset?: number;
    year?: string;
    venue?: string;
    fieldsOfStudy?: string[];
}

interface SearchResult {
    papers: Paper[];
    tot: number;
    offset: number;
    next?: string;
}

class SemanticScholarAPI {
    private readonly baseUrl = 'https://api.semanticscholar.org/graph/v1';
    private readonly rateLimit = {
        requests: 0,
        lastReset: Date.now(),
        maxRequests: 100,
        wdMs: 5 * 60 * 1000
    }

    // Generic retry wrapper for axios calls (handles 429 + transient errors)
    private withRetry = async <T>(
        request: () => Promise<AxiosResponse<T>>,
        attempts: number = 3
    ): Promise<AxiosResponse<T>> => {
        let lastError: unknown;
        for (let i = 0; i < attempts; i++) {
            try {
                return await request();
            } catch (error) {
                lastError = error;
                const axErr = error as AxiosError;
                const status = axErr.response?.status;
                const retryAfterHeader = axErr.response?.headers?.['retry-after'] as string | undefined;
                const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;

                // Retry for 429 or 5xx or network errors or timeouts
                const shouldRetry = status === 429 || (status && status >= 500) ||
                    axErr.code === 'ECONNRESET' || axErr.code === 'ETIMEDOUT' || axErr.code === 'ECONNABORTED';
                if (!shouldRetry || i === attempts - 1) {
                    break;
                }

                const backoff = retryAfterMs ?? Math.min(4000, 1000 * Math.pow(2, i));
                console.warn(`Semantic Scholar API rate-limited or transient error (status ${status}). Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
        throw lastError instanceof Error ? lastError : new Error('Request failed');
    }

    private rateLimitCheck = async (): Promise<void> => {
        const now = Date.now();

        if (now - this.rateLimit.lastReset > this.rateLimit.wdMs) {
            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = now;
        }

        if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
            const wait = this.rateLimit.wdMs - (now - this.rateLimit.lastReset);
            console.log(`you have hit the rate limit, wait for ${wait}ms`);
            await new Promise(resolve => setTimeout(resolve, wait));

            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = Date.now();
        }
        this.rateLimit.requests++;
    }

    private transformPaper = (apiPaper: any): Paper => {
        return {
            id: apiPaper.paperId || apiPaper.id,
            title: apiPaper.title || '',
            abstract: apiPaper.abstract || '',
            authors: (apiPaper.authors || []).map((author: any) => {
                return {
                    id: author.authorId,
                    name: author.name,
                    affiliation: author.affiliation || undefined
                }
            }),
            publicationDate: apiPaper.publicationDate || apiPaper.year?.toString() || '',
            citationCount: apiPaper.citationCount || 0,
            venue: apiPaper.venue || undefined,
            url: apiPaper.url || undefined,
            references: (apiPaper.references || [])
                .map((ref: any) => ref ? (ref.paperId || ref) : null)
                .filter(Boolean),
            citations: (apiPaper.citations || [])
                .map((cite: any) => cite ? (cite.paperId || cite) : null)
                .filter(Boolean),
            apiSource: 'semantic_scholar'
        }
    }

    searchPapers = async (params: SearchParams): Promise<SearchResult> => {
        try {
            await this.rateLimitCheck();

            const search = `${this.baseUrl}/paper/search`;
            const queryParams: any = {
                query: params.query,
                limit: params.limit || 10,
                offset: params.offset || 0,
                fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url'
            }

            if (params.year) {
                queryParams.year = params.year;
            }

            if (params.venue) {
                queryParams.venue = params.venue;
            }

            if (params.fieldsOfStudy?.length) {
                queryParams.fieldsOfStudy = params.fieldsOfStudy.join(',');
            }

            let response: AxiosResponse<any>;

            try {
                response = await this.withRetry(() => axios.get(search, {
                    params: queryParams,
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Academic-Discovery-Platform/1.0'
                    }
                }));
            } catch (error) {
                console.log('regular search failed, trying bulk search...');
                const bulkSearchUrl = `${this.baseUrl}/paper/search/bulk`;

                response = await this.withRetry(() => axios.get(bulkSearchUrl, {
                    params: queryParams,
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Academic-Discovery-Platform/1.0'
                    }
                }));
            }

            const data = response.data;
            const papers = (data.data || []).map((paper: any) => this.transformPaper(paper));

            console.log(`found ${papers.length} papers`);

            return {
                papers,
                tot: data.total || papers.length,
                offset: data.offset || 0,
                next: data.next || undefined
            }
        }
        catch (ex) {
            console.error("Error in searchPapers:", ex);
            throw new Error("Failed to fetch papers from Semantic Scholar API");
        }
    }

    getPaperById = async (paperId: string): Promise<Paper> => {
        try {
            await this.rateLimitCheck();

            const url = `${this.baseUrl}/paper/${paperId}`;

            const response: AxiosResponse<any> = await this.withRetry(() => axios.get(url, {
                params: {
                    fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url,references,citations'
                },
                timeout: 60000,
                headers: {
                    'User-Agent': 'Academic-Discovery-Platform/1.0'
                }
            }));

            const data = response.data;
            const transformedData = this.transformPaper(data);
            return transformedData;
        }
        catch (ex) {
            console.error("Error in getPaperById:", ex);
            throw new Error("Failed to fetch paper from Semantic Scholar API");
        }
    }

    getPapersByAuthor = async (authorId: string, limit: number = 10): Promise<Paper[]> => {
        try {
            await this.rateLimitCheck();

            const url = `${this.baseUrl}/author/${authorId}/papers`;

            const response: AxiosResponse<any> = await axios.get(url, {
                params: {
                    limit,
                    fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url,references,citations'
                },
                timeout: 60000,
                headers: {
                    'User-Agent': 'Academic-Discovery-Platform/1.0'
                }
            });

            const data = response.data;
            const papers = (data.data || []).map((paper: any) => this.transformPaper(paper));
            console.log(`found ${papers.length} papers for author ${authorId}`);
            return papers;

        }
        catch (ex) {
            console.error("Error in getPapersByAuthor:", ex);
            throw new Error("Failed to fetch papers by author from Semantic Scholar API");
        }
    }

    getRateLimitStatus = (): { remaining: number; resetTime: Date } => {
        const now = Date.now();
        const remaining = Math.max(0, this.rateLimit.maxRequests - this.rateLimit.requests);
        const resetTime = new Date(this.rateLimit.lastReset + this.rateLimit.wdMs);
        return { remaining, resetTime };
    }
}

const semanticScholarAPI = new SemanticScholarAPI();

export {
    SemanticScholarAPI,
    semanticScholarAPI,
    Paper,
    Author,
    SearchParams,
    SearchResult
}
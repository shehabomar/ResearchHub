import axios, { AxiosResponse, AxiosError } from 'axios';
import { time } from 'console';

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
    apiSource?: 'semantic_scholar' | 'openalex';
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
    private readonly baseUrl = 'https://api.semanticscholar.org/graph/v1/';
    private readonly rateLimit = {
        requests: 0,
        lastReset: Date.now(),
        maxRequests: 100,
        wdMs: 5 * 60 * 1000
    }

    private async rateLimitCheck(): Promise<void> {
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

    private transformPaper(apiPaper: any): Paper {
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
            publicationDate: apiPaper.publicationDate || apiPaper.year.toString(),
            citationCount: apiPaper.citationCount || 0,
            venue: apiPaper.venue || undefined,
            url: apiPaper.url || undefined,
            references: apiPaper.references.map((ref: any) => ref.paperId) || [],
            citations: apiPaper.citations.map((cite: any) => cite.paperId) || [],
            apiSource: 'semantic_scholar'
        }
    }

    async searchPapers(params: SearchParams): Promise<SearchResult> {
        try {
            await this.rateLimitCheck();

            const search = `${this.baseUrl}/search/papers`;
            const queryParams: any = {
                query: params.query,
                limit: params.limit || 10,
                offset: params.offset || 0,
                fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url,references,citations'
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

            const response: AxiosResponse<any> = await axios.get(search, {
                params: queryParams,
                timeout: 30000,
                headers: {
                    'User-Agent': 'Academic-Discovery-Platform/1.0'
                }
            });


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

    async getPaperById(paperId: string): Promise<Paper> {
        try {
            await this.rateLimitCheck();

            const url = `${this.baseUrl}/paper/${paperId}`;

            const response: AxiosResponse<any> = await axios.get(url, {
                params: {
                    fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url,references,citations'
                },
                timeout: 30000,
                headers: {
                    'User-Agent': 'Academic-Discovery-Platform/1.0'
                }
            });

            const data = response.data;
            const transformedData = this.transformPaper(data);
            return transformedData;
        }
        catch (ex) {
            console.error("Error in getPaperById:", ex);
            throw new Error("Failed to fetch paper from Semantic Scholar API");
        }
    }

    async getPapersByAuthor(authorId: string, limit: number = 10): Promise<Paper[]> {
        try {
            await this.rateLimitCheck();

            const url = `${this.baseUrl}/author/${authorId}/papers`;

            const response: AxiosResponse<any> = await axios.get(url, {
                params: {
                    limit,
                    fields: 'title,abstract,paperId,authors,publicationDate,citationCount,venue,url,references,citations'
                },
                timeout: 30000,
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
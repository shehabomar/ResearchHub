
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
    private readonly baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
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

}  

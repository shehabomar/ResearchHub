
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



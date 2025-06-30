import DatabaseService from '../db/db';
import { Paper, Author } from '../services/academicApiService';

interface DbPaper {
    id: string;
    title: string;
    abstract?: string;
    authors: Author[];
    publication_date?: string;
    citation_count: number;
    api_source: string;
    external_ids: Record<string, string>;
    meta_data: Record<string, any>;
    created_at: Date;
}

interface PaperSearchFilters {
    query?: string;
    yearStart?: string;
    yearEnd?: string;
    venue?: string;
    minCitations?: number;
    fieldsOfStudy?: string[];
    limit?: number;
    offset?: number;
}

class PaperRepository {

    private transformToDbPaper = (row: any): DbPaper => {
        return {
            id: row.id,
            title: row.title,
            abstract: row.abstract,
            authors: typeof row.authors === 'string' ? JSON.parse(row.authors) : row.authors,
            publication_date: row.publication_date,
            citation_count: row.citation_count,
            api_source: row.api_source,
            external_ids: typeof row.external_ids === 'string' ? JSON.parse(row.external_ids) : row.external_ids,
            meta_data: typeof row.meta_data === 'string' ? JSON.parse(row.meta_data) : row.meta_data,
            created_at: row.created_at
        };
    }

    savePaper = async (paper: Paper): Promise<DbPaper> => {
        try {
            const query = `
                insert into papers (id, title, abstract, authors, publication_date, citation_count, api_source, external_ids, meta_data)
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                on conflict (id)
                do update set 
                    title = excluded.title,
                    abstract = excluded.abstract,
                    authors = excluded.authors,
                    publication_date = excluded.publication_date,
                    citation_count = excluded.citation_count,
                    api_source = excluded.api_source,
                    external_ids = excluded.external_ids,
                    meta_data = excluded.meta_data,
                    created_at = now()
                returning *
            `;
            const results = await DatabaseService.query(query, [
                paper.id,
                paper.title,
                paper.abstract || '',
                JSON.stringify(paper.authors),
                paper.publicationDate || '',
                paper.citationCount,
                paper.apiSource,
                JSON.stringify(paper.externalIds || {}),
                JSON.stringify({
                    venue: paper.venue,
                    url: paper.url,
                    references: paper.references || [],
                    citations: paper.citations || []
                })
            ]);

            const dbRes = results.rows[0];
            console.log("paper saved:", dbRes.title);

            return this.transformToDbPaper(dbRes);
        }
        catch (ex) {
            console.log("error saving paper:", ex);
            throw new Error("Failed to save paper");
        }
    }

    savePapers = async (papers: Paper[]): Promise<DbPaper[]> => {
        try {
            const queries = papers.map(paper => ({
                text: `
                    insert into papers (id, title, abstract, authors, publication_date, citation_count, api_source, external_ids, meta_data)
                    values
                    ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    on conflict(id)
                    do update set
                        title = excluded.title,
                        abstract = excluded.abstract,
                        authors = excluded.authors,
                        publication_date = excluded.publication_date,
                        citation_count = excluded.citation_count,
                        api_source = excluded.api_source,
                        external_ids = excluded.external_ids,
                        meta_data = excluded.meta_data,
                        created_at = now()
                    returning *
                `,
                params: [
                    paper.id,
                    paper.abstract,
                    paper.title,
                    JSON.stringify(paper.authors),
                    paper.publicationDate || '',
                    paper.citationCount,
                    paper.apiSource,
                    JSON.stringify(paper.externalIds || {}),
                    JSON.stringify({
                        venue: paper.venue,
                        url: paper.url,
                        references: paper.references || [],
                        citations: paper.citations || []
                    })
                ]
            }));

            const results = await DatabaseService.transaction(queries);
            const savedRes = results.map(res => this.transformToDbPaper(res.rows[0]));
            console.log("saved papers len: ", savedRes.length);
            return savedRes;
        }
        catch (ex) {
            console.log("error saving papers: ", ex);
            throw new Error("Faild to save papers");
        }
    }

    getPaperById = async (id: string): Promise<DbPaper | null> => {
        try {
            const query = `select * from papers where id = $1`;
            const result = await DatabaseService.query(query, [id]);
            const paper = result.rows[0];

            if (!paper || result.rows.length === 0) {
                return null;
            }

            console.log('found paper with id: ', id);
            return this.transformToDbPaper(paper);
        }
        catch (ex) {
            console.log("error finding paper with id", ex);
            throw new Error("Failed finding paper with id");
        }
    }

    getPapersByAuthor = async (authorName: string, limit: number = 10): Promise<DbPaper[] | null> => {
        try {
            const query = `
            select * 
            from papers 
            where authors::text ILIKE $1 
            order by citation_count desc
            limit $2`;

            const result = await DatabaseService.query(query, [authorName, limit]);
            const papers = result.rows.map(paper => this.transformToDbPaper(paper));
            console.log("papers returned from author: ", papers.length);
            return papers;
        }
        catch (ex) {
            console.log("error trying to get papers by author: ", ex);
            throw new Error("Failed fetching Papers by Author");
        }
    }

    getRecentPapers = async (limit: number = 10): Promise<DbPaper[]> => {
        try {
            const query = `
                select * 
                from papers
                order by created_at desc
                limit $1
            `;

            const result = await DatabaseService.query(query, [limit]);
            const papers = result.rows.map(paper => this.transformToDbPaper(paper));
            console.log("recently added papers returned: ", papers.length);
            return papers;
        }
        catch (ex) {
            console.log("error getting the recent papers: ", ex);
            throw new Error("Failed Fetching recent papers");
        }
    }

    paperExists = async (id: string): Promise<boolean> => {
        try {
            const query = 'SELECT 1 FROM papers WHERE id = $1 LIMIT 1';
            const result = await DatabaseService.query(query, [id]);
            return result.rows.length > 0;
        } catch (ex) {
            console.log("error checking paper existence:", ex);
            return false;
        }
    }

    // searchPapers = async (searchParams: PaperSearchFilters): Promise<{ papers: DbPaper[]; total: number }> => {
    //     try {

    //     }
    //     catch (ex) {

    //     }
    // }
}

const paperRepo = new PaperRepository();

export { paperRepo, PaperRepository, DbPaper, PaperSearchFilters }
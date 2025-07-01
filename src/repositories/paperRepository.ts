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
    author?: string;
    yearStart?: number;
    yearEnd?: number;
    minCitations?: number;
    venue?: string;
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

    getPaperStats = async (): Promise<{
        totalPapers: number;
        avgCitations: number;
        topVenues: Array<{ venue: string; count: number }>;
        recentCount: number;
    }> => {

        try {
            const queries = [
                'select count(*) as total from papers;',
                'select avg(citation_count) as avg_citatios from papers',
                `select meta_data->>'venue' as venue, count(*) as count 
                 from papers 
                 where meta_data->>'venue' is not null
                 group by meta_data->>'venue' 
                 order by count DESC 
                 limit 5`,
                `select count(*) as recent_count 
                 from papers 
                 where created_at >= now() - interval '7 days'`
            ];

            const [totalResult, avgResult, venuesResult, recentResult] = await Promise.all(
                queries.map(query => DatabaseService.query(query))
            );

            return {
                totalPapers: parseInt(totalResult.rows[0].total),
                avgCitations: parseInt(avgResult.rows[0].avg_citatios) || 0,
                topVenues: venuesResult.rows.map(row => ({
                    venue: row.venue,
                    count: parseInt(row.count)
                })),
                recentCount: parseInt(recentResult.rows[0].recent_count)
            };
        }
        catch (ex) {
            console.log("error getting paper stats", ex);
            throw new Error('failed to get stats');
        }
    }

    searchPapers = async (filters: PaperSearchFilters): Promise<{ papers: DbPaper[]; total: number }> => {
        try {
            let whereConditions: string[] = [];
            let paramsCount = 0;
            let queryParams: any[] = [];

            if (filters.query) {
                paramsCount++;
                whereConditions.push(`(
                    to_tsvector('english', title) @@ plainto_tsquery('english', $${paramsCount})
                    or 
                    to_tsvector('english', abstract) @@ plainto_tsquery('english', $${paramsCount})
                )`);
                queryParams.push(filters.query);
            }

            if (filters.author) {
                paramsCount++;
                whereConditions.push(`authors::text ilike $${paramsCount}`);
                queryParams.push(`%${filters.author}%`);
            }

            if (filters.yearStart) {
                paramsCount++;
                whereConditions.push(`
                    extract(year from publication_date::date) >= $${paramsCount}
                `);
                queryParams.push(filters.yearStart);
            }

            if (filters.yearEnd) {
                paramsCount++;
                whereConditions.push(`
                    extract(year from publication_date::date) <= $${paramsCount}
                `);
                queryParams.push(filters.yearEnd);
            }

            if (filters.minCitations) {
                paramsCount++;
                whereConditions.push(`
                    citation_count >= $${paramsCount}
                `);
                queryParams.push(filters.minCitations);
            }

            if (filters.venue) {
                paramsCount++;
                whereConditions.push(`
                    meta->>'venue' ilike $${paramsCount}
                `);
                queryParams.push(`%${filters.venue}%`);
            }

            const queryWhere = whereConditions.length > 0 ? `where ${whereConditions.join(' and ')}` : '';

            const countQuery = `select count(*) as total from papers ${queryWhere}`;

            const limit = filters.limit || 10;
            const offset = filters.offset || 0;


            paramsCount++;
            const limitParam = paramsCount;
            paramsCount++;
            const offsetParam = paramsCount;

            const query = `
                select * 
                from papers
                ${queryWhere}
                order by citation_count desc, created_at desc
                limit $${limitParam}
                offset $${offsetParam};
            `;

            const [count, data] = await Promise.all([
                DatabaseService.query(countQuery, [queryParams]),
                DatabaseService.query(query, [...queryParams, limit, offset])
            ]);

            const total = parseInt(count.rows[0].total);
            const papers = data.rows.map(row => this.transformToDbPaper(row));

            console.log(`found ${total} papers`);

            return { papers, total };
        }
        catch (ex) {
            console.log("error searching a query: ", ex);
            throw new Error('failed searching a query');
        }
    }
}

const paperRepo = new PaperRepository();

export { paperRepo, PaperRepository, DbPaper, PaperSearchFilters }
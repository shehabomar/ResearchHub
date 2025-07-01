import { Request, Response } from "express";
import { semanticScholarAPI, SearchParams } from "../services/academicApiService";
import { paperRepo, PaperSearchFilters } from "../repositories/paperRepository";


interface SearchRequest {
    query: string;
    limit?: number;
    offset?: number;
    year?: string;
    venue?: string;
    fieldsOfStudy?: string[];
    saveToDb?: boolean;
}

interface PaperSearchResponse {
    success: boolean;
    data?: {
        papers: any[];
        total: number;
        offset: number;
        source: 'database' | 'api' | 'hybrid';
        cached?: boolean;
    };
    message?: string;
    error?: string;
}

class PaperController {
    static searchPaper = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                query,
                limit = 10,
                offset = 0,
                year,
                venue,
                fieldsOfStudy,
                saveToDb = true
            }: SearchRequest = req.body;

            if (!query || query.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'search query is required'
                });
                return;
            }

            console.log(`searching papers: ${query}, limit: ${limit}, offset: ${offset}`);

            const dbFilter: PaperSearchFilters = {
                query: query.trim(),
                limit,
                offset,
                yearStart: year ? parseInt(year) : undefined,
                yearEnd: year ? parseInt(year) : undefined
            };

            // fetch from db
            const dbRes = await paperRepo.searchPapers(dbFilter);
            if (dbRes.papers.length >= limit || offset > 0) {
                console.log(`returning ${dbRes.papers.length} from db`);
                res.status(200).json({
                    success: true,
                    data: {
                        papers: dbRes.papers,
                        total: dbRes.total,
                        offset,
                        source: 'database',
                        cached: true
                    }
                } as PaperSearchResponse);
                return;
            }

            // fetch from api
            const apiParams: SearchParams = {
                query: query.trim(),
                limit,
                offset,
                year,
                venue,
                fieldsOfStudy
            };

            const apiRes = await semanticScholarAPI.searchPapers(apiParams);
            let savedPapers: any[] = [];
            if (saveToDb && apiRes.papers.length > 0) {
                try {
                    console.log(`saving ${apiRes.papers.length} papers to db`);
                    savedPapers = await paperRepo.savePapers(apiRes.papers);
                    console.log('saved!');
                }
                catch (ex) {
                    console.log('error saving papers fetched from api to db', ex);
                }
            }

            res.status(200).json({
                success: true,
                data: {
                    papers: apiRes.papers,
                    total: apiRes.tot,
                    offset: apiRes.offset,
                    source: 'api',
                    cached: false
                }
            } as PaperSearchResponse)
        }
        catch (ex) {
            console.log("error at endpoint searchPaper", ex);
            res.status(500).json({
                success: false,
                message: 'failed to search papers',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }

    static getPaperById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { paperId } = req.params;

            if (!paperId) {
                res.status(400).json({
                    success: false,
                    message: 'paper id is required'
                });
                return;
            }

            console.log(`fetching paper ${paperId}`);

            let paper = await paperRepo.getPaperById(paperId);
            let source = 'database';

            if (!paper) {
                console.log('paper not in db');
                const apiPaper = await semanticScholarAPI.getPaperById(paperId);
                if (!apiPaper) {
                    res.status(404).json({
                        success: false,
                        message: 'paper not found'
                    });
                    return;
                }
                paper = await paperRepo.savePaper(apiPaper);
                source = 'api';
            }

            res.status(200).json({
                success: true,
                data: {
                    paper,
                    source
                }
            });
        }
        catch (ex) {
            console.log('error fetching a paper at endpoint', ex);
            res.status(500).json({
                success: false,
                message: 'failed to search paper',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }

    static searchByAuthor = async (req: Request, res: Response): Promise<void> => {
        try {
            const { authorName, limit = 10 } = req.body;
            if (!authorName) {
                res.status(400).json({
                    success: false,
                    message: 'author name is required'
                });
                return;
            }

            console.log('searching paper with author name: ', authorName);

            let results = await paperRepo.getPapersByAuthor(authorName, limit);

            res.status(200).json({
                success: true,
                data: {
                    papers: results,
                    total: results?.length,
                    author: authorName,
                    source: 'database'
                }
            });
        }
        catch (ex) {
            console.log('error in searchByAuthor', ex);
            res.status(500).json({
                success: false,
                message: 'failed to search papers by author',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }

    static getRecentPapers = async (req: Request, res: Response): Promise<void> => {
        try {
            const { limit = 20 } = req.query;
            const limitNum = parseInt(limit as string);

            console.log('fetching recent papers');
            const papers = await paperRepo.getRecentPapers(limitNum);
            res.status(200).json({
                success: true,
                data: {
                    papers,
                    total: papers.length
                }
            });
        }
        catch (ex) {
            console.log('error in getRecentPapers', ex);
            res.status(500).json({
                success: false,
                message: 'failed to fetch recent papers',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    static getPaperStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await paperRepo.getPaperStats();
            res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (ex) {
            console.log('error in getPaperStats', ex);
            res.status(500).json({
                success: false,
                message: 'failed to get stats',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    static bulkImport = async (req: Request, res: Response): Promise<void> => {
        try {
            const { queries, maxPapersPerQuery = 20 } = req.body;
            if (!queries || !Array.isArray(queries) || queries.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'queries are required'
                });
            }

            console.log('starting bulk imports');

            let totalImported = 0;
            const results = [];

            for (const query of queries) {
                try {
                    console.log(`importing papers for query: ${query}`);
                    const apiRes = await semanticScholarAPI.searchPapers({
                        query,
                        limit: maxPapersPerQuery
                    });

                    if (apiRes.papers.length > 0) {
                        const savedPapers = await paperRepo.savePapers(apiRes.papers);
                        totalImported += savedPapers.length;

                        results.push({
                            query,
                            imported: savedPapers.length,
                            total: apiRes.tot
                        });
                    }

                    // delay for rate limit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                catch (ex) {
                    console.log('error importing for query', ex);
                    results.push({
                        query,
                        imported: 0,
                        error: ex instanceof Error ? ex.message : 'unkown error'
                    });
                }
            }

            res.status(200).json({
                success: true,
                data: {
                    totalImported,
                    results
                }
            });
        }
        catch (ex) {
            console.log('error in bulkImport:', ex);
            res.status(500).json({
                success: false,
                message: 'bulk import failed',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    static getRateLimitStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const rateLimitStatus = semanticScholarAPI.getRateLimitStatus();
            res.status(200).json({
                success: true,
                data: {
                    rateLimit: rateLimitStatus,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (ex) {
            console.log('error getting rate limit', ex);
            res.status(500).json({
                success: false,
                message: 'failed getting rate limit',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }
}

export { PaperController };
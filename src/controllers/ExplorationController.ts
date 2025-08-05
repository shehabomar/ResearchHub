import { ExplorationFilters, ExplorationPath, EnrichedExplorationPath, ExplorationSession, explorationRepo } from "../repositories/explorationRepository";
import { Request, Response } from "express";

interface CreateSessionRequest {
    name: string;
    description?: string;
    meta_data?: Record<string, any>
}

interface UpdateSessionRequest {
    name?: string;
    description?: string;
    isShared?: boolean;
    meta_data?: Record<string, any>
}

interface AddPaperRequest {
    paperId: string;
    exploration_type: 'search' | 'citation' | 'reference' | 'author' | 'similar';
    parentPathId?: number;
    meta_data?: Record<string, any>
}

interface CitationTreeRequest {
    paperId: string;
    maxDepth?: number;
    maxReferencePerLevel?: number;
}

class ExplorationController {
    static createSession = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication Required'
                });
                return;
            }

            const {
                name,
                description,
                meta_data
            }: CreateSessionRequest = req.body;

            if (!name || name.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'name for session is required'
                });
                return;
            }

            if (name.trim().length > 255) {
                res.status(401).json({
                    successs: false,
                    message: 'name of session exceeded 255 chars'
                });
            }

            const session = await explorationRepo.createSession(userId, name.trim(), description?.trim(), meta_data);
            console.log(`created session with id ${session.id}`);

            res.status(201).json({
                success: true,
                data: {
                    session,
                    nextSteps: {
                        addPaper: `/api/exploration/sessions/${session.id}/papers`,
                        getTree: `/api/exploration/sessions/${session.id}/tree`
                    }
                }
            });
        }
        catch (ex) {
            console.log('error creating exploration session: ', ex);
            res.status(500).json({
                succcess: false,
                message: 'failed to create exploration sessoin',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    static getUserSessions = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication Required'
                });
                return;
            }

            const {
                search,
                shared,
                limit = '20',
                offset = '0'
            } = req.query;

            const filters = {
                sessionName: search as string,
                isShared: shared === 'true' ? true : shared === 'false' ? false : undefined,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string)
            };

            console.log(`fetching sessions for user ${userId}, with fileters ${filters}`);

            const results = await explorationRepo.getUserSessions(userId, filters);

            res.status(200).json({
                success: true,
                data: {
                    sessions: results.sessions,
                    pagination: {
                        total: results.total,
                        limit: filters.limit,
                        offset: filters.offset,
                        hasMore: results.total > (filters.offset + results.sessions.length)
                    }
                }
            });
        }
        catch (ex) {
            console.log('failed getting the sessions of user: ', ex);
            res.status(500).json({
                success: false,
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    static getSessionById = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const sessionId = parseInt(req.params.id);

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'authentication required'
                });
                return;
            }

            if (isNaN(sessionId)) {
                res.status(400).json({
                    success: false,
                    message: 'session id is not valid'
                });
                return;
            }

            const results = await explorationRepo.getSessionById(sessionId, userId);

            res.status(200).json({
                success: true,
                data: {
                    results,
                    actions: {
                        update: `/api/exploration/sessions/${sessionId}`,
                        addPaper: `/api/exploration/sessions/${sessionId}/papers`,
                        getTree: `/api/exploration/sessions/${sessionId}/tree`
                    }
                }
            });
        }
        catch (ex) {
            console.log('error trying to get session', ex);
            res.status(500).json({
                success: false,
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }

    // TODO 
}

export {
    ExplorationController,
}
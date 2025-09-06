import DatabaseService from "../db/db";
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
    meta_data?: Record<string, any>
    isShared?: boolean;
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

    static updateSession = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }

            const sessionId = parseInt(req.params.id);
            if (isNaN(sessionId)) {
                res.status(400).json({
                    success: false,
                    message: "session id not valid"
                });
                return;
            }

            // get updates values
            const updatedSession: UpdateSessionRequest = req.body;


            // validate values
            if (!updatedSession.name || updatedSession.name.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: "name is required"
                });
                return;
            }

            if (updatedSession.name.trim().length > 255) {
                res.status(400).json({
                    success: false,
                    message: "name of session exceeded 255 chars"
                });
                return;
            }


            // update in db
            const session = await explorationRepo.updateSession(sessionId, userId, {
                name: updatedSession.name,
                description: updatedSession.description,
                meta_data: updatedSession.meta_data,
                isShared: updatedSession.isShared ?? false
            });

            // send successful status
            console.log(`updated session: ${sessionId}`)
            res.status(200).json({
                success: true,
                data: {
                    session,
                }
            });
        }
        catch (ex) {
            console.log('error trying to update session');
            res.status(500).json({
                success: false,
                message: "failed to update session",
                error: ex instanceof Error ? ex.message : 'unknown error'
            })
        }
    }

    static addPaperToPath = async (req: Request, res: Response): Promise<void> => {
        try {
            const sessionId = parseInt(req.params.id);
            if (!sessionId) {
                res.status(401).json({
                    success: false,
                    message: "session id is not valid"
                });
                return;
            }

            const paperDetails: AddPaperRequest = req.body;
            const values = await explorationRepo.addPaperToPath(sessionId, paperDetails.paperId, paperDetails.exploration_type, paperDetails.parentPathId, paperDetails.meta_data);

            res.status(200).json({
                success: true,
                data: values
            });
        }
        catch (ex) {
            console.log('error when trying to add a paper to path');
            res.status(500).json({
                success: false,
                message: 'failed to add paper to path',
                error: ex instanceof Error ? ex.message : 'unknown error'
            })
        }
    }

    static getSessionTree = async (req: Request, res: Response): Promise<void> => {
        try {
            const sessionId = parseInt(req.params.id);
            if (!sessionId) {
                res.status(401).json({
                    success: false,
                    message: "session id is not valid"
                });
                return;
            }
            // check the type of sessionTree
            const sessionTree = await explorationRepo.getSessionTree(sessionId);
            res.status(200).json({
                success: true,
                data: sessionTree
            });
        } catch (ex) {
            console.log("error when trying to get session tree");
            res.status(500).json({
                success: false,
                message: 'failed to get session tree',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }
    
    static getBreadCrumbPath = async(req: Request, res: Response): Promise<void> => {
        try {
            const pathId = parseInt(req.params.id);
            if(!pathId) {
                res.status(401).json({
                    success:false,
                    message: "path id is not valid"
                });
                return;
            }
            const breadCrumbs = await explorationRepo.getBreadCrumbPath(pathId);
            // check if it needs validation
            res.status(200).json({
                success: true,
                data: breadCrumbs
            });
        } catch (ex) {
            console.log("error trying to get bread crumb for a path");
            res.status(500).json({
                success: false,
                message: 'failed to get bread crumb',
                error: ex instanceof Error ? ex.message : 'unkown error'
            });
        }
    }
}

export {
    ExplorationController,
}
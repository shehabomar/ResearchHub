import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';
import { PaperController } from '../controllers/PaperController';
import { ExplorationController } from '../controllers/ExplorationController';
import { CitationController } from '../controllers/CitationController';

const authRouter = Router();
const paperRouter = Router();
const explorationRouter = Router();
const citationRouter = Router();

// auth routes
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/user', authenticateToken, AuthController.getUser);
authRouter.post('/logout', authenticateToken, AuthController.logout);
// authRouter.get('/users', AuthController.getAllUsers); 

// Paper routes
paperRouter.post('/search', PaperController.searchPaper);
paperRouter.get('/:paperId', PaperController.getPaperById);
paperRouter.post('/search/author', PaperController.searchByAuthor);
paperRouter.get('/recent', PaperController.getRecentPapers);
paperRouter.get('/stats', PaperController.getPaperStats);

// Sessions and Exploration routes
explorationRouter.post('/sessions', authenticateToken, ExplorationController.createSession);
explorationRouter.get('/user-sessions', authenticateToken, ExplorationController.getUserSessions);
explorationRouter.get('/sessions/:id', authenticateToken, ExplorationController.getSessionById);
explorationRouter.put('/sessions/:id', authenticateToken, ExplorationController.updateSession);
explorationRouter.post('/sessions/:id/papers', authenticateToken, ExplorationController.addPaperToPath);
explorationRouter.get('/sessions/:id/tree', authenticateToken, ExplorationController.getSessionTree);
explorationRouter.get('/paths/:id/breadcrumb', authenticateToken, ExplorationController.getBreadCrumbPath);

// Citation routes
citationRouter.get('/tree/:paperId', CitationController.buildTree);
citationRouter.post('/tree/:paperId', CitationController.buildTree);
citationRouter.post('/tree/:paperId/progress', CitationController.buildTreeWithProgress);

// Admin utility routes 
paperRouter.post('/bulk-import', authenticateToken, PaperController.bulkImport);
paperRouter.get('/rate-limit', PaperController.getRateLimitStatus);

export { authRouter, paperRouter, explorationRouter, citationRouter };
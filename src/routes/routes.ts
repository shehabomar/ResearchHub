import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';
import { PaperController } from '../controllers/PaperController';

const authRouter = Router();
const paperRouter = Router();

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

// Admin utility routes 
paperRouter.post('/bulk-import', authenticateToken, PaperController.bulkImport);
paperRouter.get('/rate-limit', PaperController.getRateLimitStatus);

export { authRouter, paperRouter };
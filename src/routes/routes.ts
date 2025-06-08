import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

router.get('/user', authenticateToken, AuthController.getUser);
router.post('/logout', authenticateToken, AuthController.logout);

router.get('/users', AuthController.getAllUsers);

export { router as authRoutes };
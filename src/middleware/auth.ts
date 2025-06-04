import { Request, Response, NextFunction } from 'express';
import { jwtService, JWTPayload } from '../utils/jwt';

// extend express req interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token = jwtService.extractTokenFromAuthHeader(req.headers.authorization as string);

        // if no token in header, assign the one in cookies to it
        if (!token || req.cookies) {
            token = req.cookies.jwt;
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: "access token is required",
                code: 'TOKEN_MISSING'
            });
        }

        const decoded = jwtService.verifyToken(token as string);
        req.user = decoded; // add user info to req 

        console.log(`user authenticated: ${decoded.userId} (${decoded.email})`);

        next();
    }
    catch (err) {
        const msg = err instanceof Error? err.message : 'token verification failed';
        console.log(`auth failed: ${msg}`);

        res.status(403).json({
            success:false,
            msg,
            code: 'TOKEN_INVALID'
        });
    }
}

import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { Response } from 'express';

interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

interface AuthedUser {
    id: string;
    email: string;
    name: string;
}

class JWTService {
    private readonly secret: string;
    private readonly expiresIn: string;

    constructor() {
        this.secret = config.access_token_secret;
        this.expiresIn = config.jwt_expire_in || '24h';
    }

    generateToken = (user: AuthedUser): string => {
        const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
            userId: user.id,
            email: user.email
        };

        const options: SignOptions = {
            expiresIn: this.expiresIn as any,
        };

        return jwt.sign(payload, this.secret, options);
    }

    verifyToken = (token: string): JWTPayload => {
        try {
            return jwt.verify(token, this.secret) as JWTPayload;
        }
        catch (ex) {
            if (ex instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            }
            if (ex instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            throw new Error('Token verification failed');
        }
    }

    extractTokenFromAuthHeader = (authHeader: string): string | null => {
        if (!authHeader) return null;

        const parts = authHeader.split(' ')[1];
        if (parts && parts.length > 0) {
            return parts;
        }
        return null;
    }
}

const jwtService = new JWTService();
export { jwtService, JWTPayload, AuthedUser };
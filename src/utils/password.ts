import bcrypt from 'bcryptjs';
import { config } from '../config';

class PasswordService {
    private static readonly salt_rounds: number = parseInt(config.bcrypt_rounds);

    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.salt_rounds);
    }

    static async comparePasswords(pass: string, hash: string): Promise<boolean> {
        return bcrypt.compare(pass, hash);
    }

    static validatePass(pass: string): { isVal: boolean, errors: string[] } {
        const errors: string[] = [];

        if (!pass || pass.length < 8) {
            errors.push("password must be at least 8 chars long");
        }

        if (!/(?=.*[a-z])/.test(pass)) {
            errors.push('password must contain at least one lowercase letter');
        }

        if (!/(?=.*[A-Z])/.test(pass)) {
            errors.push('password must contain at least one uppercase letter');
        }

        if (!/(?=.*\d)/.test(pass)) {
            errors.push('password must contain at least one number');
        }

        if (!/(?=.*[@$!%*?&])/.test(pass)) {
            errors.push('password must contain at least one special character (@$!%*?&)');
        }

        return {
            isVal: errors.length === 0,
            errors
        };
    }
}


export const passwordService = new PasswordService();
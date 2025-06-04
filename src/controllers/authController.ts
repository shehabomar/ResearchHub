import { Request, Response } from "express";
import { jwtService } from "../utils/jwt";
import { PasswordService } from "../utils/password";

interface LoginRequest {
    email: string;
    password: string;
}

interface RegisterRequest {
    first_name: string;
    second_name: string;
    email: string;
    password: string;
}

interface User {
    id: string;
    email: string;
    first_name: string;
    second_name: string;
    password: string;
    created_at: Date;
}

const users: User[] = [];

class AuthController {
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const { first_name, second_name, email, password }: RegisterRequest = req.body;

            // validating user's data
            if (!first_name || !second_name || !email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'name, email, and password are required'
                })
            }

            // validate password
            if (!PasswordService.validatePass(password)) {
                res.status(400).json({
                    success: false,
                    message: "invalid password",
                    errors: PasswordService.validatePass(password).errors
                });
            }

            // check if user already exits
            const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message: "user already exists"
                });
                return;
            }

            // hash pass
            const hashed = await PasswordService.hashPassword(password);
            const newUser: User = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                first_name: first_name.trim(),
                second_name: second_name.trim(),
                email: email,
                password: hashed,
                created_at: new Date()
            }
            users.push(newUser);

            // generate token
            const token = jwtService.generateToken({ id: newUser.id, name: (newUser.first_name + ' ' + newUser.second_name), email: newUser.email });
            res.status(201).json({
                success: true,
                data: {
                    newUser,
                    token
                }
            })
        }
        catch (ex) {
            res.status(500).json({
                succes: false,
                message: 'internal server error'
            })
        }
    }

    // static async login(req: Request, res: Response): 
}
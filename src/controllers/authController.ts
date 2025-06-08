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
                });
                return;
            }

            // validate password
            if (!PasswordService.validatePass(password)) {
                res.status(400).json({
                    success: false,
                    message: "invalid password",
                    errors: PasswordService.validatePass(password).errors
                });
                return;
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

            console.log(`new user registered: ${newUser.first_name} ${newUser.second_name} (${newUser.email})`);

            // generate token
            const token = jwtService.generateToken({ id: newUser.id, name: (newUser.first_name + ' ' + newUser.second_name), email: newUser.email });
            res.status(201).json({
                success: true,
                data: {
                    newUser,
                    token
                }
            });
        }
        catch (ex) {
            res.status(500).json({
                succes: false,
                message: 'internal server error'
            });
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password }: LoginRequest = req.body;
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'email and password are required'
                });
                return;
            }

            // find user
            const user = users.find(user => user.email.toLowerCase() === email.toLowerCase());
            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'user not found'
                });
                return;
            }

            const isValid = await PasswordService.comparePasswords(password, user.password)
            if (!isValid) {
                res.status(401).json({
                    success: false,
                    message: 'invalid password'
                });
                return;
            }

            const token = jwtService.generateToken({
                id: user.id,
                name: `${user.first_name} ${user.second_name}`,
                email: user.email
            });

            res.status(200).json({
                success: true,
                message: 'user logged in successfully',
                data: {
                    user: {
                        id: user.id,
                        name: `${user.first_name} ${user.second_name}`,
                        email: user.email,
                        created_at: user.created_at
                    },
                    token
                }
            })
        }
        catch (ex) {

        }
    }

    static async getUser(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'user not authenticated'
                });
                return;
            }

            const user = users.find(u => u.id === req.user?.userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'user not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: `${user.first_name} ${user.second_name}`,
                        email: user.email,
                        created_at: user.created_at
                    }
                }

            });
        }
        catch (ex) {
            res.status(500).json({
                success: false,
                message: 'internal server error'
            });
        }
    }

    // logout user -> just sending confirmation for now
    static async logout(req: Request, res: Response): Promise<void> {
        try {
            if (req.user) {
                console.log(`user ${req.user.userId} logged out`);
            }

            res.status(200).json({
                success: true,
                message: 'user logged out successfully'
            });
        }
        catch (ex) {
            res.status(500).json({
                success: false,
                message: 'internal server error'
            });
        }
    }

    // for testing
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const userList = users.map(u => {
                return {
                    id: u.id,
                    name: `${u.first_name} ${u.second_name}`,
                    emial: u.email,
                    created_at: u.created_at
                }
            });
            res.status(200).json({
                success: true,
                data: {
                    users: userList,
                    count: userList.length
                }
            });
        }
        catch (ex) {
            res.status(500).json({
                success: false,
                message: 'internal server error'
            });
        }
    }
}

export { AuthController };
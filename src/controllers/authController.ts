import { Request, Response } from "express";
import { jwtService } from "../utils/jwt";
import { PasswordService } from "../utils/password";
import DatabaseService from "../db/db";

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
    id: number;
    email: string;
    first_name: string;
    second_name: string;
    password: string;
    created_at: Date;
}

const users: User[] = [];

class AuthController {
    static register = async (req: Request, res: Response): Promise<void> => {
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
            if (!PasswordService.validatePass(password).isVal) {
                res.status(400).json({
                    success: false,
                    message: "invalid password",
                    errors: PasswordService.validatePass(password).errors
                });
                return;
            }

            // check if user already exits
            const user_query = `SELECT id FROM users WHERE LOWER(email) = LOWER($1);`;
            const existingUser = await DatabaseService.query(user_query, [email]);
            if (existingUser.rows.length > 0) {
                res.status(409).json({
                    success: false,
                    message: "user already exists"
                });
                return;
            }

            // hash pass
            const hashed = await PasswordService.hashPassword(password);

            // using returning query to get user's id after insertion
            const new_user_query = `
                INSERT INTO users 
                (first_name, second_name, email, password)
                VALUES
                ($1, $2, $3, $4)
                RETURNING id, first_name, second_name, email, created_at;
            `;

            const result = await DatabaseService.query(
                new_user_query,
                [
                    first_name.trim(),
                    second_name.trim(),
                    email.trim().toLowerCase(),
                    hashed
                ]
            );

            const newUser = result.rows[0] as User;
            console.log(`new user registered: ${newUser.first_name} ${newUser.second_name} (${newUser.email})`);

            // generate token
            const token = jwtService.generateToken(
                {
                    id: newUser.id,
                    name: `${newUser.first_name} ${newUser.second_name}`,
                    email: newUser.email
                }
            );

            res.status(201).json({
                success: true,
                data: {
                    newUser,
                    token
                }
            });
        }
        catch (ex) {
            console.log(`error during registeration: ${ex}`);
            res.status(500).json({
                success: false,
                message: 'internal server error'
            });
        }
    }

    static login = async (req: Request, res: Response): Promise<void> => {
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
            const user_query = `
                SELECT id, first_name, second_name, email, password, created_at 
                FROM users 
                WHERE LOWER(email) = LOWER($1);
            `;
            const result = await DatabaseService.query(user_query, [email]);

            if (result.rows.length == 0) {
                res.status(401).json({
                    success: false,
                    message: 'user not found'
                });
                return;
            }

            const user = result.rows[0] as User;
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
            console.log(`error during login: ${ex}`);
            res.status(500).json({
                success: false,
                message: 'internal server error'
            });
        }
    }

    static getUser = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'user not authenticated'
                });
                return;
            }

            const user_query = `
                SELECT id, first_name, second_name, email, created_at
                FROM users
                WHERE id = $1;
            `;
            const result = await DatabaseService.query(user_query, [req.user.userId]);

            if (result.rows.length == 0) {
                res.status(404).json({
                    success: false,
                    message: 'user not found'
                });
                return;
            }

            const user = result.rows[0] as User;

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
    static logout = async (req: Request, res: Response): Promise<void> => {
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
    static getAllUsers = async (req: Request, res: Response): Promise<void> => {
        try {
            const userList = users.map(u => {
                return {
                    id: u.id,
                    name: `${u.first_name} ${u.second_name}`,
                    email: u.email,
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
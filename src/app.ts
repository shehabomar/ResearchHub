import express from 'express';
import { Pool } from 'pg';
import { config } from './config';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { jwtService } from './utils/jwt';

const app = express();

// db connection
const pool = new Pool({
    host: config.db_host,
    port: parseInt(config.db_port),
    user: config.db_user,
    password: config.db_password,
    database: config.db_name,
});

pool.on('connect', () => {
    console.log("connected to db");
});

pool.on('error', (err) => {
    console.error('Database connection error:', err);
});

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: config.server_url,
    credentials: true
}));

app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    next();
})

app.get('/', (req, res) => {
    res.send('hello from express');
});

app.post('/generate-token', (req, res) => {
    try {
        console.log("Request body:", req.body);
        const { userId, email, name } = req.body;
        const user = { id: userId, email, name };
        const token = jwtService.generateToken(user);
        res.status(200).send({ data: { token, user } });
    }
    catch (err) {
        console.log("Error generating token:", err);
        res.status(500).send({ error: 'Failed to generate token' });
    }
});

app.post('/verify-token', (req, res) => {
    try {
        const { token } = req.body;
        const decoded = jwtService.verifyToken(token);
        res.status(200).send({ data: decoded });
    }
    catch (ex) {
        console.log("Error verifying token:", ex);
    }
});

app.get('/proteceted', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromAuthHeader(authHeader as string);

    res.status(200).send({ data: { message: 'Protected route accessed', token } });
});

app.listen(config.port, () => {
    console.log(`server is running on port ${config.port}`);
});

export { app, pool };
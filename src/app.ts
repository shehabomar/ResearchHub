import express from 'express';

import { config } from './config';
import cors from 'cors';
import helmet from 'helmet';

import { jwtService } from './utils/jwt';
import { authRouter, paperRouter, citationRouter, explorationRouter } from './routes/routes';
import DatabaseService from './db/db';
import { explorationRepo } from './repositories/explorationRepository';

const app = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
        return callback(null, true); // fallback allow; tighten for production
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(helmet());

// logger
app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    next();
})

app.get('/', (req, res) => {
    res.send('hello from express');
});

// mounting routes
app.use('/api/auth', authRouter);
app.use('/api/papers', paperRouter);
app.use('/api/citations', citationRouter);
app.use('api/exploration', explorationRouter);

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

const start = async (): Promise<void> => {
    try {
        console.log("starting server...");
        await DatabaseService.initialize();

        app.listen(config.port, () => {
            console.log(`server is running on port ${config.port}`);
        });

    }
    catch (ex) {
        console.error("Error starting server:", ex);
        process.exit(1);
    }
}

if (require.main === module) {
    start();
}

export { app };
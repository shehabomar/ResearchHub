import express from 'express';
import { Pool } from 'pg';
import { config } from './config';
import cors from 'cors';


const app = express();

// db connection
const pool = new Pool({
    host: config.db_host,
    port: parseInt(config.db_port as string),
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
app.use(cors({
    origin: config.server_url,
    credentials: true
}));

app.get('/', (req, res) => {
    res.send('hello from express');
});

app.listen(config.port, () => {
    console.log(`server is running on port ${config.port}`);
});

export { app, pool };
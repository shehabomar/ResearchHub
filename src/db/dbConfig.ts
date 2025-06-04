import { Pool } from 'pg';
import { config } from '../config';

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

export { pool };
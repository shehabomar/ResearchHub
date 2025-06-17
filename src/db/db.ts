import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';

interface DbConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
}

class DatabaseService {
    private static pool: Pool | null = null;
    private static config: DbConfig;

    private static initializeDB(): DbConfig {
        return {
            host: config.db_host,
            port: parseInt(config.db_port),
            user: config.db_user,
            password: config.db_password,
            name: config.db_name,
        };
    }

    static async initialize(): Promise<void> {

        if (this.pool) {
            console.log("db already connected");
            return;
        }

        try {
            this.config = this.initializeDB();
            this.pool = new Pool(this.config);
            const client = await this.pool.connect();
            client.release();

            console.log("db connected successfully");

            this.pool.on('error', (err) => {
                console.error("db error during connection: ", err);
                process.exit(-1);
            });

            this.pool.on('connect', () => {
                console.log("new db connection established");
            });
        }
        catch (ex) {
            console.error("db connection error: ", ex);
            throw ex;
        }
    }

    static async query(text: string, params?: any[]): Promise<QueryResult> {

        if (!this.pool) {
            throw new Error("db not initialized");
        }

        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log(`query: ${text} in ${duration}ms`);
            return res;
        }
        catch (ex) {
            console.error("db query error: ", ex);
            throw ex;
        }
    }

    static async transaction(queries: Array<{ text: string, params?: any[] }>): Promise<QueryResult[]> {

        if (!this.pool) {
            throw new Error("db not initialized");
        }

        const client = await this.pool.connect();
        const resQueries: QueryResult[] = [];

        try {
            console.log("starting transaction");
            await client.query('BEGIN');
            for (let i = 0; i < queries.length; i++) {
                const { text, params } = queries[i];
                const res = await client.query(text, params);
                resQueries.push(res);
                console.log(`executed query ${i + 1}/${queries.length}: ${text}`);
            }
            await client.query('COMMIT');
            console.log("transaction committed successfully");
            return resQueries;
        }
        catch (ex) {
            await client.query('ROLLBACK');
            console.error('Tratsaction failed, rolled back:', ex);
            throw ex;
        }
        finally {
            client.release();
            console.log("db connection released"); // cleaned up
        }
    }

    static async close(): Promise<void> {
        if (!this.pool) {
            console.log("db not initialized, nothing to close");
            return;
        }

        try {
            await this.pool.end();
            console.log("db connection closed successfully");
        }
        catch (ex) {
            console.error("error closing db connection: ", ex);
            throw ex;
        }
        finally {
            this.pool = null; // reset pool
        }
    }

    // get client
    static async getClient(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error("db not initialized");
        }
        return this.pool.connect();
    }
}

export default DatabaseService;
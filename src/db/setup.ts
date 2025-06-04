import { pool } from '../app';
import fs from 'fs';
import path from 'path';

setupDb();

async function setupDb() {
    try {
        const sqlSchema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await pool.query(sqlSchema);
        await basicData();
    }
    catch (e) {
        console.log(`error setting up db: ${e}`);
    }
}

async function basicData() {
    try {
        const query = `insert into users (email, password_hash, first_name, second_name) values($1, $2, $3, $4)`;
        await pool.query(query, ['shehab@email.com', 'hashed', 'omar', 'user']);
        const query2 = `select * from users`;
        const result = await pool.query(query2);
        console.table(result.rows);
        console.log('done adding basic data');
    }
    catch (e) {
        console.log(`error adding basic data: ${e}`);
    }
}

if (require.main == module) {
    setupDb().then(() => {
        console.log('db setup completed');
        process.exit(0);
    }).catch((e) => { console.log(`error during db setup: ${e}`) });
}
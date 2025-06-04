import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT,
    server_url: process.env.SERVER_URL,
    db_port: process.env.DB_PORT,
    db_name: process.env.DB_NAME,
    db_host: process.env.DB_HOST,
    db_user: process.env.DB_USER,
    db_password: process.env.DB_PASSWORD,
}  
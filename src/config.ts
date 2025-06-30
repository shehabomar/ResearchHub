import dotenv from 'dotenv';
dotenv.config();

interface Config {
    port: string;
    server_url: string;
    db_port: string;
    db_name: string;
    db_host: string;
    db_user: string;
    db_password: string;
    access_token_secret: string;
    refresh_token_secret: string;
    jwt_expire_in: string;
    bcrypt_rounds: string;
}

const getEnvVar = (name: string): string => {
    const value = process.env[name] as string;
    return value;
}

export const config: Config = {
    port: getEnvVar('PORT'),
    server_url: getEnvVar('SERVER_URL'),
    db_port: getEnvVar('DB_PORT'),
    db_name: getEnvVar('DB_NAME'),
    db_host: getEnvVar('DB_HOST'),
    db_user: getEnvVar('DB_USER'),
    db_password: getEnvVar('DB_PASSWORD'),
    access_token_secret: getEnvVar('ACCESS_TOKEN_SECRET'),
    refresh_token_secret: getEnvVar('REFRESH_TOKEN_SECRET'),
    jwt_expire_in: getEnvVar('JWT_EXPIRE_IN'),
    bcrypt_rounds: getEnvVar('BCRYPT_ROUNDS'),
}
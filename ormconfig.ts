const env = require('dotenv');
const path = require('path');

env.config({
  path: path.join(__dirname, process.env.NODE_ENV ? `./env/.env.${process.env.NODE_ENV}` : ''),
});

process.env.ENVIRONMENT = process.env.ENVIRONMENT || process.env.NODE_ENV;

const basePath = process.env.ENVIRONMENT === 'dev' ? './src/' : './dist/';

module.exports = [
  {
    type: process.env.DATABASE_TYPE || 'postgres',
    host: process.env.DATABASE_URL,
    port: parseInt(process.env.DATABASE_PORT, 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [`${basePath}domain/**/entities/*{.ts,.js}`],
    migrations: [`${basePath}infra/database/migrations/*{.ts,.js}`],
  },
];

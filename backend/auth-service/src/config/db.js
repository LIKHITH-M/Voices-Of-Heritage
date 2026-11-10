const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'voices_heritage',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected client error', err);
});

/**
 * Execute a query with optional parameters.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 */
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };

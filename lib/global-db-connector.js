import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { parse as parsePgConnectionString } from 'pg-connection-string';

const parseConnectionUrl = (url) => {
    try {
        const parsed = parsePgConnectionString(url);
        return {
            host: parsed.host || 'localhost',
            port: parsed.port ? parseInt(parsed.port) : 5432,
            username: parsed.user,
            password: parsed.password,
            database: parsed.database,
            ssl: parsed.sslmode === 'require' ? { rejectUnauthorized: false } : false,
        };
    } catch (error) {
        throw new Error(`Invalid connection string: ${error.message}`);
    }
};

export const getDbConfig = (dbType, credentials) => {
    let config = credentials;
    if (dbType === 'postgresql' && credentials.host && (credentials.host.startsWith('postgresql://') || credentials.host.startsWith('postgres://'))) {
        config = parseConnectionUrl(credentials.host);
    }
    const baseConfig = {
        postgresql: {
            type: 'postgres',
            host: config.host || 'localhost',
            port: parseInt(config.port) || 5432,
            username: config.username,
            password: config.password,
            database: config.database,
            ssl: config.ssl || { rejectUnauthorized: false, requestCert: true }, // Neon's SSL requirements
            synchronize: false,
            logging: true,
            extra: {
                ssl: true, // Explicitly enable SSL for Neon
                connectionTimeoutMillis: 10000, // 10-second timeout
                idleTimeoutMillis: 30000, // 30-second idle timeout
            },
        },
        oracle: {
            type: 'oracle',
            host: config.host || 'localhost',
            port: parseInt(config.port) || 1521,
            username: config.username,
            password: config.password,
            database: config.database,
            sid: config.sid,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            synchronize: false,
            logging: false,
        },
        sqlserver: {
            type: 'mssql',
            host: config.host || 'localhost',
            port: parseInt(config.port) || 1433,
            username: config.username,
            password: config.password,
            database: config.database,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            synchronize: false,
            logging: false,
        },
    };
    return baseConfig[dbType];
};

export async function initializeDB(dbType, credentials) {
    const config = getDbConfig(dbType, credentials);
    if (!config) {
        throw new Error('Unsupported database type');
    }
    try {
        const dataSource = new DataSource(config);
        await dataSource.initialize();
        return dataSource;
    } catch (err) {
        throw new Error(`Failed to connect to ${dbType}: ${err.message}`);
    }
}

export async function testConnection(dbType, credentials) {
    let dataSource;
    try {
        dataSource = await initializeDB(dbType, credentials);
        await dataSource.query('SELECT 1');
        return dataSource;
    } catch (err) {
        throw new Error(`Connection test failed: ${err.message}`);
    } finally {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    }
}

export async function fetchTablesAndColumns(dbType, connection) {
    let tableQuery, columnQuery;
    switch (dbType) {
        case 'postgresql':
            tableQuery = `
                SELECT table_name, table_schema
                FROM information_schema.tables
                WHERE table_type = 'BASE TABLE'
                  AND table_schema NOT IN ('pg_catalog', 'information_schema')
            `;
            columnQuery = `
                SELECT table_name, column_name, table_schema
                FROM information_schema.columns
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            `;
            break;
        case 'oracle':
            tableQuery = `SELECT table_name FROM user_tables`;
            columnQuery = `SELECT table_name, column_name FROM user_tab_columns`;
            break;
        case 'sqlserver':
            tableQuery = `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'`;
            columnQuery = `SELECT table_name, column_name FROM information_schema.columns`;
            break;
        default:
            throw new Error('Unsupported database type');
    }

    try {
        const tablesResult = await connection.query(tableQuery);
        const columnsResult = await connection.query(columnQuery);

        const tableMap = {};
        tablesResult.forEach((row) => {
            const tableName = row.table_name || row.TABLE_NAME;
            const schemaName = row.table_schema || 'public';
            const key = `${schemaName}.${tableName}`;
            tableMap[key] = { table: tableName, schema: schemaName, columns: [] };
        });

        columnsResult.forEach((row) => {
            const tableName = row.table_name || row.TABLE_NAME;
            const schemaName = row.table_schema || 'public';
            const key = `${schemaName}.${tableName}`;
            if (tableMap[key]) {
                tableMap[key].columns.push(row.column_name || row.COLUMN_NAME);
            }
        });

        return Object.values(tableMap).map(({ table, schema, columns }) => ({
            table: `${schema}.${table}`,
            columns,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch tables and columns: ${error.message}`);
    }
}

export async function fetchTableData(connection, table, dbType, limit = 100, offset = 0) {
    const escapedTable = table.includes('.') ? `"${table.split('.').join('"."')}"` : table;
    const query = dbType === 'oracle'
        ? `SELECT * FROM ${escapedTable} WHERE ROWNUM > ${offset} AND ROWNUM <= ${limit + offset}`
        : `SELECT * FROM ${escapedTable} LIMIT ${limit} OFFSET ${offset}`;
    try {
        const rows = await connection.query(query);
        return Array.isArray(rows) ? rows : [rows];
    } catch (err) {
        throw new Error(`Failed to fetch data from ${table}: ${err.message}`);
    }
}

// Generate SQL query using OpenAI
export async function generateQuery(nlpPrompt) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const prompt = `Generate an SQL query for the following request: "${nlpPrompt}". Return only the query string.`;
    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt,
            max_tokens: 150,
        });
        return response.data.choices[0].text.trim();
    } catch (err) {
        throw new Error(`Failed to generate query: ${err.message}`);
    }
}
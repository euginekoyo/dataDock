import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';

async function handler(req, res) {
    const { dbType, connectionId } = req.query;
    const sessionConnections = req.session.get('connections') || {};

    if (!connectionId || !sessionConnections[connectionId]) {
        return res.status(400).json({ error: 'No active connection found' });
    }

    const { connectionKey, dbType: sessionDbType, credentials } = sessionConnections[connectionId];
    if (dbType !== sessionDbType) {
        return res.status(400).json({ error: 'Database type mismatch' });
    }

    try {
        let dataSource = connectionPool.connections.get(connectionKey);
        if (!dataSource || !dataSource.isInitialized) {
            console.log('Reinitializing connection for key:', connectionKey);
            await connectionPool.getConnection(dbType, credentials);
            dataSource = connectionPool.connections.get(connectionKey);
            if (!dataSource || !dataSource.isInitialized) {
                throw new Error('Failed to reinitialize connection');
            }
        }

        console.log('Executing queries with dataSource:', dataSource);
        const tablesQuery = `
            SELECT table_name, table_schema
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
        `;
        const columnsQuery = `
            SELECT table_name, column_name, table_schema
            FROM information_schema.columns
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        `;

        const tablesResult = await dataSource.query(tablesQuery);
        if (!tablesResult || !Array.isArray(tablesResult)) {
            throw new Error('Invalid query result for tables: ' + JSON.stringify(tablesResult));
        }
        const tables = tablesResult.map((row) => ({
            table: row.table_name,
            schema: row.table_schema,
        }));

        const columnsResult = await dataSource.query(columnsQuery);
        if (!columnsResult || !Array.isArray(columnsResult)) {
            throw new Error('Invalid query result for columns: ' + JSON.stringify(columnsResult));
        }
        const columnsMap = columnsResult.reduce((acc, row) => {
            if (!acc[row.table_name]) {
                acc[row.table_name] = [];
            }
            acc[row.table_name].push(row.column_name);
            return acc;
        }, {});

        const enrichedTables = tables.map((table) => ({
            ...table,
            columns: columnsMap[table.table] || [],
        }));

        return res.status(200).json(enrichedTables);
    } catch (error) {
        console.error('Failed to fetch tables:', {
            message: error.message,
            stack: error.stack,
            connectionKey,
            credentials,
            tablesResult: error.tablesResult || 'N/A',
            columnsResult: error.columnsResult || 'N/A',
        });
        return res.status(500).json({
            error: 'Failed to fetch tables',
            details: error.message || 'An unexpected error occurred',
        });
    }
}

export default withIronSession(handler, {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'dataDock-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
});
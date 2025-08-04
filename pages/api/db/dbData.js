import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';
import { fetchTableData } from '../../../lib/global-db-connector';

async function handler(req, res) {
    const { dbType, table, connectionId, limit = 100, offset = 0 } = req.query;

    if (!dbType || !table || !connectionId) {
        return res.status(400).json({ error: 'dbType, table, and connectionId are required' });
    }

    try {
        const sessionConnections = req.session.get('connections') || {};
        const connection = sessionConnections[connectionId];

        if (!connection || connection.dbType !== dbType) {
            return res.status(400).json({ error: 'No active connection found for the specified connectionId' });
        }

        const dataSource = await connectionPool.getConnection(dbType, connection.credentials);
        const data = await fetchTableData(dataSource, table, dbType, parseInt(limit), parseInt(offset));
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to fetch table data',
            details: error.message,
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
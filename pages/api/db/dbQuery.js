import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';
import { generateQuery } from '../../../lib/global-db-connector';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { dbType, nlpQuery, directQuery } = req.body;

    // Get session data
    const sessionDbType = req.session.get('dbType');
    const credentials = req.session.get('credentials');
    const connectionKey = req.session.get('connectionKey');
    const isConnected = req.session.get('isConnected');

    // Validate session
    if (!isConnected || !sessionDbType || !credentials || !connectionKey) {
        return res.status(400).json({ error: 'No active connection found in session' });
    }

    if (dbType !== sessionDbType) {
        return res.status(400).json({ error: 'Database type mismatch' });
    }

    if (!nlpQuery && !directQuery) {
        return res.status(400).json({ error: 'NLP query or direct query required' });
    }

    try {
        // Get connection from pool
        const dataSource = await connectionPool.getConnection(dbType, credentials);

        let query;
        if (directQuery) {
            query = directQuery;
        } else {
            query = await generateQuery(nlpQuery);
        }

        // Execute query
        const result = await dataSource.query(query);

        return res.status(200).json({
            query: query,
            data: result,
            rowCount: Array.isArray(result) ? result.length : 0
        });
    } catch (err) {
        console.error('Query execution error:', err);
        return res.status(500).json({
            error: err.message,
            query: query || 'Query generation failed'
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

import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { testConnection } from '../../../lib/global-db-connector';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { dbType, useConnectionString, connectionString, credentials } = req.body;

    if (!['postgresql', 'oracle', 'sqlserver'].includes(dbType)) {
        return res.status(400).json({ error: 'Invalid database type' });
    }

    try {
        const connectionCredentials = useConnectionString ? { host: connectionString } : credentials;
        await testConnection(dbType, connectionCredentials);
        return res.status(200).json({ message: `Successfully tested ${dbType} connection` });
    } catch (error) {
        console.error('Test connection error:', error);
        return res.status(500).json({
            error: 'Failed to test connection',
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
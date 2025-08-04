import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const stats = connectionPool.getStats();

        return res.status(200).json({
            ...stats,
            isConnected: req.session.get('isConnected') || false,
            dbType: req.session.get('dbType') || null
        });
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({ error: 'Failed to get statistics' });
    }
}

export default withIronSession(handler, {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'dataDock-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
});
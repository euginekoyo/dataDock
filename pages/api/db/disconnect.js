import 'reflect-metadata';
import { withIronSession } from 'next-iron-session';
import { connectionPool } from '../../../lib/connection-pool';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { connectionId } = req.body;
        if (!connectionId) {
            return res.status(400).json({ error: 'Connection ID is required' });
        }

        const sessionConnections = req.session.get('connections') || {};
        const connectionKey = sessionConnections[connectionId]?.connectionKey;

        if (connectionKey) {
            await connectionPool.removeConnection(connectionKey);
        }

        delete sessionConnections[connectionId];
        req.session.set('connections', sessionConnections);
        await req.session.save();

        return res.status(200).json({ message: 'Disconnected successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to disconnect', details: error.message });
    }
}

export default withIronSession(handler, {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'dataDock-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
    },
});
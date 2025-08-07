import clientPromise from '../../../lib/mongodb';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';

export default authMiddleware(async function handler(req, res) {
    try {
        if (req.method !== 'GET') {
            console.error('Roles Public API: Method not allowed', { method: req.method });
            return res.status(405).json({ message: 'Method not allowed' });
        }

        const client = await clientPromise;
        const db = client.db(process.env.DATABASE_NAME || 'DataDock');
        const roles = await db.collection('roles').find({}).toArray();

        if (!roles || roles.length === 0) {
            console.error('Roles Public API: No roles found in database');
            return res.status(404).json({ message: 'No roles found' });
        }

        // console.log('Roles Public API: Retrieved roles', roles.map(r => ({ name: r.name, permissions: r.permissions })));
        return res.status(200).json(roles);
    } catch (error) {
        console.error('Roles Public API error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';
import { roleMiddleware } from '../../../lib/middleware/roleMiddleware';

export default authMiddleware(roleMiddleware('manage_users')(async function handler(req, res) {
    const { id } = req.query;

    try {
        const client = await clientPromise;
        const db = client.db(process.env.DATABASE_NAME || 'DataDock');

        if (req.method === 'PUT') {
            const updates = req.body;
            delete updates._id; // Prevent updating _id
            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                { $set: updates }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({ message: 'User updated' });
        }

        if (req.method === 'DELETE') {
            const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({ message: 'User deleted' });
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('User operations error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
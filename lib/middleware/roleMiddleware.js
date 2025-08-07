import clientPromise from '../mongodb';

export const roleMiddleware = (requiredPermission) => (handler) => async (req, res) => {
    try {
        const { user } = req; // Set by authMiddleware
        if (!user || !user.role) {
            console.error('Role middleware: No user or role in request', { user });
            return res.status(401).json({ message: 'Unauthorized: No user role' });
        }

        const client = await clientPromise;
        const db = client.db(process.env.DATABASE_NAME || 'DataDock');
        const role = await db.collection('roles').findOne({ name: user.role });

        if (!role) {
            console.error('Role middleware: Role not found', { role: user.role });
            return res.status(403).json({ message: 'Role not found' });
        }

        if (!role.permissions.includes(requiredPermission)) {
            console.error('Role middleware: Permission denied', { role: user.role, requiredPermission });
            return res.status(403).json({ message: `Permission denied: ${requiredPermission} required` });
        }

        // console.log('Role middleware: Permission granted', { role: user.role, requiredPermission });
        return handler(req, res);
    } catch (error) {
        console.error('Role middleware error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
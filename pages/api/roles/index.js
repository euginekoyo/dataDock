import clientPromise from '../../../lib/mongodb';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';
import { roleMiddleware } from '../../../lib/middleware/roleMiddleware';

export default authMiddleware(roleMiddleware('manage_roles')(async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');

    if (req.method === 'GET') {
      const roles = await db.collection('roles').find({}).toArray();
      if (!roles || roles.length === 0) {
        console.error('Roles API: No roles found in database');
        return res.status(404).json({ message: 'No roles found' });
      }
      // console.log('Roles API: Retrieved roles', roles.map(r => ({ name: r.name, permissions: r.permissions })));
      return res.status(200).json(roles);
    }

    if (req.method === 'POST') {
      const { name, permissions } = req.body;
      if (!name) {
        console.error('Roles API: Missing role name in POST request');
        return res.status(400).json({ message: 'Role name is required' });
      }

      const existingRole = await db.collection('roles').findOne({ name });
      if (existingRole) {
        console.error('Roles API: Role already exists', { name });
        return res.status(400).json({ message: 'Role already exists' });
      }

      const role = {
        name: name.toUpperCase(),
        permissions: permissions || [],
        createdAt: new Date(),
      };

      const result = await db.collection('roles').insertOne(role);
      // console.log('Roles API: Created role', { name: role.name, permissions: role.permissions });
      return res.status(201).json({ ...role, _id: result.insertedId });
    }

    console.error('Roles API: Method not allowed', { method: req.method });
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Roles API error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}));
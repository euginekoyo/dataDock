import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../../../lib/email';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';
import { roleMiddleware } from '../../../lib/middleware/roleMiddleware';

export default authMiddleware(roleMiddleware('manage_users')(async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { name, email, role, status } = req.body;

    try {
        const client = await clientPromise;
        const db = client.db(process.env.DATABASE_NAME || 'DataDock');
        const existingUser = await db.collection('users').findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const user = {
            name,
            email,
            password: hashedPassword,
            role,
            status,
            createdAt: new Date(),
        };

        const result = await db.collection('users').insertOne(user);
        const tempToken = jwt.sign({ userId: result.insertedId, role }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        await sendWelcomeEmail(user, `http://localhost:5050/login?token=${tempToken}`);

        return res.status(201).json({ ...user, _id: result.insertedId, tempToken });
    } catch (error) {
        console.error('Create user error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
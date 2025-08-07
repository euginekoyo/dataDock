import clientPromise from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';

export default authMiddleware(async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.error('Me API: No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Me API: Decoded token', decoded);

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      console.error('Me API: User not found for userId', decoded.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // console.log('Me API: User found', { email: user.email, role: user.role });
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error('Me API error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
});
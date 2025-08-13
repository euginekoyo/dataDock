import clientPromise from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    console.error('Login: Missing email or password', { email });
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'DataDock');
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      console.error('Login: User not found', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.error('Login: Invalid password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      console.error('Login: Account not active', { email });
      return res.status(403).json({ message: 'Account is not active' });
    }

    const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    console.log('Login: Success', { userId: user._id.toString(), email, role: user.role });
    return res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login API error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
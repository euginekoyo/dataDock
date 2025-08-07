import { sendWelcomeEmail } from '../../../lib/email';
import { authMiddleware } from '../../../lib/middleware/authMiddleware';
import { roleMiddleware } from '../../../lib/middleware/roleMiddleware';

export default authMiddleware(
    roleMiddleware('manage_users')(async function handler(req, res) {
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method not allowed' });
        }

        const { user, tempLink } = req.body;

        if (!user || !tempLink) {
            return res.status(400).json({ message: 'Missing user or tempLink' });
        }

        try {
            await sendWelcomeEmail(user, tempLink);
            return res.status(200).json({ message: 'Welcome email sent' });
        } catch (error) {
            console.error('Email sending failed:', error);
            return res.status(500).json({ message: 'Failed to send welcome email' });
        }
    })
);
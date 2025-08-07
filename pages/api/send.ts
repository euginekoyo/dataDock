import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { EmailTemplate } from '../../components/EmailTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { name = 'John', tempLink = 'https://example.com/login' } = req.body;

    const { data, error } = await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>', // or your verified domain
        to: ['youremail@example.com'], // Replace with real email for testing
        subject: 'Hello world from Resend',
        react: EmailTemplate({ firstName: name, tempLink }), // ✅ rendered JSX
    });

    if (error) {
        console.error('❌ Email sending error:', error);
        return res.status(400).json(error);
    }

    console.log('✅ Email sent:', data);
    return res.status(200).json(data);
}

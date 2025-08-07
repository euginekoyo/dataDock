import { Resend } from 'resend';
import { EmailTemplate } from '../../components/EmailTemplate'; // Adjust path if needed

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = async (user, tempLink) => {
    try {
        console.log('➡️ Sending welcome email to:', user.email);
        console.log('📨 Using temp link:', tempLink);

        const { data, error } = await resend.emails.send({
            from: `Your Platform <onboarding@resend.dev>`,
            to: [user.email],
            subject: 'Welcome to Our Platform',
            react: EmailTemplate({ firstName: user.name, tempLink }),
        });

        console.log('✅ Resend response:', { data, error });

        if (error) {
            console.error('❌ Resend API error:', error);
            throw error;
        }

        return data;
    } catch (err) {
        console.error('❌ Email sending failed:', err);
        throw err;
    }
};

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App password from Gmail
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Email transporter verification failed:', error);
    } else {
        console.log('Email transporter is ready to send messages');
    }
});

export const sendWelcomeEmail = async (user, tempLink) => {
    try {
        const mailOptions = {
            from: `"Your Platform" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to Our Platform',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Welcome, ${user.name}!</h1>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Your account has been created successfully. Use the link below to log in:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${tempLink}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Login to Your Account
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #666;">
                        <strong>Note:</strong> This link expires in 24 hours for security reasons.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        If you didn't expect this email, please contact support.
                    </p>
                </div>
            `,
            text: `Welcome, ${user.name}! Your account has been created. Login here: ${tempLink} (This link expires in 24 hours)`
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        throw error;
    }
};
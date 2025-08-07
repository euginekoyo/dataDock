import * as React from 'react';

interface EmailTemplateProps {
    firstName: string;
    tempLink: string;
}

export function EmailTemplate({ firstName, tempLink }: EmailTemplateProps) {
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '0 auto' }}>
            <h1 style={{ color: '#333', textAlign: 'center' }}>Welcome, {firstName}!</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6 }}>
                Your account has been created successfully. Use the link below to log in:
            </p>
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <a
                    href={tempLink}
                    style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '12px 30px',
                        textDecoration: 'none',
                        borderRadius: 5,
                        fontWeight: 'bold',
                    }}
                >
                    Login to Your Account
                </a>
            </div>
            <p style={{ fontSize: 14, color: '#666' }}>
                <strong>Note:</strong> This link expires in 24 hours for security reasons.
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
                If you didn't expect this email, please contact support.
            </p>
        </div>
    );
}

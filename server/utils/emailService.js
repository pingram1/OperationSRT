const nodemailer = require('nodemailer');

/**
 * Create a reusable transporter object using SMTP transport
 * For production, configure these in environment variables
 */
const createTransporter = () => {
    // Check if email is configured
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || emailUser || 'noreply@startrighttutoring.com';

    // If no email configuration, return null (emails will be logged only)
    if (!emailHost || !emailUser || !emailPass) {
        console.log('[emailService] Email not configured. Emails will be logged to console only.');
        return null;
    }

    return nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort || '587'),
        secure: emailPort === '465', // true for 465, false for other ports
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
};

/**
 * Send tutor account creation email
 * @param {string} tutorEmail - The tutor's email address
 * @param {string} tutorName - The tutor's name
 * @param {string} defaultPassword - The default password for the account
 * @param {string} loginUrl - The URL to the login page
 * @returns {Promise<boolean>} - True if email was sent successfully, false otherwise
 */
const sendTutorAccountEmail = async (tutorEmail, tutorName, defaultPassword, loginUrl = 'http://localhost:5173/login') => {
    try {
        const transporter = createTransporter();

        const emailContent = {
            from: `"StartRight Tutoring" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@startrighttutoring.com'}>`,
            to: tutorEmail,
            subject: 'Welcome to StartRight Tutoring - Your Account Has Been Created',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .credentials { background: #fff; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0; }
                        .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to StartRight Tutoring!</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${tutorName},</p>
                            <p>Your tutor account has been created by the StartRight Tutoring administration team. You can now log in to access your tutor portal.</p>
                            
                            <div class="credentials">
                                <p><strong>Your Login Credentials:</strong></p>
                                <p><strong>Email:</strong> ${tutorEmail}</p>
                                <p><strong>Password:</strong> <span class="password">${defaultPassword}</span></p>
                            </div>
                            
                            <p><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
                            
                            <div style="text-align: center;">
                                <a href="${loginUrl}" class="button">Log In to Your Account</a>
                            </div>
                            
                            <p>If you have any questions or need assistance, please contact the administration team.</p>
                            
                            <p>Best regards,<br>The StartRight Tutoring Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Welcome to StartRight Tutoring!

Hello ${tutorName},

Your tutor account has been created by the StartRight Tutoring administration team. You can now log in to access your tutor portal.

Your Login Credentials:
Email: ${tutorEmail}
Password: ${defaultPassword}

Important: For security reasons, please change your password after your first login.

Log in at: ${loginUrl}

If you have any questions or need assistance, please contact the administration team.

Best regards,
The StartRight Tutoring Team

---
This is an automated message. Please do not reply to this email.
            `,
        };

        if (transporter) {
            const info = await transporter.sendMail(emailContent);
            console.log(`[emailService] Tutor account email sent to ${tutorEmail}:`, info.messageId);
            return true;
        } else {
            // Log email content if email is not configured
            console.log('[emailService] Email not configured. Email content that would be sent:');
            console.log('To:', tutorEmail);
            console.log('Subject:', emailContent.subject);
            console.log('Body:', emailContent.text);
            return false;
        }
    } catch (error) {
        console.error('[emailService] Error sending tutor account email:', error);
        // Don't throw - allow account creation even if email fails
        return false;
    }
};

module.exports = {
    sendTutorAccountEmail,
};













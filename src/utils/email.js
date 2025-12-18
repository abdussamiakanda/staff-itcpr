import { marked } from 'marked';

export const markdownToHtml = (markdown) => {
    if (!markdown) return '';
    return marked.parse(markdown);
};

export async function sendEmail(email, subject, message) {
    // Email sending disabled - set to true to enable
    const EMAIL_SENDING_ENABLED = true;

    if (!EMAIL_SENDING_ENABLED) {
        console.log('Email sending disabled. Would send to:', email, 'Subject:', subject);
        return true;
    }

    try {
        const apiUrl = import.meta.env.VITE_API_EMAIL_URL;
        if (!apiUrl) {
            throw new Error('VITE_API_EMAIL_URL is not defined in environment variables');
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({
                to: email,
                subject: subject,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Email sent successfully:', data.message);
            return true;
        } else {
            throw new Error(data.message || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
}

export function getEmailTemplate(name, message, subscribe = false) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <div style="border-bottom: 1px solid rgb(157, 157, 189); text-align: center; width: 100%;">
                    <span style="font-size: 30px; font-weight: bold; color: rgb(157, 157, 189);">ITCPR</span>
                </div>
                
                <div style="padding: 10px; background-color: #ffffff;">
                    <p>Dear ${name},</p>
                    ${message}
                    <p>Best regards,<br>The ITCPR Team</p>
                </div>

                <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    <p>© ${new Date().getFullYear()} ITCPR. All rights reserved.</p>
                    <p>This is an automated message, please do not reply. ${subscribe ? '<br> You are receiving this email because you subscribed to our newsletter or other communications from us. <br> <a href="https://itcpr.org/unsubscribe">Click here</a> to unsubscribe.' : ''}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

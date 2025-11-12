const express = require('express');
const router = express.Router();
const mailgun = require('mailgun-js');

// Initialize Mailgun
const mg = mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    host: process.env.MAILGUN_REGION === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net'
});

/**
 * POST /api/send-email
 * Send contact form emails via Mailgun
 */
router.post('/send-email', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ 
                error: 'Name, email, and message are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Build email HTML content
        const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .field { margin-bottom: 20px; }
                    .label { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
                    .value { background: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin: 0;">New Contact Form Submission</h2>
                    </div>
                    <div class="content">
                        <div class="field">
                            <div class="label">Name:</div>
                            <div class="value">${name}</div>
                        </div>
                        <div class="field">
                            <div class="label">Email:</div>
                            <div class="value"><a href="mailto:${email}">${email}</a></div>
                        </div>
                        ${phone ? `
                        <div class="field">
                            <div class="label">Phone:</div>
                            <div class="value"><a href="tel:${phone}">${phone}</a></div>
                        </div>
                        ` : ''}
                        ${service ? `
                        <div class="field">
                            <div class="label">Service Interested In:</div>
                            <div class="value">${service}</div>
                        </div>
                        ` : ''}
                        <div class="field">
                            <div class="label">Message:</div>
                            <div class="value">${message.replace(/\n/g, '<br>')}</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This email was sent from your website contact form.</p>
                        <p>Received on ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Plain text version
        const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
${service ? `Service: ${service}` : ''}

Message:
${message}

Received on ${new Date().toLocaleString()}
        `;

        // Email data
        const emailData = {
            from: `Website Contact Form <noreply@${process.env.MAILGUN_DOMAIN}>`,
            to: process.env.RECIPIENT_EMAIL,
            subject: `New Contact Form Submission from ${name}`,
            html: emailContent,
            text: textContent,
            'h:Reply-To': email
        };

        // Send email
        await mg.messages().send(emailData);

        // Send auto-reply to customer
        const autoReplyData = {
            from: `Your Business <noreply@${process.env.MAILGUN_DOMAIN}>`,
            to: email,
            subject: 'Thank you for contacting us',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9fafb; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 style="margin: 0;">Thank You for Contacting Us!</h2>
                        </div>
                        <div class="content">
                            <p>Hi ${name},</p>
                            <p>Thank you for reaching out to us. We've received your message and will get back to you as soon as possible.</p>
                            <p>In the meantime, feel free to explore our services or give us a call if you have any urgent questions.</p>
                            <p>Best regards,<br>Your Business Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated response. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Hi ${name},\n\nThank you for reaching out to us. We've received your message and will get back to you as soon as possible.\n\nBest regards,\nYour Business Team`
        };

        // Send auto-reply (don't wait for it, send in background)
        mg.messages().send(autoReplyData).catch(err => {
            console.error('Auto-reply error:', err);
        });

        res.status(200).json({ 
            message: 'Thank you! Your message has been sent successfully.',
            success: true 
        });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ 
            error: 'Failed to send email. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

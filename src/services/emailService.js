const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: false, // Always false for port 587, use STARTTLS
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          } : undefined,
          tls: {
            rejectUnauthorized: false
          },
          requireTLS: true,
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000
        });

      console.log('📧 Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendOTPEmail(email, name, otp) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      console.log(process.env.SMTP_USER, process.env.SMTP_PASSWORD)
      const mailOptions = {
        from: `"${process.env.SMTP_USER || 'Test BG App'}" <${process.env.SMTP_USER || 'noreply@test-bg.com'}>`,
        to: email,
        subject: 'Email Verification - Test BG App',
        html: this.generateOTPEmailTemplate(name, otp),
        text: this.generateOTPEmailText(name, otp)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendMagicLinkEmail(email, name, magicLink) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Test BG App'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@test-bg.com'}>`,
        to: email,
        subject: 'Email Verification - Magic Link',
        html: this.generateMagicLinkEmailTemplate(name, magicLink),
        text: this.generateMagicLinkEmailText(name, magicLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Magic link email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send magic link email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWelcomeEmail(email, name) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Test BG App'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@test-bg.com'}>`,
        to: email,
        subject: 'Welcome to Test BG App!',
        html: this.generateWelcomeEmailTemplate(name),
        text: this.generateWelcomeEmailText(name)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateOTPEmailTemplate(name, otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code { background: #007bff; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'User'}!</h2>
            <p>Thank you for registering with Test BG App. To complete your registration and verify your email address, please use the following verification code:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
            
            <div class="warning">
              <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </div>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <p>Best regards,<br>The Test BG App Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOTPEmailText(name, otp) {
    return `
Hello ${name || 'User'}!

Thank you for registering with Test BG App. To complete your registration and verify your email address, please use the following verification code:

${otp}

This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.

Security Notice: Never share this code with anyone. Our team will never ask for your verification code.

If you didn't create an account with us, please ignore this email.

Best regards,
The Test BG App Team

---
This is an automated message. Please do not reply to this email.
    `;
  }

  generateMagicLinkEmailTemplate(name, magicLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Magic Link</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .magic-link-btn { 
            background: #007bff; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block; 
            margin: 20px 0; 
            font-weight: bold;
            text-align: center;
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .link-text { 
            background: #e9ecef; 
            padding: 15px; 
            border-radius: 5px; 
            word-break: break-all; 
            font-family: monospace; 
            font-size: 12px; 
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${name || 'User'}!</h2>
            <p>Thank you for registering with Test BG App. To complete your registration and verify your email address, please click the magic link below:</p>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="magic-link-btn">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-text">${magicLink}</div>
            
            <p>This link will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
            
            <div class="warning">
              <strong>Security Notice:</strong> Never share this link with anyone. Our team will never ask for your verification link. If you didn't create an account with us, please ignore this email.
            </div>
            
            <p>Best regards,<br>The Test BG App Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateMagicLinkEmailText(name, magicLink) {
    return `
Hello ${name || 'User'}!

Thank you for registering with Test BG App. To complete your registration and verify your email address, please click the magic link below:

${magicLink}

This link will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.

Security Notice: Never share this link with anyone. Our team will never ask for your verification link. If you didn't create an account with us, please ignore this email.

Best regards,
The Test BG App Team

---
This is an automated message. Please do not reply to this email.
    `;
  }

  generateWelcomeEmailTemplate(name) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Test BG App</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Test BG App!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
            
            <p>You can now:</p>
            <ul>
              <li>Access all features of the application</li>
              <li>Update your profile information</li>
              <li>Customize your preferences</li>
              <li>Connect with other users</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Welcome aboard!<br>The Test BG App Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWelcomeEmailText(name) {
    return `
Hello ${name}!

Congratulations! Your email has been successfully verified and your account is now active.

You can now:
- Access all features of the application
- Update your profile information
- Customize your preferences
- Connect with other users

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome aboard!
The Test BG App Team

---
This is an automated message. Please do not reply to this email.
    `;
  }

  async testConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();

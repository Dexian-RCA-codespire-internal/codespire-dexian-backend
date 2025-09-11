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
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.port === 465, // true for 465, false for other ports
          auth: config.email.smtp.user ? {
            user: config.email.smtp.user,
            pass: config.email.smtp.password
          } : undefined,
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          requireTLS: config.email.smtp.port === 587, // true for port 587
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
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
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
      console.log('📧 sendMagicLinkEmail called with:', { email, name, magicLink });
      if (!this.transporter) {
        console.error('❌ Email transporter not initialized');
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
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
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
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
            
            <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
            
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

This code will expire in ${config.otp.expiryMinutes} minutes.

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
            
            <p>This link will expire in ${config.otp.expiryMinutes} minutes.</p>
            
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

This link will expire in ${config.otp.expiryMinutes} minutes.

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

  async sendPasswordResetOTPEmail(email, name, otp) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
        to: email,
        subject: 'Password Reset OTP - Test BG App',
        html: this.generatePasswordResetOTPEmailTemplate(name, otp),
        text: this.generatePasswordResetOTPEmailText(name, otp)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset OTP email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Password reset OTP email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send password reset OTP email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendPasswordResetEmail(email, name, resetLink) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
        to: email,
        subject: 'Password Reset - Test BG App',
        html: this.generatePasswordResetEmailTemplate(name, resetLink),
        text: this.generatePasswordResetEmailText(name, resetLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generatePasswordResetEmailTemplate(name, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Test BG App</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .reset-button {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            transition: background-color 0.3s;
          }
          .reset-button:hover {
            background-color: #c0392b;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .link-text {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 5px;
            word-break: break-all;
            font-family: monospace;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Test BG App</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <h2>Hello ${name || 'User'}!</h2>
          <p>We received a request to reset your password for your Test BG App account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-text">${resetUrl}</div>
          
          <p>This link will expire in ${config.otp.expiryMinutes} minutes for security reasons.</p>
          
          <div class="warning">
            <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Never share this link with anyone.
          </div>
          
          <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
          
          <div class="footer">
            <p>This email was sent from Test BG App. If you have any questions, please contact our support team.</p>
            <p>&copy; 2024 Test BG App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetOTPEmailTemplate(name, otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP - Test BG App</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .otp-code {
            background-color: #e74c3c;
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 5px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Test BG App</div>
            <h1>Password Reset OTP</h1>
          </div>
          
          <h2>Hello ${name || 'User'}!</h2>
          <p>We received a request to reset your password for your Test BG App account. Use the following OTP to reset your password:</p>
          
          <div class="otp-code">${otp}</div>
          
          <p>This OTP will expire in ${config.otp.expiryMinutes} minutes for security reasons.</p>
          
          <div class="warning">
            <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP. If you didn't request a password reset, please ignore this email.
          </div>
          
          <p>If you're having trouble, please contact our support team.</p>
          
          <div class="footer">
            <p>This email was sent from Test BG App. If you have any questions, please contact our support team.</p>
            <p>&copy; 2024 Test BG App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetOTPEmailText(name, otp) {
    return `
Password Reset OTP - Test BG App

Hello ${name || 'User'}!

We received a request to reset your password for your Test BG App account. Use the following OTP to reset your password:

${otp}

This OTP will expire in ${config.otp.expiryMinutes} minutes for security reasons.

Security Notice: Never share this OTP with anyone. Our team will never ask for your OTP. If you didn't request a password reset, please ignore this email.

If you're having trouble, please contact our support team.

Best regards,
The Test BG App Team

---
This email was sent from Test BG App. If you have any questions, please contact our support team.
© 2024 Test BG App. All rights reserved.
    `;
  }

  generatePasswordResetEmailTemplate(name, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Test BG App</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .title {
            color: #e74c3c;
            font-size: 20px;
            margin-bottom: 20px;
          }
          .content {
            margin: 20px 0;
          }
          .reset-button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .reset-button:hover {
            background-color: #2980b9;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Test BG App</div>
            <div class="title">Password Reset Request</div>
          </div>
          
          <div class="content">
            <p>Hello ${name || 'User'}!</p>
            
            <p>We received a request to reset your password for your Test BG App account. Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${resetLink}</p>
            
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>If you're having trouble or didn't request this password reset, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The Test BG App Team</p>
            <p>This email was sent from Test BG App. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordResetEmailText(name, resetLink) {
    return `
Password Reset - Test BG App

Hello ${name || 'User'}!

We received a request to reset your password for your Test BG App account. Click the link below to reset your password:

${resetLink}

This link will expire in 1 hour for security reasons.

Security Notice: If you didn't request a password reset, please ignore this email and your password will remain unchanged.

If you're having trouble, please contact our support team.

Best regards,
The Test BG App Team

----
This email was sent from Test BG App. If you have any questions, please contact our support team.
    `;
  }
}

module.exports = new EmailService();

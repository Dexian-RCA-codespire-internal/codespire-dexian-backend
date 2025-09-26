const nodemailer = require('nodemailer');
const config = require('../config');
const { generateEmailData, getAvailableTemplates, addTemplate, removeTemplate } = require('../emailTemplates/EmailTemplateManager');

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
        html: generateEmailData('otp', { name, otp }).html,
        text: generateEmailData('otp', { name, otp }).text
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
        html: generateEmailData('magicLink', { name, magicLink }).html,
        text: generateEmailData('magicLink', { name, magicLink }).text
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
        html: generateEmailData('welcome', { name }).html,
        text: generateEmailData('welcome', { name }).text
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
        html: generateEmailData('passwordResetOTP', { name, otp }).html,
        text: generateEmailData('passwordResetOTP', { name, otp }).text
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
        html: generateEmailData('passwordReset', { name, resetUrl: resetLink }).html,
        text: generateEmailData('passwordReset', { name, resetUrl: resetLink }).text
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


  // ==================== NEW TEMPLATE-BASED EMAIL METHODS ====================

  // Generic method to send emails using templates
  async sendTemplateEmail(templateName, data, recipients) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Generate email content using template
      const emailData = generateEmailData(templateName, data);
      
      // Ensure recipients is an array
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];

      const mailOptions = {
        from: `"${config.email.smtp.fromName}" <${config.email.smtp.fromEmail}>`,
        to: recipientList.join(', '),
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ ${templateName} email sent successfully:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        template: templateName
      };
    } catch (error) {
      console.error(`❌ Failed to send ${templateName} email:`, error);
      return {
        success: false,
        error: error.message,
        template: templateName
      };
    }
  }

  // Convenience methods for specific email types
  async sendWelcomeEmailTemplate(email, name, features = []) {
    return this.sendTemplateEmail('welcome', { name, features }, email);
  }

  async sendNewTicketEmailTemplate(recipients, ticketData) {
    return this.sendTemplateEmail('newTicket', ticketData, recipients);
  }

  async sendSLABreachWarningEmailTemplate(recipients, slaData) {
    return this.sendTemplateEmail('slaBreachWarning', slaData, recipients);
  }

  async sendTicketAssignmentEmailTemplate(recipients, assignmentData) {
    return this.sendTemplateEmail('ticketAssignment', assignmentData, recipients);
  }

  async sendTicketResolutionEmailTemplate(recipients, resolutionData) {
    return this.sendTemplateEmail('ticketResolution', resolutionData, recipients);
  }

  async sendOTPEmailTemplate(recipients, otpData) {
    return this.sendTemplateEmail('otp', otpData, recipients);
  }

  async sendMagicLinkEmailTemplate(recipients, magicLinkData) {
    return this.sendTemplateEmail('magicLink', magicLinkData, recipients);
  }

  async sendPasswordResetEmailTemplate(recipients, passwordResetData) {
    return this.sendTemplateEmail('passwordReset', passwordResetData, recipients);
  }

  async sendPasswordResetOTPEmailTemplate(recipients, passwordResetOTPData) {
    return this.sendTemplateEmail('passwordResetOTP', passwordResetOTPData, recipients);
  }

  // Get available templates
  getAvailableTemplates() {
    return getAvailableTemplates();
  }

  // Add a new template
  addEmailTemplate(name, templateFunctions) {
    addTemplate(name, templateFunctions);
  }

  // Remove a template
  removeEmailTemplate(name) {
    removeTemplate(name);
  }
}

module.exports = new EmailService();

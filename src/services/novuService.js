const { Novu } = require('@novu/node');
const config = require('../config');

class NovuService {
  constructor() {
    this.novu = null;
    this.initialize();
  }

  initialize() {
    try {
      if (config.novu?.apiKey) {
        this.novu = new Novu(config.novu.apiKey);
        console.log('✅ Novu client initialized successfully');
      } else {
        console.log('⚠️  Novu API key not configured');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Novu client:', error);
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} templateId - Novu template ID (optional)
   */
  async sendOTP(email, otp, templateId = 'otp-verification') {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.trigger(templateId, {
        to: {
          subscriberId: email,
          email: email
        },
        payload: {
          otp: otp,
          email: email
        }
      });

      console.log(`✅ OTP sent to ${email}:`, result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to send OTP:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {string} name - User name
   * @param {string} templateId - Novu template ID (optional)
   */
  async sendWelcomeEmail(email, name, templateId = 'welcome-email') {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.trigger(templateId, {
        to: {
          subscriberId: email,
          email: email
        },
        payload: {
          name: name,
          email: email
        }
      });

      console.log(`✅ Welcome email sent to ${email}:`, result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} templateId - Novu template ID (optional)
   */
  async sendPasswordResetEmail(email, resetToken, templateId = 'password-reset') {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.trigger(templateId, {
        to: {
          subscriberId: email,
          email: email
        },
        payload: {
          email: email,
          resetToken: resetToken,
          resetUrl: `${config.supertokens.appDomain}/reset-password?token=${resetToken}`
        }
      });

      console.log(`✅ Password reset email sent to ${email}:`, result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom notification
   * @param {string} email - Recipient email
   * @param {string} templateId - Novu template ID
   * @param {object} payload - Template payload
   */
  async sendNotification(email, templateId, payload = {}) {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.trigger(templateId, {
        to: {
          subscriberId: email,
          email: email
        },
        payload: {
          email: email,
          ...payload
        }
      });

      console.log(`✅ Notification sent to ${email}:`, result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a subscriber
   * @param {string} email - Subscriber email
   * @param {object} data - Additional subscriber data
   */
  async createSubscriber(email, data = {}) {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.subscribers.identify(email, {
        email: email,
        ...data
      });

      console.log(`✅ Subscriber created: ${email}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to create subscriber:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update subscriber
   * @param {string} email - Subscriber email
   * @param {object} data - Updated subscriber data
   */
  async updateSubscriber(email, data = {}) {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      const result = await this.novu.subscribers.update(email, data);

      console.log(`✅ Subscriber updated: ${email}`);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('❌ Failed to update subscriber:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete subscriber
   * @param {string} email - Subscriber email
   */
  async deleteSubscriber(email) {
    try {
      if (!this.novu) {
        throw new Error('Novu client not initialized');
      }

      await this.novu.subscribers.delete(email);

      console.log(`✅ Subscriber deleted: ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete subscriber:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.novu) {
        return { status: 'not_configured', timestamp: new Date().toISOString() };
      }

      // Try to get subscribers to test connection
      await this.novu.subscribers.list({ page: 0, limit: 1 });
      
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

module.exports = new NovuService();


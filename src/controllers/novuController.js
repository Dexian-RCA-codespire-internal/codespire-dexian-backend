const novuService = require('../services/novuService');

/**
 * Send OTP email
 */
const sendOTP = async (req, res) => {
  try {
    const { email, otp, templateId } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    const result = await novuService.sendOTP(email, otp, templateId);

    if (result.success) {
      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (req, res) => {
  try {
    const { email, name, templateId } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }

    const result = await novuService.sendWelcomeEmail(email, name, templateId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Welcome email sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email, resetToken, templateId } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Email and reset token are required'
      });
    }

    const result = await novuService.sendPasswordResetEmail(email, resetToken, templateId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send password reset email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Send custom notification
 */
const sendNotification = async (req, res) => {
  try {
    const { email, templateId, payload } = req.body;

    if (!email || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Email and template ID are required'
      });
    }

    const result = await novuService.sendNotification(email, templateId, payload);

    if (result.success) {
      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Create subscriber
 */
const createSubscriber = async (req, res) => {
  try {
    const { email, ...data } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await novuService.createSubscriber(email, data);

    if (result.success) {
      res.json({
        success: true,
        message: 'Subscriber created successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Create subscriber error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Update subscriber
 */
const updateSubscriber = async (req, res) => {
  try {
    const { email, ...data } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await novuService.updateSubscriber(email, data);

    if (result.success) {
      res.json({
        success: true,
        message: 'Subscriber updated successfully',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update subscriber error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Delete subscriber
 */
const deleteSubscriber = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await novuService.deleteSubscriber(email);

    if (result.success) {
      res.json({
        success: true,
        message: 'Subscriber deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Health check
 */
const healthCheck = async (req, res) => {
  try {
    const result = await novuService.healthCheck();
    
    if (result.status === 'healthy') {
      res.json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    console.error('Novu health check error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  sendOTP,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotification,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  healthCheck
};


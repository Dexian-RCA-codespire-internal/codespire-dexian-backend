// new file servicenow - OTP Email Template Functions
const { generateBaseHtml } = require('./BaseEmailTemplate');
const config = require('../config');

function getOTPEmailSubject(data) {
  return 'Email Verification - Dexian';
}

function generateOTPEmailHtmlTemplate(data) {
  const { name, otp } = data;
  
  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>Thank you for registering with Dexian. To complete your registration and verify your email address, please use the following verification code:</p>
    
    <div style="background: #84CC16; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 5px;">
      ${otp}
    </div>
    
    <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
    
    <div class="warning">
      <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
    </div>
    
    <p>If you didn't create an account with us, please ignore this email.</p>
    
    <p>Best regards,<br>The Dexian Team</p>
  `;

  return generateBaseHtml('Email Verification', content, '#84CC16');
}

function generateOTPEmailTextTemplate(data) {
  const { name, otp } = data;
  
  return `
Hello ${name || 'User'}!

Thank you for registering with Dexian. To complete your registration and verify your email address, please use the following verification code:

${otp}

This code will expire in ${config.otp.expiryMinutes} minutes.

Security Notice: Never share this code with anyone. Our team will never ask for your verification code.

If you didn't create an account with us, please ignore this email.

Best regards,
The Dexian Team

---
This is an automated message. Please do not reply to this email.
© 2024 Dexian. All rights reserved.
  `;
}

module.exports = {
  getOTPEmailSubject,
  generateOTPEmailHtmlTemplate,
  generateOTPEmailTextTemplate
};

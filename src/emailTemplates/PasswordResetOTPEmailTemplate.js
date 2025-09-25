// new file servicenow - Password Reset OTP Email Template Functions
const { generateBaseHtml } = require('./BaseEmailTemplate');
const config = require('../config');

function getPasswordResetOTPEmailSubject(data) {
  return 'Password Reset OTP - Test BG App';
}

function generatePasswordResetOTPEmailHtmlTemplate(data) {
  const { name, otp } = data;
  
  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>We received a request to reset your password for your Dexian App account. Use the following OTP to reset your password:</p>
    
    <div style="background-color: #e74c3c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; letter-spacing: 5px;">
      ${otp}
    </div>
    
    <p>This OTP will expire in ${config.otp.expiryMinutes} minutes for security reasons.</p>
    
    <div class="warning">
      <strong>Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP. If you didn't request a password reset, please ignore this email.
    </div>
    
    <p>If you're having trouble, please contact our support team.</p>
  `;

  return generateBaseHtml('Password Reset OTP', content, '#e74c3c');
}

function generatePasswordResetOTPEmailTextTemplate(data) {
  const { name, otp } = data;
  
  return `
Password Reset OTP - Dexian

Hello ${name || 'User'}!

We received a request to reset your password for your Dexian App account. Use the following OTP to reset your password:

${otp}

This OTP will expire in ${config.otp.expiryMinutes} minutes for security reasons.

Security Notice: Never share this OTP with anyone. Our team will never ask for your OTP. If you didn't request a password reset, please ignore this email.

If you're having trouble, please contact our support team.

Best regards,
The Dexian App Team

---
This email was sent from Dexian App. If you have any questions, please contact our support team.
© 2024 Dexian App. All rights reserved.
  `;
}

module.exports = {
  getPasswordResetOTPEmailSubject,
  generatePasswordResetOTPEmailHtmlTemplate,
  generatePasswordResetOTPEmailTextTemplate
};

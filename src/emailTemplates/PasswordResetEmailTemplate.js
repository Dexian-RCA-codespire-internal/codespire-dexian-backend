// new file servicenow - Password Reset Email Template Functions
const { generateBaseHtml, createButton } = require('./BaseEmailTemplate');
const config = require('../config');

function getPasswordResetEmailSubject(data) {
  return 'Password Reset - Dexian App';
}

function generatePasswordResetEmailHtmlTemplate(data) {
  const { name, resetUrl } = data;
  
  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>We received a request to reset your password for your Dexian App account. If you made this request, click the button below to reset your password:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; transition: background-color 0.3s;">Reset My Password</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; margin: 10px 0;">
      ${resetUrl}
    </div>
    
    <p>This link will expire in ${config.otp.expiryMinutes} minutes for security reasons.</p>
    
    <div class="warning">
      <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Never share this link with anyone.
    </div>
    
    <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
  `;

  return generateBaseHtml('Password Reset Request', content, '#e74c3c');
}

function generatePasswordResetEmailTextTemplate(data) {
  const { name, resetUrl } = data;
  
  return `
Password Reset - Dexian App

Hello ${name || 'User'}!

We received a request to reset your password for your Dexian App account. If you made this request, click the link below to reset your password:

${resetUrl}

This link will expire in ${config.otp.expiryMinutes} minutes for security reasons.

Security Notice: If you didn't request a password reset, please ignore this email and your password will remain unchanged.

If you're having trouble, please contact our support team.

Best regards,
The Dexian App Team

---
This email was sent from Dexian App. If you have any questions, please contact our support team.
© 2024 Dexian App. All rights reserved.
  `;
}

module.exports = {
  getPasswordResetEmailSubject,
  generatePasswordResetEmailHtmlTemplate,
  generatePasswordResetEmailTextTemplate
};

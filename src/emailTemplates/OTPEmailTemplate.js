// new file servicenow - OTP Email Template Functions
const { generateBaseHtml } = require('./BaseEmailTemplate');
const config = require('../config');

function getOTPEmailSubject(data) {
  return 'Email Verification - Test BG App';
}

function generateOTPEmailHtmlTemplate(data) {
  const { name, otp } = data;
  
  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>Thank you for registering with Test BG App. To complete your registration and verify your email address, please use the following verification code:</p>
    
    <div style="background: #007bff; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 5px;">
      ${otp}
    </div>
    
    <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
    
    <div class="warning">
      <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
    </div>
    
    <p>If you didn't create an account with us, please ignore this email.</p>
    
    <p>Best regards,<br>The Test BG App Team</p>
  `;

  return generateBaseHtml('Email Verification', content, '#007bff');
}

function generateOTPEmailTextTemplate(data) {
  const { name, otp } = data;
  
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
© 2024 Test BG App. All rights reserved.
  `;
}

module.exports = {
  getOTPEmailSubject,
  generateOTPEmailHtmlTemplate,
  generateOTPEmailTextTemplate
};

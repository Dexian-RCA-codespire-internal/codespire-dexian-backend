// new file servicenow - Magic Link Email Template Functions
const { generateBaseHtml, createButton } = require('./BaseEmailTemplate');
const config = require('../config');

function getMagicLinkEmailSubject(data) {
  return 'Email Verification - Magic Link';
}

function generateMagicLinkEmailHtmlTemplate(data) {
  const { name, magicLink } = data;
  
  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>Thank you for registering with Test BG App. To complete your registration and verify your email address, please click the magic link below:</p>
    
    <div style="text-align: center;">
      <a href="${magicLink}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; text-align: center;">Verify Email Address</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <div style="background: #e9ecef; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; margin: 15px 0;">
      ${magicLink}
    </div>
    
    <p>This link will expire in ${config.otp.expiryMinutes} minutes.</p>
    
    <div class="warning">
      <strong>Security Notice:</strong> Never share this link with anyone. Our team will never ask for your verification link. If you didn't create an account with us, please ignore this email.
    </div>
    
    <p>Best regards,<br>The Test BG App Team</p>
  `;

  return generateBaseHtml('Email Verification - Magic Link', content, '#007bff');
}

function generateMagicLinkEmailTextTemplate(data) {
  const { name, magicLink } = data;
  
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
© 2024 Test BG App. All rights reserved.
  `;
}

module.exports = {
  getMagicLinkEmailSubject,
  generateMagicLinkEmailHtmlTemplate,
  generateMagicLinkEmailTextTemplate
};

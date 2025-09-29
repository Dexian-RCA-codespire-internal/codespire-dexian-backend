// new file servicenow - Welcome Email Template Functions
const { generateBaseHtml } = require('./BaseEmailTemplate');

function getWelcomeEmailSubject(data) {
  return 'Welcome to Dexian!';
}

function generateWelcomeEmailHtmlTemplate(data) {
  const { name, features = [] } = data;
  
  const featuresList = features.length > 0 ? 
    features.map(feature => `<li>${feature}</li>`).join('') :
    `<li>Access all features of the application</li>
     <li>Update your profile information</li>
     <li>Customize your preferences</li>
     <li>Connect with other users</li>`;

  const content = `
    <h2>Hello ${name || 'User'}!</h2>
    <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
    
    <p>You can now:</p>
    <ul>
      ${featuresList}
    </ul>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    
    <p>Welcome aboard!<br>The Dexian Team</p>
  `;

  return generateBaseHtml('Welcome to Dexian App!', content, '#28a745');
}

function generateWelcomeEmailTextTemplate(data) {
  const { name, features = [] } = data;
  
  const featuresList = features.length > 0 ? 
    features.map(feature => `- ${feature}`).join('\n') :
    `- Access all features of the application
- Update your profile information
- Customize your preferences
- Connect with other users`;

  return `
Welcome to Dexian App!

Hello ${name || 'User'}!

Congratulations! Your email has been successfully verified and your account is now active.

You can now:
${featuresList}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome aboard!
The Dexian Team

---
This is an automated message. Please do not reply to this email.
© 2024 Dexian App. All rights reserved.
  `;
}

module.exports = {
  getWelcomeEmailSubject,
  generateWelcomeEmailHtmlTemplate,
  generateWelcomeEmailTextTemplate
};

// new file servicenow - Email Template Manager Functions
const {
  getWelcomeEmailSubject,
  generateWelcomeEmailHtmlTemplate,
  generateWelcomeEmailTextTemplate
} = require('./WelcomeEmailTemplate');

const {
  getNewTicketEmailSubject,
  generateNewTicketEmailHtmlTemplate,
  generateNewTicketEmailTextTemplate
} = require('./NewTicketEmailTemplate');

const {
  getSLABreachWarningEmailSubject,
  generateSLABreachWarningEmailHtmlTemplate,
  generateSLABreachWarningEmailTextTemplate
} = require('./SLABreachWarningEmailTemplate');

const {
  getTicketAssignmentEmailSubject,
  generateTicketAssignmentEmailHtmlTemplate,
  generateTicketAssignmentEmailTextTemplate
} = require('./TicketAssignmentEmailTemplate');

const {
  getTicketResolutionEmailSubject,
  generateTicketResolutionEmailHtmlTemplate,
  generateTicketResolutionEmailTextTemplate
} = require('./TicketResolutionEmailTemplate');

const {
  getOTPEmailSubject,
  generateOTPEmailHtmlTemplate,
  generateOTPEmailTextTemplate
} = require('./OTPEmailTemplate');

const {
  getMagicLinkEmailSubject,
  generateMagicLinkEmailHtmlTemplate,
  generateMagicLinkEmailTextTemplate
} = require('./MagicLinkEmailTemplate');

const {
  getPasswordResetEmailSubject,
  generatePasswordResetEmailHtmlTemplate,
  generatePasswordResetEmailTextTemplate
} = require('./PasswordResetEmailTemplate');

const {
  getPasswordResetOTPEmailSubject,
  generatePasswordResetOTPEmailHtmlTemplate,
  generatePasswordResetOTPEmailTextTemplate
} = require('./PasswordResetOTPEmailTemplate');

// Template registry with function mappings
const templates = {
  welcome: {
    getSubject: getWelcomeEmailSubject,
    generateHtmlTemplate: generateWelcomeEmailHtmlTemplate,
    generateTextTemplate: generateWelcomeEmailTextTemplate
  },
  newTicket: {
    getSubject: getNewTicketEmailSubject,
    generateHtmlTemplate: generateNewTicketEmailHtmlTemplate,
    generateTextTemplate: generateNewTicketEmailTextTemplate
  },
  slaBreachWarning: {
    getSubject: getSLABreachWarningEmailSubject,
    generateHtmlTemplate: generateSLABreachWarningEmailHtmlTemplate,
    generateTextTemplate: generateSLABreachWarningEmailTextTemplate
  },
  ticketAssignment: {
    getSubject: getTicketAssignmentEmailSubject,
    generateHtmlTemplate: generateTicketAssignmentEmailHtmlTemplate,
    generateTextTemplate: generateTicketAssignmentEmailTextTemplate
  },
  ticketResolution: {
    getSubject: getTicketResolutionEmailSubject,
    generateHtmlTemplate: generateTicketResolutionEmailHtmlTemplate,
    generateTextTemplate: generateTicketResolutionEmailTextTemplate
  },
  otp: {
    getSubject: getOTPEmailSubject,
    generateHtmlTemplate: generateOTPEmailHtmlTemplate,
    generateTextTemplate: generateOTPEmailTextTemplate
  },
  magicLink: {
    getSubject: getMagicLinkEmailSubject,
    generateHtmlTemplate: generateMagicLinkEmailHtmlTemplate,
    generateTextTemplate: generateMagicLinkEmailTextTemplate
  },
  passwordReset: {
    getSubject: getPasswordResetEmailSubject,
    generateHtmlTemplate: generatePasswordResetEmailHtmlTemplate,
    generateTextTemplate: generatePasswordResetEmailTextTemplate
  },
  passwordResetOTP: {
    getSubject: getPasswordResetOTPEmailSubject,
    generateHtmlTemplate: generatePasswordResetOTPEmailHtmlTemplate,
    generateTextTemplate: generatePasswordResetOTPEmailTextTemplate
  }
};

// Get template by name
function getTemplate(templateName) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

// Generate email data for a specific template
function generateEmailData(templateName, data) {
  const template = getTemplate(templateName);
  
  return {
    subject: template.getSubject(data),
    html: template.generateHtmlTemplate(data),
    text: template.generateTextTemplate(data)
  };
}

// Get all available templates
function getAvailableTemplates() {
  return Object.keys(templates);
}

// Add a new template
function addTemplate(name, templateFunctions) {
  if (templates[name]) {
    throw new Error(`Template '${name}' already exists`);
  }
  
  // Validate template functions
  if (!templateFunctions.getSubject || !templateFunctions.generateHtmlTemplate || !templateFunctions.generateTextTemplate) {
    throw new Error('Template must have getSubject, generateHtmlTemplate, and generateTextTemplate functions');
  }
  
  templates[name] = templateFunctions;
}

// Remove a template
function removeTemplate(name) {
  if (!templates[name]) {
    throw new Error(`Template '${name}' not found`);
  }
  delete templates[name];
}

module.exports = {
  getTemplate,
  generateEmailData,
  getAvailableTemplates,
  addTemplate,
  removeTemplate
};

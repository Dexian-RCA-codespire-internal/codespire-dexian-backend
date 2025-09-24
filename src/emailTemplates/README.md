# Email Templates System

This directory contains a modular email template system for the Test BG App. The system uses function-based JavaScript and allows for easy creation and management of different email templates with consistent styling and functionality.

## Structure

- `BaseEmailTemplate.js` - Base functions with common functionality and styling
- `EmailTemplateManager.js` - Manages all templates and provides access methods
- `WelcomeEmailTemplate.js` - Welcome email for new users
- `NewTicketEmailTemplate.js` - Notification for new ticket creation
- `SLABreachWarningEmailTemplate.js` - SLA breach warning notifications
- `TicketAssignmentEmailTemplate.js` - Ticket assignment notifications
- `TicketResolutionEmailTemplate.js` - Ticket resolution notifications

## Usage Examples

### 1. Basic Template Usage

```javascript
const emailService = require('../services/emailService');

// Send welcome email
await emailService.sendWelcomeEmailTemplate('user@example.com', 'John Doe', [
  'Access all features',
  'Create and manage tickets',
  'View analytics dashboard'
]);

// Send new ticket notification
await emailService.sendNewTicketEmailTemplate(
  ['admin@example.com', 'manager@example.com'],
  {
    ticketId: 'TKT-001',
    title: 'Server connectivity issue',
    description: 'Users cannot access the application',
    priority: 'High',
    assignee: 'john.doe@example.com',
    createdBy: 'customer@example.com',
    createdAt: new Date(),
    category: 'Technical',
    ticketUrl: 'https://app.example.com/tickets/TKT-001',
    slaHours: 4
  }
);

// Send SLA breach warning
await emailService.sendSLABreachWarningEmailTemplate(
  ['admin@example.com'],
  {
    ticketId: 'TKT-001',
    title: 'Server connectivity issue',
    priority: 'High',
    assignee: 'john.doe@example.com',
    timeRemaining: '1h 30m',
    slaHours: 4,
    createdAt: new Date(),
    ticketUrl: 'https://app.example.com/tickets/TKT-001',
    escalationRules: 'Ticket will be escalated to manager if not resolved within 30 minutes'
  }
);
```

### 2. Generic Template Usage

```javascript
// Send any template with custom data
await emailService.sendTemplateEmail('welcome', {
  name: 'Jane Doe',
  features: ['Custom feature 1', 'Custom feature 2']
}, 'jane@example.com');
```

### 3. Template Management

```javascript
// Get available templates
const availableTemplates = emailService.getAvailableTemplates();
console.log('Available templates:', availableTemplates);

// Add a new template (when implemented)
// emailService.addEmailTemplate('customTemplate', new CustomTemplate());

// Remove a template
// emailService.removeEmailTemplate('templateName');
```

## Creating New Templates

### 1. Create a new template functions file

```javascript
// CustomEmailTemplate.js
const { generateBaseHtml } = require('./BaseEmailTemplate');

function getCustomEmailSubject(data) {
  return `Custom Subject: ${data.title}`;
}

function generateCustomEmailHtmlTemplate(data) {
  const { title, content } = data;
  
  const htmlContent = `
    <h2>${title}</h2>
    <div class="info">
      <p>${content}</p>
    </div>
  `;

  return generateBaseHtml(title, htmlContent, '#84CC16');
}

function generateCustomEmailTextTemplate(data) {
  const { title, content } = data;
  
  return `
${title}

${content}

---
This is an automated message. Please do not reply to this email.
© 2024 Test BG App. All rights reserved.
  `;
}

module.exports = {
  getCustomEmailSubject,
  generateCustomEmailHtmlTemplate,
  generateCustomEmailTextTemplate
};
```

### 2. Register the template

```javascript
// In EmailTemplateManager.js
const {
  getCustomEmailSubject,
  generateCustomEmailHtmlTemplate,
  generateCustomEmailTextTemplate
} = require('./CustomEmailTemplate');

// Add to the templates registry
const templates = {
  // ... existing templates
  custom: {
    getSubject: getCustomEmailSubject,
    generateHtmlTemplate: generateCustomEmailHtmlTemplate,
    generateTextTemplate: generateCustomEmailTextTemplate
  }
};
```

## Template Data Requirements

### Welcome Email Template
```javascript
{
  name: 'string',           // User's name
  features: ['string']      // Optional array of features to highlight
}
```

### New Ticket Email Template
```javascript
{
  ticketId: 'string',       // Ticket ID
  title: 'string',          // Ticket title
  description: 'string',    // Optional ticket description
  priority: 'string',       // Priority level (Low, Normal, High, Critical, Urgent)
  assignee: 'string',       // Optional assignee email
  createdBy: 'string',      // Creator email
  createdAt: Date,          // Creation date
  category: 'string',       // Optional category
  ticketUrl: 'string',      // Optional ticket URL
  slaHours: number          // Optional SLA in hours
}
```

### SLA Breach Warning Template
```javascript
{
  ticketId: 'string',       // Ticket ID
  title: 'string',          // Ticket title
  priority: 'string',       // Priority level
  assignee: 'string',       // Assignee email
  timeRemaining: 'string',  // Time remaining (e.g., "1h 30m")
  slaHours: number,         // SLA duration in hours
  createdAt: Date,          // Creation date
  ticketUrl: 'string',      // Optional ticket URL
  escalationRules: 'string' // Optional escalation rules
}
```

## Features

- **Function-Based**: Uses function-based JavaScript approach for better performance and simplicity
- **Consistent Styling**: All templates use the same base styles and structure
- **Responsive Design**: Templates are mobile-friendly
- **Flexible Data**: Templates handle missing data gracefully
- **Easy Extension**: Add new templates by creating functions and registering them
- **Backward Compatibility**: Existing email methods continue to work
- **Template Management**: Centralized template management with function registry
- **Multiple Recipients**: Support for sending to multiple recipients
- **HTML and Text**: Both HTML and plain text versions generated

## Future Templates

Ready-to-implement templates for future features:
- Ticket Assignment notifications
- Ticket Resolution notifications
- Escalation notifications
- Password reset notifications
- System maintenance notifications
- User role change notifications

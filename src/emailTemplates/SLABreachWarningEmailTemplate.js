// new file servicenow - SLA Breach Warning Email Template Functions
const { generateBaseHtml, createButton, formatDate } = require('./BaseEmailTemplate');

function getSLABreachWarningEmailSubject(data) {
  const { ticketId, timeRemaining } = data;
  return `⚠️ SLA Warning: Ticket ${ticketId} - ${timeRemaining} remaining`;
}

function getPriorityColor(priority) {
  const colors = {
    'Low': '#28a745',
    'Normal': '#84CC16',
    'High': '#ffc107',
    'Critical': '#dc3545',
    'Urgent': '#dc3545'
  };
  return colors[priority] || '#84CC16';
}

function getTimeColor(timeRemaining) {
  // Parse time remaining to determine color
  const hours = parseInt(timeRemaining.match(/(\d+)h/)?.[1] || '0');
  const minutes = parseInt(timeRemaining.match(/(\d+)m/)?.[1] || '0');
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes <= 30) return '#dc3545'; // Red for critical
  if (totalMinutes <= 120) return '#ffc107'; // Yellow for warning
  return '#84CC16'; // Green for normal
}

function generateSLABreachWarningEmailHtmlTemplate(data) {
  const { 
    ticketId, 
    title, 
    priority = 'Normal', 
    assignee, 
    timeRemaining,
    slaHours,
    createdAt,
    ticketUrl,
    escalationRules
  } = data;

  const priorityColor = getPriorityColor(priority);
  const timeColor = getTimeColor(timeRemaining);

  const content = `
    <h2>⚠️ SLA Breach Warning</h2>
    
    <div class="warning">
      <h3>Urgent Action Required</h3>
      <p><strong>Time Remaining:</strong> <span style="color: ${timeColor}; font-weight: bold; font-size: 18px;">${timeRemaining}</span></p>
      <p>This ticket is approaching its SLA deadline and requires immediate attention.</p>
    </div>

    <div class="info">
      <h3>Ticket Details</h3>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority}</span></p>
      <p><strong>Assigned To:</strong> ${assignee || 'Unassigned'}</p>
      <p><strong>Created At:</strong> ${formatDate(createdAt)}</p>
      <p><strong>SLA Duration:</strong> ${slaHours} hours</p>
    </div>

    ${escalationRules ? `
      <div class="error">
        <h3>Escalation Rules</h3>
        <p>${escalationRules}</p>
      </div>
    ` : ''}

    ${ticketUrl ? createButton('View & Update Ticket', ticketUrl, '#dc3545') : ''}
    
    <div class="error">
      <strong>Action Required:</strong> Please update this ticket immediately to avoid SLA breach.
    </div>
  `;

  return generateBaseHtml('SLA Breach Warning', content, '#dc3545');
}

function generateSLABreachWarningEmailTextTemplate(data) {
  const { 
    ticketId, 
    title, 
    priority = 'Normal', 
    assignee, 
    timeRemaining,
    slaHours,
    createdAt,
    ticketUrl,
    escalationRules
  } = data;

  return `
⚠️ SLA Breach Warning: Ticket ${ticketId}

URGENT ACTION REQUIRED
Time Remaining: ${timeRemaining}
This ticket is approaching its SLA deadline and requires immediate attention.

Ticket Details:
- Ticket ID: ${ticketId}
- Title: ${title}
- Priority: ${priority}
- Assigned To: ${assignee || 'Unassigned'}
- Created At: ${formatDate(createdAt)}
- SLA Duration: ${slaHours} hours

${escalationRules ? `Escalation Rules:\n${escalationRules}\n` : ''}

${ticketUrl ? `View & Update Ticket: ${ticketUrl}\n` : ''}

ACTION REQUIRED: Please update this ticket immediately to avoid SLA breach.

---
This is an automated message. Please do not reply to this email.
© 2024 Test BG App. All rights reserved.
  `;
}

module.exports = {
  getSLABreachWarningEmailSubject,
  generateSLABreachWarningEmailHtmlTemplate,
  generateSLABreachWarningEmailTextTemplate
};

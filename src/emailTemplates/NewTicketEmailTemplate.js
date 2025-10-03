// new file servicenow - New Ticket Created Email Template Functions
const { generateBaseHtml, createButton, formatDate } = require('./BaseEmailTemplate');

function getNewTicketEmailSubject(data) {
  const { ticketId, priority = 'Normal' } = data;
  return `New Ticket Created: ${ticketId} (${priority} Priority)`;
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

function generateNewTicketEmailHtmlTemplate(data) {
  const { 
    ticketId, 
    mongoId,
    title, 
    description, 
    priority = 'Normal', 
    assignee, 
    createdBy, 
    createdAt, 
    category,
    ticketUrl,
    slaHours
  } = data;

  const priorityColor = getPriorityColor(priority);
  const slaInfo = slaHours ? `<p><strong>SLA:</strong> ${slaHours} hours</p>` : '';

  const content = `
    <h2>New Ticket Created</h2>
    
    <div class="info">
      <h3>Ticket Details</h3>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority}</span></p>
      <p><strong>Category:</strong> ${category || 'N/A'}</p>
      <p><strong>Created By:</strong> ${createdBy}</p>
      <p><strong>Created At:</strong> ${formatDate(createdAt)}</p>
      ${assignee ? `<p><strong>Assigned To:</strong> ${assignee}</p>` : ''}
      ${slaInfo}
    </div>

    ${description ? `
      <h3>Description</h3>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #84CC16;">
        ${description}
      </div>
    ` : ''}

    ${ticketUrl ? createButton('Analyze Ticket', ticketUrl, '#84CC16') : ''}
    
    <div class="warning">
      <strong>Note:</strong> Please respond to this ticket within the specified SLA timeframe.
    </div>
  `;

  return generateBaseHtml('New Ticket Created', content, '#84CC16');
}

function generateNewTicketEmailTextTemplate(data) {
  const { 
    ticketId, 
    mongoId,
    title, 
    description, 
    priority = 'Normal', 
    assignee, 
    createdBy, 
    createdAt, 
    category,
    ticketUrl,
    slaHours
  } = data;

  const slaInfo = slaHours ? `SLA: ${slaHours} hours` : '';
  const assigneeInfo = assignee ? `Assigned To: ${assignee}` : '';

  return `
New Ticket Created: ${ticketId}

Ticket Details:
- Ticket ID: ${ticketId}
- Title: ${title}
- Priority: ${priority}
- Category: ${category || 'N/A'}
- Created By: ${createdBy}
- Created At: ${formatDate(createdAt)}
${assigneeInfo ? `- ${assigneeInfo}` : ''}
${slaInfo ? `- ${slaInfo}` : ''}

${description ? `Description:\n${description}\n` : ''}

${ticketUrl ? `Analyze Ticket: ${ticketUrl}\n` : ''}

Note: Please respond to this ticket within the specified SLA timeframe.

---
This is an automated message. Please do not reply to this email.
© 2024 Dexian. All rights reserved.
  `;
}

module.exports = {
  getNewTicketEmailSubject,
  generateNewTicketEmailHtmlTemplate,
  generateNewTicketEmailTextTemplate
};

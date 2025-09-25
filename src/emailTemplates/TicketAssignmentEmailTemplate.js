// new file servicenow - Ticket Assignment Email Template Functions
const { generateBaseHtml, createButton, formatDate } = require('./BaseEmailTemplate');

function getTicketAssignmentEmailSubject(data) {
  const { ticketId, priority = 'Normal' } = data;
  return `Ticket Assigned: ${ticketId} (${priority} Priority)`;
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

function generateTicketAssignmentEmailHtmlTemplate(data) {
  const { 
    ticketId, 
    title, 
    priority = 'Normal', 
    assignee, 
    assignedBy,
    assignedAt,
    ticketUrl,
    slaHours,
    category
  } = data;

  const priorityColor = getPriorityColor(priority);

  const content = `
    <h2>Ticket Assignment Notification</h2>
    
    <div class="info">
      <h3>Assignment Details</h3>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority}</span></p>
      <p><strong>Category:</strong> ${category || 'N/A'}</p>
      <p><strong>Assigned To:</strong> ${assignee}</p>
      <p><strong>Assigned By:</strong> ${assignedBy}</p>
      <p><strong>Assigned At:</strong> ${formatDate(assignedAt)}</p>
      ${slaHours ? `<p><strong>SLA:</strong> ${slaHours} hours</p>` : ''}
    </div>

    ${ticketUrl ? createButton('View Ticket', ticketUrl, '#84CC16') : ''}
    
    <div class="warning">
      <strong>Action Required:</strong> Please review and start working on this ticket as soon as possible.
    </div>
  `;

  return generateBaseHtml('Ticket Assignment', content, '#84CC16');
}

function generateTicketAssignmentEmailTextTemplate(data) {
  const { 
    ticketId, 
    title, 
    priority = 'Normal', 
    assignee, 
    assignedBy,
    assignedAt,
    ticketUrl,
    slaHours,
    category
  } = data;

  const slaInfo = slaHours ? `SLA: ${slaHours} hours` : '';

  return `
Ticket Assignment: ${ticketId}

Assignment Details:
- Ticket ID: ${ticketId}
- Title: ${title}
- Priority: ${priority}
- Category: ${category || 'N/A'}
- Assigned To: ${assignee}
- Assigned By: ${assignedBy}
- Assigned At: ${formatDate(assignedAt)}
${slaInfo ? `- ${slaInfo}` : ''}

${ticketUrl ? `View Ticket: ${ticketUrl}\n` : ''}

ACTION REQUIRED: Please review and start working on this ticket as soon as possible.

---
This is an automated message. Please do not reply to this email.
© 2024 Dexian App. All rights reserved.
  `;
}

module.exports = {
  getTicketAssignmentEmailSubject,
  generateTicketAssignmentEmailHtmlTemplate,
  generateTicketAssignmentEmailTextTemplate
};

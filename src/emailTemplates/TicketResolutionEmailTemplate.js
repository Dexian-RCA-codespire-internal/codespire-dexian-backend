// new file servicenow - Ticket Resolution Email Template Functions
const { generateBaseHtml, createButton, formatDate } = require('./BaseEmailTemplate');

function getTicketResolutionEmailSubject(data) {
  const { ticketId, status = 'Resolved' } = data;
  return `Ticket ${status}: ${ticketId}`;
}

function getStatusColor(status) {
  const colors = {
    'Resolved': '#28a745',
    'Closed': '#6c757d',
    'Cancelled': '#dc3545',
    'Duplicate': '#ffc107'
  };
  return colors[status] || '#28a745';
}

function generateTicketResolutionEmailHtmlTemplate(data) {
  const { 
    ticketId, 
    title, 
    status = 'Resolved',
    resolvedBy,
    resolvedAt,
    resolution,
    customerEmail,
    ticketUrl,
    ratingUrl
  } = data;

  const statusColor = getStatusColor(status);

  const content = `
    <h2>Ticket ${status}</h2>
    
    <div class="success">
      <h3>Resolution Details</h3>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
      <p><strong>Resolved By:</strong> ${resolvedBy}</p>
      <p><strong>Resolved At:</strong> ${formatDate(resolvedAt)}</p>
    </div>

    ${resolution ? `
      <h3>Resolution</h3>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
        ${resolution}
      </div>
    ` : ''}

    ${ticketUrl ? createButton('View Ticket Details', ticketUrl, '#28a745') : ''}
    
    ${ratingUrl ? `
      <div style="margin-top: 20px;">
        <h3>Rate Your Experience</h3>
        <p>We'd love to hear about your experience. Please take a moment to rate our service:</p>
        ${createButton('Rate Service', ratingUrl, '#ffc107')}
      </div>
    ` : ''}

    <div class="info">
      <strong>Thank you for your patience!</strong> If you have any additional questions or concerns, please don't hesitate to contact our support team.
    </div>
  `;

  return generateBaseHtml(`Ticket ${status}`, content, '#28a745');
}

function generateTicketResolutionEmailTextTemplate(data) {
  const { 
    ticketId, 
    title, 
    status = 'Resolved',
    resolvedBy,
    resolvedAt,
    resolution,
    customerEmail,
    ticketUrl,
    ratingUrl
  } = data;

  return `
Ticket ${status}: ${ticketId}

Resolution Details:
- Ticket ID: ${ticketId}
- Title: ${title}
- Status: ${status}
- Resolved By: ${resolvedBy}
- Resolved At: ${formatDate(resolvedAt)}

${resolution ? `Resolution:\n${resolution}\n` : ''}

${ticketUrl ? `View Ticket Details: ${ticketUrl}\n` : ''}

${ratingUrl ? `Rate Your Experience: ${ratingUrl}\n` : ''}

Thank you for your patience! If you have any additional questions or concerns, please don't hesitate to contact our support team.

---
This is an automated message. Please do not reply to this email.
© 2024 Test BG App. All rights reserved.
  `;
}

module.exports = {
  getTicketResolutionEmailSubject,
  generateTicketResolutionEmailHtmlTemplate,
  generateTicketResolutionEmailTextTemplate
};

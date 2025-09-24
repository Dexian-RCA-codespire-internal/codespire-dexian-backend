// new file servicenow - Base Email Template Functions
const baseStyles = {
  body: "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;",
  container: "background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);",
  header: "text-align: center; margin-bottom: 30px;",
  logo: "font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px;",
  footer: "margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;",
  button: "display: inline-block; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; text-align: center;",
  warning: "background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;",
  info: "background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0;",
  success: "background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;",
  error: "background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0;"
};

// Helper function to generate common HTML structure
function generateBaseHtml(title, content, headerColor = '#2c3e50') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { ${baseStyles.body} }
        .container { ${baseStyles.container} }
        .header { ${baseStyles.header} }
        .logo { ${baseStyles.logo} }
        .footer { ${baseStyles.footer} }
        .button { ${baseStyles.button} }
        .warning { ${baseStyles.warning} }
        .info { ${baseStyles.info} }
        .success { ${baseStyles.success} }
        .error { ${baseStyles.error} }
        .header-bg { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Test BG App</div>
          <div class="header-bg">
            <h1>${title}</h1>
          </div>
        </div>
        ${content}
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; 2024 Test BG App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to create buttons
function createButton(text, url, color = '#007bff') {
  return `
    <div style="text-align: center;">
      <a href="${url}" class="button" style="background-color: ${color};">${text}</a>
    </div>
  `;
}

// Helper function to create info boxes
function createInfoBox(content, type = 'info') {
  return `<div class="${type}">${content}</div>`;
}

// Helper function to format dates
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to format duration
function formatDuration(minutes) {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

module.exports = {
  generateBaseHtml,
  createButton,
  createInfoBox,
  formatDate,
  formatDuration
};

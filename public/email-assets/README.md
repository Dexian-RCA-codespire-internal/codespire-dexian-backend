# Email Assets Directory

This directory contains assets used in email templates.

## Logo Configuration

Place your logo files here and configure them using environment variables:

### Required Files:
- `logo.png` - Main company logo (recommended: 120x40px or 2:1 ratio)
- `logo@2x.png` - High-resolution logo for retina displays (optional)

### Environment Variables:
```bash
# Logo URL (can be absolute URL or relative to backend)
EMAIL_LOGO_URL=https://your-domain.com/email-assets/logo.png

# Logo properties
EMAIL_LOGO_ALT=Your Company Name
EMAIL_LOGO_WIDTH=120
EMAIL_LOGO_HEIGHT=40

# Company branding
EMAIL_COMPANY_NAME=Your Company Name
EMAIL_SUPPORT_EMAIL=support@yourcompany.com
```

### Logo Requirements:
- **Format**: PNG (recommended) or JPG
- **Size**: 120x40px (or maintain 2:1 ratio)
- **Background**: Transparent PNG preferred
- **Colors**: Should work on both light and dark email backgrounds
- **File Size**: Keep under 50KB for fast loading

### Fallback:
If no logo is configured, the system will display the company name as text.

## Example Logo URLs:
- Local: `http://localhost:8081/email-assets/logo.png`
- Production: `https://your-api-domain.com/email-assets/logo.png`
- CDN: `https://cdn.yourcompany.com/email-assets/logo.png`

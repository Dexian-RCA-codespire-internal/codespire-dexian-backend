# Email Assets Configuration Guide

## Overview

The email system now supports configurable assets like logos and company branding. This guide shows you how to configure email assets.

## Asset Directory Structure

```
codespire-dexian-backend/
├── public/
│   └── email-assets/
│       ├── logo.png          # Main company logo
│       ├── logo@2x.png       # High-resolution logo (optional)
│       └── README.md         # Asset documentation
└── docs/
    └── EMAIL_ASSETS_CONFIGURATION.md
```

## Environment Variables

Add these to your `.env` file:

```bash
# Email Asset Configuration
# ========================

# Logo URL (can be absolute URL or relative to backend)
EMAIL_LOGO_URL=http://localhost:8081/email-assets/logo.png

# Logo properties
EMAIL_LOGO_ALT=Your Company Name
EMAIL_LOGO_WIDTH=120
EMAIL_LOGO_HEIGHT=40

# Company branding
EMAIL_COMPANY_NAME=Your Company Name
EMAIL_SUPPORT_EMAIL=support@yourcompany.com

# Backend URL (used for generating logo URLs if EMAIL_LOGO_URL is not set)
BACKEND_URL=http://localhost:8081

# Frontend URL (used for ticket links)
FRONTEND_URL=http://localhost:3000
```

## Logo Requirements

### File Format
- **Recommended**: PNG with transparent background
- **Alternative**: JPG (if transparency not needed)
- **Avoid**: SVG (not well supported in email clients)

### Dimensions
- **Standard**: 120x40 pixels (3:1 ratio)
- **Minimum**: 80x27 pixels
- **Maximum**: 200x67 pixels
- **File Size**: Keep under 50KB for fast loading

### Design Guidelines
- Use high contrast colors that work on light backgrounds
- Avoid fine details that may not display clearly at small sizes
- Test on both light and dark email themes
- Ensure text is readable if your logo contains text

## Configuration Options

### 1. Local Assets (Default)
```bash
EMAIL_LOGO_URL=http://localhost:8081/email-assets/logo.png
```
- Logo served from your backend server
- Good for development and testing

### 2. CDN Assets
```bash
EMAIL_LOGO_URL=https://cdn.yourcompany.com/email-assets/logo.png
```
- Logo served from a CDN
- Better performance and reliability
- Recommended for production

### 3. External Assets
```bash
EMAIL_LOGO_URL=https://yourwebsite.com/images/logo.png
```
- Logo hosted on your main website
- Single source of truth for branding

## Fallback Behavior

If no logo is configured or the logo fails to load:
- System displays the company name as text
- Uses the `EMAIL_COMPANY_NAME` environment variable
- Defaults to "Test BG App" if not configured

## Testing Your Logo

1. **Place your logo file** in `public/email-assets/logo.png`
2. **Configure environment variables** in your `.env` file
3. **Restart your backend server**
4. **Send a test email** using the email test endpoints
5. **Check email clients** (Gmail, Outlook, Apple Mail, etc.)

## Email Client Compatibility

### Fully Supported
- Gmail (web and mobile)
- Outlook (web and desktop)
- Apple Mail
- Thunderbird

### Partially Supported
- Outlook 2007-2019 (may show text fallback)
- Some mobile email clients

### Best Practices
- Always include `alt` text for accessibility
- Use absolute URLs for better compatibility
- Test in multiple email clients before production

## Production Deployment

### 1. Upload Assets
Upload your logo files to your production server or CDN.

### 2. Update Environment Variables
```bash
# Production example
EMAIL_LOGO_URL=https://api.yourcompany.com/email-assets/logo.png
EMAIL_COMPANY_NAME=Your Company
EMAIL_SUPPORT_EMAIL=support@yourcompany.com
```

### 3. Test in Production
Send test emails to verify logo displays correctly.

## Troubleshooting

### Logo Not Displaying
1. Check the URL is accessible: `curl EMAIL_LOGO_URL`
2. Verify file permissions on the server
3. Check email client's image blocking settings
4. Ensure the URL uses HTTPS in production

### Logo Too Large/Small
1. Adjust `EMAIL_LOGO_WIDTH` and `EMAIL_LOGO_HEIGHT`
2. Re-export your logo at the correct dimensions
3. Test in different email clients

### Performance Issues
1. Optimize logo file size (use tools like TinyPNG)
2. Use a CDN for faster loading
3. Consider creating multiple sizes for different contexts

## Example Configurations

### Development
```bash
EMAIL_LOGO_URL=http://localhost:8081/email-assets/logo.png
EMAIL_COMPANY_NAME=Test BG App
EMAIL_SUPPORT_EMAIL=dev@testbg.com
```

### Staging
```bash
EMAIL_LOGO_URL=https://staging-api.yourcompany.com/email-assets/logo.png
EMAIL_COMPANY_NAME=Your Company (Staging)
EMAIL_SUPPORT_EMAIL=staging@yourcompany.com
```

### Production
```bash
EMAIL_LOGO_URL=https://cdn.yourcompany.com/email-assets/logo.png
EMAIL_COMPANY_NAME=Your Company
EMAIL_SUPPORT_EMAIL=support@yourcompany.com
```

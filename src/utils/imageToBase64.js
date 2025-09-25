// new file servicenow
const fs = require('fs');
const path = require('path');

/**
 * Converts an image file to base64 format
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} Base64 encoded string of the image
 */
const convertImageToBase64 = (imagePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Read the file as binary data
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Convert to base64
    const base64String = imageBuffer.toString('base64');
    
    // Get file extension to determine MIME type
    const fileExtension = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
    
    // Return data URL format (ready to use in HTML/CSS)
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
};

/**
 * Converts an image file to base64 format (raw base64 string without data URL prefix)
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} Raw base64 encoded string of the image
 */
const convertImageToBase64Raw = async (imagePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Read the file as binary data
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Convert to base64
    return imageBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
};


module.exports = {
  convertImageToBase64,
  convertImageToBase64Raw,
};

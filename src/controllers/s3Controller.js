const S3Service = require('../services/s3Service');
const multer = require('multer');
const { validationResult } = require('express-validator');

const s3Service = new S3Service();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation here
    cb(null, true);
  }
});

const uploadFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const fileName = `${Date.now()}-${originalname}`;

    const result = await s3Service.uploadFile(buffer, fileName, mimetype);

    res.status(201).json({
      message: 'File uploaded successfully',
      ...result
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { fileName } = req.params;

    const result = await s3Service.downloadFile(fileName);

    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.contentLength,
      'Content-Disposition': `attachment; filename="${fileName}"`
    });

    res.send(result.data);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileName } = req.params;

    const result = await s3Service.deleteFile(fileName);

    res.json({
      message: 'File deleted successfully',
      ...result
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
};

const listFiles = async (req, res) => {
  try {
    const { prefix = '', maxKeys = 1000 } = req.query;

    const result = await s3Service.listFiles(prefix, parseInt(maxKeys));

    res.json({
      message: 'Files retrieved successfully',
      ...result
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
};

const getPresignedUrl = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { operation = 'getObject', expiresIn = 3600 } = req.query;

    const result = await s3Service.generatePresignedUrl(
      fileName,
      operation,
      parseInt(expiresIn)
    );

    res.json({
      message: 'Presigned URL generated successfully',
      ...result
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
};

const getFileMetadata = async (req, res) => {
  try {
    const { fileName } = req.params;

    const result = await s3Service.getFileMetadata(fileName);

    res.json({
      message: 'File metadata retrieved successfully',
      ...result
    });
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get file metadata' });
  }
};

module.exports = {
  upload,
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  getPresignedUrl,
  getFileMetadata
};

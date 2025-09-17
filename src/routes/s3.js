const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { doc } = require('../utils/apiDoc');
const {
  upload,
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  getPresignedUrl,
  getFileMetadata
} = require('../controllers/s3Controller');

const router = express.Router();

// Validation rules
const fileNameValidation = [
  param('fileName').notEmpty().withMessage('File name is required')
];

const uploadValidation = [
  body('description').optional().isString().withMessage('Description must be a string')
];

const listValidation = [
  query('prefix').optional().isString().withMessage('Prefix must be a string'),
  query('maxKeys').optional().isInt({ min: 1, max: 1000 }).withMessage('Max keys must be between 1 and 1000')
];

const presignedUrlValidation = [
  query('operation').optional().isIn(['getObject', 'putObject']).withMessage('Operation must be getObject or putObject'),
  query('expiresIn').optional().isInt({ min: 60, max: 86400 }).withMessage('Expires in must be between 60 and 86400 seconds')
];

// File Storage Routes
router.post('/upload', 
  doc.create('/s3/upload', 'Upload a file to S3 storage', ['File Storage'], {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'File to upload (multipart/form-data)'
      }
    },
    required: ['file']
  }),
  authenticateToken, upload.single('file'), uploadValidation, uploadFile);

router.get('/download/:fileName', 
  doc.getById('/s3/download/{fileName}', 'Download a file from S3 storage', ['File Storage']),
  authenticateToken, fileNameValidation, downloadFile);

router.delete('/:fileName', 
  doc.delete('/s3/{fileName}', 'Delete a file from S3 storage', ['File Storage']),
  authenticateToken, fileNameValidation, deleteFile);

router.get('/list', 
  doc.getList('/s3/list', 'List files in S3 storage', ['File Storage']),
  authenticateToken, listValidation, listFiles);

router.get('/presigned/:fileName', 
  doc.getById('/s3/presigned/{fileName}', 'Generate presigned URL for file access', ['File Storage']),
  authenticateToken, fileNameValidation, presignedUrlValidation, getPresignedUrl);

router.get('/metadata/:fileName', 
  doc.getById('/s3/metadata/{fileName}', 'Get file metadata and information', ['File Storage']),
  authenticateToken, fileNameValidation, getFileMetadata);

module.exports = router;

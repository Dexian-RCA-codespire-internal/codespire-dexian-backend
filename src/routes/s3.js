const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
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

// Routes
router.post('/upload', authenticateToken, upload.single('file'), uploadValidation, uploadFile);
router.get('/download/:fileName', authenticateToken, fileNameValidation, downloadFile);
router.delete('/:fileName', authenticateToken, fileNameValidation, deleteFile);
router.get('/list', authenticateToken, listValidation, listFiles);
router.get('/presigned/:fileName', authenticateToken, fileNameValidation, presignedUrlValidation, getPresignedUrl);
router.get('/metadata/:fileName', authenticateToken, fileNameValidation, getFileMetadata);

module.exports = router;

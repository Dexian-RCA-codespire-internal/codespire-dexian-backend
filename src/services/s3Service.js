const AWS = require('aws-sdk');
const config = require('../config');

class S3Service {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: config.storage.aws.accessKeyId,
      secretAccessKey: config.storage.aws.secretAccessKey,
      region: config.storage.aws.region
    });
    this.bucket = config.storage.aws.bucket;
  }

  async uploadFile(fileBuffer, fileName, contentType = 'application/octet-stream') {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'private'
      };

      const result = await this.s3.upload(params).promise();
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('File upload failed');
    }
  }

  async downloadFile(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      const result = await this.s3.getObject(params).promise();
      return {
        success: true,
        data: result.Body,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified
      };
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error('File download failed');
    }
  }

  async deleteFile(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      await this.s3.deleteObject(params).promise();
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error('File deletion failed');
    }
  }

  async listFiles(prefix = '', maxKeys = 1000) {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return {
        success: true,
        files: result.Contents || [],
        isTruncated: result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken
      };
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error('Failed to list files');
    }
  }

  async generatePresignedUrl(fileName, operation = 'getObject', expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName,
        Expires: expiresIn
      };

      const url = await this.s3.getSignedUrlPromise(operation, params);
      return {
        success: true,
        url,
        expiresIn,
        operation
      };
    } catch (error) {
      console.error('S3 presigned URL error:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  async getFileMetadata(fileName) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileName
      };

      const result = await this.s3.headObject(params).promise();
      return {
        success: true,
        metadata: result.Metadata,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 metadata error:', error);
      throw new Error('Failed to get file metadata');
    }
  }
}

module.exports = S3Service;

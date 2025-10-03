const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: config.storage.aws.accessKeyId,
        secretAccessKey: config.storage.aws.secretAccessKey,
      },
      region: config.storage.aws.region
    });
    this.bucket = config.storage.aws.bucket;
  }

  async uploadFile(fileBuffer, fileName, contentType = 'application/octet-stream') {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'private'
      });

      const result = await this.s3Client.send(command);
      return {
        success: true,
        url: `https://${this.bucket}.s3.${config.storage.aws.region}.amazonaws.com/${fileName}`,
        key: fileName,
        bucket: this.bucket,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('File upload failed');
    }
  }

  async downloadFile(fileName) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });

      const result = await this.s3Client.send(command);
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
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });

      await this.s3Client.send(command);
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
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const result = await this.s3Client.send(command);
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
      let command;
      if (operation === 'getObject') {
        command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: fileName
        });
      } else if (operation === 'putObject') {
        command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileName
        });
      } else {
        throw new Error('Unsupported operation for presigned URL');
      }

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
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
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileName
      });

      const result = await this.s3Client.send(command);
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

# Cloudflare R2 Storage Integration - Production Setup Guide

## Overview

This project has been successfully integrated with **Cloudflare R2** storage, providing a production-ready cloud storage solution with S3-compatible APIs. Users can upload, share, and manage their files directly from/to Cloudflare R2.

## 🚀 Features Implemented

### ✅ Core Storage Features
- **File Upload**: Direct upload to Cloudflare R2 with multipart upload support for large files
- **File Download**: Secure presigned URLs for file access
- **File Management**: List, view, delete files with metadata tracking
- **Thumbnail Generation**: Automatic thumbnail creation for images
- **File Sharing**: Secure sharing with password protection and expiration
- **Storage Analytics**: Real-time storage usage and file statistics

### ✅ Production-Ready Components
- **Scalable Architecture**: Built for high-volume file operations
- **Security**: Presigned URLs, authentication, and access controls
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Optimized for large file uploads and downloads
- **Monitoring**: Storage health checks and usage tracking

## 🔧 Environment Configuration

### Required Cloudflare R2 Setup

1. **Create R2 Bucket**
   ```bash
   # In Cloudflare Dashboard:
   # 1. Go to R2 Object Storage
   # 2. Create a new bucket
   # 3. Note the bucket name
   ```

2. **Generate API Tokens**
   ```bash
   # In Cloudflare Dashboard:
   # 1. Go to "My Profile" > "API Tokens"
   # 2. Create Custom Token with R2 permissions
   # 3. Note Account ID, Access Key, and Secret Key
   ```

3. **Configure Environment Variables**
   Copy `.env.example` to `.env` and configure:
   ```env
   # Cloudflare R2 Storage Configuration
   CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
   CLOUDFLARE_R2_REGION=auto

   # Optional: Custom domain for public access
   CLOUDFLARE_R2_PUBLIC_DOMAIN=files.yourdomain.com
   # Optional: R2 dev subdomain
   CLOUDFLARE_R2_DEV_SUBDOMAIN=your_bucket_subdomain
   ```

### Optional: Custom Domain Setup

For production, configure a custom domain:

1. **In Cloudflare Dashboard**:
   - Go to your R2 bucket settings
   - Add custom domain (e.g., `files.yourdomain.com`)
   - Configure DNS records

2. **Update Environment**:
   ```env
   CLOUDFLARE_R2_PUBLIC_DOMAIN=files.yourdomain.com
   ```

## 📁 File Organization Structure

Files are organized in R2 with the following hierarchy:
```
bucket/
├── users/
│   └── {userId}/
│       └── projects/
│           └── {projectId}/
│               ├── files/
│               │   └── {timestamp}-{random}-{filename}
│               └── thumbnails/
│                   ├── small/
│                   ├── medium/
│                   └── large/
└── temp/
    └── {userId}/
        └── {temporary-files}
```

## 🛠 API Endpoints

### File Operations

```http
# Upload files
POST /api/files
Content-Type: multipart/form-data
Authorization: Bearer {token}

# Get files (with filtering)
GET /api/files?project={id}&type=image&page=1&limit=20
Authorization: Bearer {token}

# Get single file
GET /api/files/{fileId}
Authorization: Bearer {token}

# Download file (returns presigned URL)
GET /api/files/{fileId}/download
Authorization: Bearer {token}

# Delete file
DELETE /api/files/{fileId}
Authorization: Bearer {token}

# Share file
PATCH /api/files/{fileId}/share
Authorization: Bearer {token}
Content-Type: application/json
{
  "expiresIn": 24,
  "allowDownload": true,
  "password": "optional"
}

# Get storage statistics
GET /api/files/stats/storage
Authorization: Bearer {token}
```

### Health Checks

```http
# General health
GET /api/health

# R2 storage health
GET /api/health/storage
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication required for all file operations
- User-specific file isolation
- Project-based access control

### File Security
- Presigned URLs with expiration (default: 1 hour)
- Password-protected sharing
- Access logging and monitoring
- File type validation and size limits

### Storage Security
- Files stored with metadata tagging
- Integrity verification with ETags
- Automatic cleanup of failed uploads

## 📊 Monitoring & Analytics

### Storage Metrics
- Total files and storage usage per user
- File type distribution
- Upload/download analytics
- Storage quota monitoring

### Performance Monitoring
- Upload success/failure rates
- Download speed tracking
- R2 API response times
- Error rate monitoring

## 🚦 Production Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your Cloudflare R2 credentials
```

### 3. Database Setup
```bash
# Ensure MongoDB is running
# The application will connect automatically
```

### 4. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

### 5. Verify Setup
```bash
# Check health
curl http://localhost:5000/api/health

# Check R2 connection
curl http://localhost:5000/api/health/storage
```

## 📋 Configuration Options

### File Type Support
```javascript
// Supported file types (configured in r2Upload.js)
- Images: JPG, PNG, GIF, WebP, TIFF, BMP, SVG (max 50MB)
- Videos: MP4, MPEG, MOV, AVI, WebM, FLV, WMV (max 5GB)
- Audio: MP3, WAV, AAC, OGG, WebM, FLAC (max 500MB)
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV (max 100MB)
- Archives: ZIP, RAR, 7Z, GZ, TAR (max 1GB)
```

### Storage Limits
```javascript
// Default limits (configurable per user)
- Storage Quota: 100GB per user
- Transfer Quota: 1TB per month
- Max File Size: 5GB
- Max Files per Upload: 50
```

## 🔧 Troubleshooting

### Common Issues

1. **R2 Connection Failed**
   ```bash
   # Check credentials in .env
   # Verify account ID and bucket name
   # Ensure API token has R2 permissions
   ```

2. **Upload Failures**
   ```bash
   # Check file size limits
   # Verify storage quota
   # Check file type restrictions
   ```

3. **Download Issues**
   ```bash
   # Verify file exists in R2
   # Check presigned URL expiration
   # Ensure bucket permissions
   ```

### Debug Mode
```env
# Enable debug logging
LOG_LEVEL=debug
NODE_ENV=development
```

## 📈 Scaling Considerations

### Performance Optimization
- Use multipart uploads for files > 100MB
- Implement client-side chunking for large files
- Enable CDN for public files (Cloudflare CDN)
- Use thumbnail caching

### Cost Optimization
- Configure lifecycle policies for old files
- Use R2's free tier effectively (10GB storage, 1M Class A operations monthly)
- Monitor usage with Cloudflare Analytics

### High Availability
- Enable Cloudflare's global network
- Implement retry logic for failed operations
- Use multiple R2 buckets for different regions if needed

## 🔗 Integration with Frontend

The backend provides RESTful APIs that can be consumed by any frontend. For the React frontend:

```javascript
// Example file upload
const uploadFile = async (file, projectId) => {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('projectId', projectId);

  const response = await fetch('/api/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};

// Example file download
const downloadFile = async (fileId) => {
  const response = await fetch(`/api/files/${fileId}/download`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  // Use data.downloadUrl for direct download
  window.open(data.downloadUrl, '_blank');
};
```

## 📞 Support

For production issues:
1. Check application logs
2. Verify R2 service status
3. Monitor storage quotas
4. Review API rate limits

## 🎯 Next Steps

### Recommended Enhancements
1. **CDN Integration**: Configure Cloudflare CDN for faster file delivery
2. **Advanced Sharing**: Implement team sharing and collaboration features
3. **Backup Strategy**: Set up cross-region backup to another R2 bucket
4. **Advanced Analytics**: Implement detailed usage analytics and reporting
5. **API Rate Limiting**: Implement per-user API rate limiting
6. **File Versioning**: Add file version control and history

This integration provides a solid foundation for a production-ready file storage and sharing platform using Cloudflare R2.
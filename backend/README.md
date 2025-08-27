# NexusFlow Backend

A comprehensive Node.js backend for the NexusFlow storage platform, built with Express.js, MongoDB, and modern file handling capabilities.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- User registration, login, password reset
- Email verification system
- Role-based access control (user/admin)
- Plan-based feature restrictions

### 📁 File Management
- Large file uploads (up to 5GB) with GridFS support
- Multiple file type support (images, videos, documents, archives)
- Automatic thumbnail generation for images and videos
- File metadata extraction (EXIF, video properties)
- File versioning and history
- Duplicate file detection via checksums

### 👥 Client & Project Management
- Client relationship management
- Project organization with folder structures
- Nested folder support (up to 20 levels deep)
- Project sharing with granular permissions

### 🔗 Sharing & Collaboration
- Secure share links with optional passwords
- Time-based expiration for shared content
- Access count limits
- Email-restricted sharing
- Public file/folder/project sharing

### 📊 Analytics & Quotas
- Storage and transfer quota management
- File download analytics
- User activity tracking
- Project statistics

### 🛡️ Security Features
- Request rate limiting
- File type validation
- Virus scanning preparation
- Secure headers
- Input validation and sanitization

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **MongoDB**: Running on localhost:27017 (or configure custom URI)
- **FFmpeg**: For video processing (included via ffmpeg-static)

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

Key environment variables:
```env
MONGODB_URI=mongodb://localhost:27017/nexusflow
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key
FRONTEND_URL=http://localhost:5173
```

### 3. Start MongoDB
Make sure MongoDB is running on your system.

### 4. Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Windows Quick Start:**
```bash
./start.bat
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `PATCH /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh-token` - Refresh JWT token

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/update-me` - Update user profile
- `DELETE /api/users/delete-me` - Delete user account

### Clients
- `GET /api/clients` - Get user's clients
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get specific client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get specific project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `PATCH /api/projects/:id/share` - Share project

### Files
- `POST /api/files` - Upload multiple files
- `POST /api/files/upload-large` - Upload large files (>100MB)
- `GET /api/files` - Get files with filtering
- `GET /api/files/:id` - Get specific file
- `PATCH /api/files/:id` - Update file metadata
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/:id/download` - Download file
- `PATCH /api/files/:id/share` - Share file

### Folders
- `GET /api/folders` - Get folders
- `POST /api/folders` - Create new folder
- `GET /api/folders/:id` - Get specific folder
- `PATCH /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder
- `PATCH /api/folders/:id/move` - Move folder

### Sharing (Public)
- `GET /api/share/project/:token/files` - Get shared project files
- `GET /api/share/folder/:token/contents` - Get shared folder contents
- `GET /api/share/download/:token` - Download shared file

## File Upload

### Supported File Types
- **Images**: JPG, PNG, GIF, WebP, TIFF, BMP, SVG (max 50MB)
- **Videos**: MP4, MPEG, MOV, AVI, WMV, WebM, FLV (max 5GB)
- **Audio**: MP3, WAV, AAC, OGG (max 500MB)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max 100MB)
- **Archives**: ZIP, RAR, 7Z, TAR, GZ (max 1GB)

### File Processing
- Automatic thumbnail generation for images and videos
- Metadata extraction (EXIF data, video properties)
- Checksum calculation for duplicate detection
- GridFS storage for files over 100MB

## Storage Structure

```
uploads/
├── [userId]/           # User-specific file storage
│   ├── files/         # Original files
│   └── thumbnails/    # Generated thumbnails
├── temp/              # Temporary upload processing
└── logs/              # Application logs
```

## Database Models

### User
- Authentication and profile information
- Storage and transfer quotas
- Plan and subscription details

### Client
- Client contact information
- Project associations
- Activity tracking

### Project
- Project metadata and settings
- Sharing configuration
- File and folder organization

### File
- File metadata and location
- Processing status
- Sharing permissions
- Analytics data

### Folder
- Hierarchical folder structure
- Nested organization
- Sharing capabilities

## Security Features

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role and ownership-based access
- **Rate Limiting**: API endpoint protection
- **File Validation**: Type and size restrictions
- **Input Sanitization**: XSS and injection prevention
- **Secure Headers**: CORS, CSP, and security headers

## Monitoring & Logging

- **Winston Logger**: Structured logging with rotation
- **Request Logging**: HTTP request/response tracking
- **Error Tracking**: Comprehensive error handling
- **Performance Metrics**: Response times and usage stats

## Development

### Project Structure
```
src/
├── config/         # Configuration files
├── controllers/    # Route handlers
├── middleware/     # Custom middleware
├── models/         # MongoDB schemas
├── routes/         # API routes
├── services/       # Business logic
└── utils/          # Helper functions
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Deployment

### Environment Variables
Ensure all production environment variables are set:
- `NODE_ENV=production`
- `MONGODB_URI` - Production MongoDB connection
- `JWT_SECRET` - Strong, unique secret
- `FRONTEND_URL` - Production frontend URL

### Process Management
Use PM2 or similar for production:
```bash
npm install -g pm2
pm2 start src/server.js --name "nexusflow-backend"
```

## Health Check

Check server status: `GET /api/health`

Response:
```json
{
  "success": true,
  "message": "NexusFlow API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## Support

For issues and questions:
1. Check the logs in the `logs/` directory
2. Verify MongoDB connection
3. Ensure all environment variables are set
4. Check file permissions for upload directories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]
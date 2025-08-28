# Monitoring Setup Guide

This document explains how to configure Sentry and LogRocket for the NexusFlow application.

## Prerequisites

1. **Sentry Account**: Sign up at [sentry.io](https://sentry.io) and create a new project
2. **LogRocket Account**: Sign up at [logrocket.com](https://logrocket.com) and create a new application

## Configuration Steps

### 1. Sentry Setup

1. Create a new project in Sentry dashboard
2. Copy the DSN from your project settings
3. Set the environment variable:
   ```bash
   export VITE_SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
   ```

### 2. LogRocket Setup

1. Create a new application in LogRocket dashboard
2. Copy the App ID from your application settings
3. Set the environment variable:
   ```bash
   export VITE_LOGROCKET_APP_ID="your-logrocket-app-id"
   ```

### 3. Environment Configuration

Create a `.env.production` file with the following variables:

```env
# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=1.0.0
VITE_SENTRY_SAMPLE_RATE=1.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

# LogRocket Configuration
VITE_LOGROCKET_APP_ID=your-logrocket-app-id

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_SESSION_REPLAY=true
```

## Features

### Error Tracking (Sentry)
- Automatic error capture and reporting
- Performance monitoring with transaction tracking
- User context and breadcrumbs
- Release tracking and source map support
- Custom error filtering and sanitization

### Session Replay (LogRocket)
- Full session recordings with user interactions
- Network request/response logging
- Console log capture
- DOM mutations tracking
- Privacy controls for sensitive data

### Integration Features
- LogRocket session URLs attached to Sentry errors
- User identification across both platforms
- Custom event tracking and analytics
- Performance metrics correlation

## Usage

### Basic Error Tracking
```typescript
import { monitoring } from './lib/monitoring';

// Capture an error
try {
  // risky operation
} catch (error) {
  monitoring.captureError(error, { context: 'user-action' });
}

// Capture a message
monitoring.captureMessage('Important event occurred', 'info', { userId: '123' });
```

### User Identification
```typescript
// Identify user for tracking
monitoring.identifyUser({
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe'
});
```

### Custom Events
```typescript
// Track user actions
monitoring.logUserAction('file-uploaded', {
  fileName: 'document.pdf',
  fileSize: 1024000,
  uploadTime: 3.2
});
```

### Performance Monitoring
```typescript
// Start a performance transaction
const transaction = monitoring.startTransaction('file-upload', 'http.request');
// ... perform operation
transaction?.finish();
```

## Deployment

### Using the Deploy Script
```bash
# Set environment variables
export VITE_SENTRY_DSN="your-sentry-dsn"
export VITE_LOGROCKET_APP_ID="your-app-id"

# Run deployment script
chmod +x deploy-production.sh
./deploy-production.sh
```

### Manual Deployment
```bash
# Install dependencies
npm ci

# Build with production environment
npm run build

# Deploy dist/ folder to your server
```

## Testing Configuration

### Development Environment
In development, monitoring is disabled by default. To test monitoring:

1. Copy `.env.example` to `.env.local`
2. Set `VITE_ENABLE_ERROR_REPORTING=true`
3. Add your test Sentry DSN and LogRocket App ID
4. Restart the development server

### Production Testing
1. Deploy to a staging environment first
2. Trigger test errors to verify Sentry integration
3. Perform user actions to verify LogRocket recording
4. Check both dashboards for incoming data

## Troubleshooting

### Common Issues

1. **No errors appearing in Sentry**
   - Check DSN configuration
   - Verify `VITE_ENABLE_ERROR_REPORTING=true`
   - Check browser console for initialization errors

2. **LogRocket not recording sessions**
   - Verify App ID configuration
   - Check `VITE_ENABLE_SESSION_REPLAY=true`
   - Ensure LogRocket script loads successfully

3. **Performance impact**
   - Adjust sample rates in production
   - Use error filtering to reduce noise
   - Monitor bundle size impact

### Debug Mode
Add to `.env.local` for debugging:
```env
VITE_DEBUG_MONITORING=true
```

## Security Considerations

1. **Data Sanitization**: Sensitive data is automatically filtered
2. **Sample Rates**: Configure appropriate sample rates for production
3. **Privacy**: LogRocket respects privacy settings and masks sensitive inputs
4. **GDPR Compliance**: Both services provide GDPR-compliant data handling

## Support

- Sentry Documentation: https://docs.sentry.io/
- LogRocket Documentation: https://docs.logrocket.com/
- Project Issues: Create an issue in this repository
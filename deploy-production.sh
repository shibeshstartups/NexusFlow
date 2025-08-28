#!/bin/bash

# Production Deployment Script for NexusFlow
# This script sets up the production environment with monitoring

set -e

echo "🚀 Starting NexusFlow production deployment..."

# Check if required environment variables are set
required_vars=("VITE_SENTRY_DSN" "VITE_LOGROCKET_APP_ID")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Error: $var is not set"
        echo "Please set the following environment variables:"
        echo "  VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id"
        echo "  VITE_LOGROCKET_APP_ID=your-logrocket-app-id"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

echo "🔧 Building application..."
npm run build

echo "🔍 Running post-build validations..."

# Check if build directory exists
if [[ ! -d "dist" ]]; then
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

# Check if index.html exists
if [[ ! -f "dist/index.html" ]]; then
    echo "❌ Build failed: index.html not found in dist"
    exit 1
fi

echo "✅ Build validation passed"

# Create production environment file
echo "⚙️ Creating production environment configuration..."
cat > .env.production << EOF
# Production Environment - Generated $(date)
VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VITE_SENTRY_SAMPLE_RATE=1.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

VITE_LOGROCKET_APP_ID=${VITE_LOGROCKET_APP_ID}

VITE_APP_NAME=NexusFlow
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.nexusflow.com
VITE_CDN_BASE_URL=https://cdn.nexusflow.com

VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_SESSION_REPLAY=true

VITE_MAX_FILE_SIZE=5368709120
VITE_SUPPORTED_FILE_TYPES=jpg,jpeg,png,gif,webp,mp4,mov,avi,pdf,zip,rar

VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
EOF

echo "✅ Production environment configured"

# Optional: Upload source maps to Sentry
if command -v sentry-cli &> /dev/null; then
    echo "📡 Uploading source maps to Sentry..."
    sentry-cli releases new "${VITE_SENTRY_RELEASE}"
    sentry-cli releases files "${VITE_SENTRY_RELEASE}" upload-sourcemaps dist/assets
    sentry-cli releases finalize "${VITE_SENTRY_RELEASE}"
    echo "✅ Source maps uploaded"
else
    echo "⚠️ sentry-cli not found, skipping source map upload"
    echo "   Install sentry-cli for better error tracking: npm install -g @sentry/cli"
fi

echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Build directory: ./dist"
echo "   Sentry DSN: ${VITE_SENTRY_DSN}"
echo "   LogRocket App ID: ${VITE_LOGROCKET_APP_ID}"
echo "   Release version: $(cat .env.production | grep VITE_SENTRY_RELEASE | cut -d'=' -f2)"
echo ""
echo "🚢 Next steps:"
echo "   1. Deploy the dist/ folder to your web server"
echo "   2. Configure your web server with appropriate headers"
echo "   3. Test the application in production"
echo "   4. Monitor errors in Sentry dashboard"
echo "   5. Review session recordings in LogRocket"
echo ""
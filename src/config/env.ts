// Environment configuration with type safety
// This file provides typed access to environment variables

interface EnvironmentConfig {
  // API Configuration
  apiUrl: string;
  
  // R2 CDN Configuration
  r2: {
    cdnEnabled: boolean;
    publicDomain?: string;
    devSubdomain: string;
  };
  
  // Storage Configuration
  storage: {
    maxFileSize: number;
    supportedFileTypes: string[];
    chunkSize: number;
    maxConcurrentUploads: number;
    retryAttempts: number;
  };
  
  // UI Configuration
  ui: {
    enableProgressBar: boolean;
    enableThumbnails: boolean;
    enablePreview: boolean;
    enableLazyLoading: boolean;
    thumbnailSizes: number[];
  };
  
  // Performance Settings
  performance: {
    enableImageOptimization: boolean;
    enableResponsiveImages: boolean;
    enableWebpConversion: boolean;
    enableProgressiveLoading: boolean;
  };
  
  // Security
  security: {
    enableFileValidation: boolean;
    enableVirusScanning: boolean;
  };
  
  // Analytics
  analytics: {
    enableUploadAnalytics: boolean;
    enablePerformanceMonitoring: boolean;
  };
  
  // Real-time Features
  realTime: {
    enableNotifications: boolean;
    websocketUrl: string;
  };
  
  // PWA Features
  pwa: {
    enableOfflineUpload: boolean;
    enableBackgroundSync: boolean;
  };
  
  // Development
  development: {
    enableDebugLogs: boolean;
    enableMockUploads: boolean;
  };
}

// Helper function to parse boolean from string
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse number from string
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to parse array from string
const parseArray = (value: string | undefined, defaultValue: string[] = []): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// Helper function to parse number array from string
const parseNumberArray = (value: string | undefined, defaultValue: number[] = []): number[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => parseInt(item.trim(), 10)).filter(num => !isNaN(num));
};

// Create the environment configuration
export const env: EnvironmentConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  
  r2: {
    cdnEnabled: parseBoolean(import.meta.env.VITE_R2_CDN_ENABLED, true),
    publicDomain: import.meta.env.VITE_R2_PUBLIC_DOMAIN,
    devSubdomain: import.meta.env.VITE_R2_DEV_SUBDOMAIN || 'nexusflow-storage',
  },
  
  storage: {
    maxFileSize: parseNumber(import.meta.env.VITE_MAX_FILE_SIZE, 5368709120), // 5GB
    supportedFileTypes: parseArray(import.meta.env.VITE_SUPPORTED_FILE_TYPES, [
      'image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'
    ]),
    chunkSize: parseNumber(import.meta.env.VITE_CHUNK_SIZE, 5242880), // 5MB
    maxConcurrentUploads: parseNumber(import.meta.env.VITE_MAX_CONCURRENT_UPLOADS, 3),
    retryAttempts: parseNumber(import.meta.env.VITE_RETRY_ATTEMPTS, 3),
  },
  
  ui: {
    enableProgressBar: parseBoolean(import.meta.env.VITE_ENABLE_PROGRESS_BAR, true),
    enableThumbnails: parseBoolean(import.meta.env.VITE_ENABLE_THUMBNAILS, true),
    enablePreview: parseBoolean(import.meta.env.VITE_ENABLE_PREVIEW, true),
    enableLazyLoading: parseBoolean(import.meta.env.VITE_ENABLE_LAZY_LOADING, true),
    thumbnailSizes: parseNumberArray(import.meta.env.VITE_THUMBNAIL_SIZES, [150, 300, 600]),
  },
  
  performance: {
    enableImageOptimization: parseBoolean(import.meta.env.VITE_ENABLE_IMAGE_OPTIMIZATION, true),
    enableResponsiveImages: parseBoolean(import.meta.env.VITE_ENABLE_RESPONSIVE_IMAGES, true),
    enableWebpConversion: parseBoolean(import.meta.env.VITE_ENABLE_WEBP_CONVERSION, true),
    enableProgressiveLoading: parseBoolean(import.meta.env.VITE_ENABLE_PROGRESSIVE_LOADING, true),
  },
  
  security: {
    enableFileValidation: parseBoolean(import.meta.env.VITE_ENABLE_FILE_VALIDATION, true),
    enableVirusScanning: parseBoolean(import.meta.env.VITE_ENABLE_VIRUS_SCANNING, false),
  },
  
  analytics: {
    enableUploadAnalytics: parseBoolean(import.meta.env.VITE_ENABLE_UPLOAD_ANALYTICS, true),
    enablePerformanceMonitoring: parseBoolean(import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING, true),
  },
  
  realTime: {
    enableNotifications: parseBoolean(import.meta.env.VITE_ENABLE_REAL_TIME_NOTIFICATIONS, true),
    websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5000',
  },
  
  pwa: {
    enableOfflineUpload: parseBoolean(import.meta.env.VITE_ENABLE_OFFLINE_UPLOAD, true),
    enableBackgroundSync: parseBoolean(import.meta.env.VITE_ENABLE_BACKGROUND_SYNC, true),
  },
  
  development: {
    enableDebugLogs: parseBoolean(import.meta.env.VITE_ENABLE_DEBUG_LOGS, true),
    enableMockUploads: parseBoolean(import.meta.env.VITE_ENABLE_MOCK_UPLOADS, false),
  },
};

// Export individual sections for convenience
export const { apiUrl, r2, storage, ui, performance, security, analytics, realTime, pwa, development } = env;

// Development helpers
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Validation function to check if all required environment variables are set
export const validateEnvironment = (): { valid: boolean; missing: string[] } => {
  const required = ['VITE_API_URL'];
  const missing = required.filter(key => !import.meta.env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
};

// Debug function to log environment configuration (development only)
export const logEnvironmentConfig = (): void => {
  if (development.enableDebugLogs && isDevelopment) {
    console.group('🔧 Environment Configuration');
    console.log('API URL:', env.apiUrl);
    console.log('R2 Configuration:', env.r2);
    console.log('Storage Configuration:', env.storage);
    console.log('UI Configuration:', env.ui);
    console.log('Performance Configuration:', env.performance);
    console.groupEnd();
  }
};

export default env;
/// <reference types="vite/client" />

// Environment variable definitions for TypeScript
interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  
  // R2 CDN Configuration
  readonly VITE_R2_CDN_ENABLED: string;
  readonly VITE_R2_PUBLIC_DOMAIN?: string;
  readonly VITE_R2_DEV_SUBDOMAIN: string;
  
  // Storage Configuration
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_SUPPORTED_FILE_TYPES: string;
  readonly VITE_CHUNK_SIZE: string;
  readonly VITE_MAX_CONCURRENT_UPLOADS: string;
  readonly VITE_RETRY_ATTEMPTS: string;
  
  // UI Configuration
  readonly VITE_ENABLE_PROGRESS_BAR: string;
  readonly VITE_ENABLE_THUMBNAILS: string;
  readonly VITE_ENABLE_PREVIEW: string;
  readonly VITE_ENABLE_LAZY_LOADING: string;
  readonly VITE_THUMBNAIL_SIZES: string;
  
  // Performance Settings
  readonly VITE_ENABLE_IMAGE_OPTIMIZATION: string;
  readonly VITE_ENABLE_RESPONSIVE_IMAGES: string;
  readonly VITE_ENABLE_WEBP_CONVERSION: string;
  readonly VITE_ENABLE_PROGRESSIVE_LOADING: string;
  
  // Security
  readonly VITE_ENABLE_FILE_VALIDATION: string;
  readonly VITE_ENABLE_VIRUS_SCANNING: string;
  
  // Analytics
  readonly VITE_ENABLE_UPLOAD_ANALYTICS: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;
  
  // Real-time Features
  readonly VITE_ENABLE_REAL_TIME_NOTIFICATIONS: string;
  readonly VITE_WEBSOCKET_URL: string;
  
  // PWA Features
  readonly VITE_ENABLE_OFFLINE_UPLOAD: string;
  readonly VITE_ENABLE_BACKGROUND_SYNC: string;
  
  // Development Settings
  readonly VITE_ENABLE_DEBUG_LOGS: string;
  readonly VITE_ENABLE_MOCK_UPLOADS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

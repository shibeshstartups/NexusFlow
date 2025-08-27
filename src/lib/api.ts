// API service layer for React Query
const API_BASE_URL = '/api';

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Create headers with authentication
const createHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
});

interface UploadResponse {
  success: boolean;
  data: {
    files: File[];
    projectId: string;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ShareOptions {
  isPublic?: boolean;
  expiresAt?: Date;
  password?: string;
}

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: createHeaders(),
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API Types
export interface File {
  _id: string;
  originalName: string;
  displayName: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
  size: number;
  mimeType: string;
  storage: {
    url: string;
    cdnUrl?: string;
    key: string;
  };
  createdAt: string;
  project: {
    _id: string;
    name: string;
  };
  analytics: {
    viewCount: number;
    downloadCount: number;
  };
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  metrics: {
    totalFiles: number;
    totalSize: number;
  };
}

interface CDNAnalytics {
  bandwidth: number;
  requests: number;
  cacheHitRatio: number;
  lastUpdated: string;
}

export interface StorageStats {
  r2Stats: {
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
  };
  user: {
    storageUsed: number;
    storageQuota: number;
    storageUsagePercentage: number;
  };
  cdn?: {
    enabled: boolean;
    analytics?: CDNAnalytics;
  };
}

// API Functions
export const fileApi = {
  // Get files with filters
  getFiles: (params: Record<string, string | number> = {}): Promise<{ success: boolean; data: { files: File[] } }> => {
    const stringParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    );
    const searchParams = new URLSearchParams(stringParams).toString();
    return apiRequest(`/files?${searchParams}`);
  },

  // Get single file
  getFile: (fileId: string): Promise<{ success: boolean; data: { file: File } }> => {
    return apiRequest(`/files/${fileId}`);
  },

  // Upload files
  uploadFiles: async (files: FileList, projectId: string, isPublic: boolean = false): Promise<UploadResponse> => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('projectId', projectId);
    formData.append('isPublic', isPublic.toString());

    const response = await fetch(`${API_BASE_URL}/files`, {
      method: 'POST',
      headers: {
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  // Delete file
  deleteFile: (fileId: string): Promise<ApiResponse> => {
    return apiRequest(`/files/${fileId}`, { method: 'DELETE' });
  },

  // Get download URL
  getDownloadUrl: (fileId: string): Promise<{ success: boolean; data: { downloadUrl: string } }> => {
    return apiRequest(`/files/${fileId}/download`);
  },

  // Get responsive image URLs
  getResponsiveImages: (fileId: string): Promise<ApiResponse<{ urls: Record<string, string> }>> => {
    return apiRequest(`/files/${fileId}/responsive`);
  },

  // Share file
  shareFile: (fileId: string, options: ShareOptions): Promise<ApiResponse<{ shareUrl: string }>> => {
    return apiRequest(`/files/${fileId}/share`, {
      method: 'PATCH',
      body: JSON.stringify(options),
    });
  },

  // Get storage statistics
  getStorageStats: (): Promise<{ success: boolean; data: StorageStats }> => {
    return apiRequest('/files/stats/storage');
  },
};

export const projectApi = {
  // Get projects
  getProjects: (params: Record<string, string | number> = {}): Promise<{ success: boolean; data: { projects: Project[] } }> => {
    const stringParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    );
    const searchParams = new URLSearchParams(stringParams).toString();
    return apiRequest(`/projects?${searchParams}`);
  },

  // Get single project
  getProject: (projectId: string): Promise<{ success: boolean; data: { project: Project } }> => {
    return apiRequest(`/projects/${projectId}`);
  },

  // Create project
  createProject: (data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> => {
    return apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update project
  updateProject: (projectId: string, data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> => {
    return apiRequest(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete project
  deleteProject: (projectId: string): Promise<ApiResponse> => {
    return apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
  },
};

export const cdnApi = {
  // Get CDN analytics
  getCdnAnalytics: (since?: string): Promise<ApiResponse<CDNAnalytics>> => {
    const params = since ? `?since=${since}` : '';
    return apiRequest(`/files/cdn/analytics${params}`);
  },

  // Purge CDN cache
  purgeCdnCache: (fileIds: string[]): Promise<ApiResponse<{ purged: number }>> => {
    return apiRequest('/files/cdn/purge', {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    });
  },

  // Setup CDN optimization
  setupCdnOptimization: (): Promise<ApiResponse<{ enabled: boolean }>> => {
    return apiRequest('/files/cdn/optimize', { method: 'POST' });
  },
};
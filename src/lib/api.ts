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

  // Folder upload with structure preservation
  uploadFolder: async (files: FileList, projectId: string, parentFolderId?: string, folderStructure?: any): Promise<UploadResponse> => {
    const formData = new FormData();
    
    // Add files with their relative paths
    Array.from(files).forEach(file => {
      formData.append('files', file, file.webkitRelativePath || file.name);
    });
    
    // Add metadata
    formData.append('projectId', projectId);
    if (parentFolderId) {
      formData.append('parentFolderId', parentFolderId);
    }
    if (folderStructure) {
      formData.append('folderStructure', JSON.stringify(folderStructure));
    }
    formData.append('allowDuplicates', 'false');

    const response = await fetch(`${API_BASE_URL}/files/upload-folder`, {
      method: 'POST',
      headers: {
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Folder upload failed' }));
      throw new Error(error.message || 'Folder upload failed');
    }

    return response.json();
  },

  // Bulk download selected files as ZIP
  downloadFilesAsZip: async (fileIds: string[], archiveName = 'selected_files'): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/files/download/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      },
      body: JSON.stringify({
        fileIds,
        archiveName
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Bulk download failed' }));
      throw new Error(error.message || 'Bulk download failed');
    }

    return response.blob();
  },

  // Download folder as ZIP
  downloadFolderAsZip: async (folderId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/files/download/folder/${folderId}`, {
      method: 'GET',
      headers: {
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Folder download failed' }));
      throw new Error(error.message || 'Folder download failed');
    }

    return response.blob();
  },

  // Download project as ZIP
  downloadProjectAsZip: async (projectId: string, projectName?: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/files/download/project/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      },
      body: JSON.stringify({
        projectName
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Project download failed' }));
      throw new Error(error.message || 'Project download failed');
    }

    return response.blob();
  },

  // Get download status for bulk operations
  getBulkDownloadStatus: (downloadId: string): Promise<{ success: boolean; data: any }> => {
    return apiRequest(`/files/download/status/${downloadId}`);
  },
};

// Folder API Functions
export const folderApi = {
  // Get folders
  getFolders: (params: Record<string, string | number> = {}): Promise<{ success: boolean; data: { folders: any[] } }> => {
    const stringParams = Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    );
    const searchParams = new URLSearchParams(stringParams).toString();
    return apiRequest(`/folders?${searchParams}`);
  },

  // Get single folder
  getFolder: (folderId: string): Promise<{ success: boolean; data: { folder: any } }> => {
    return apiRequest(`/folders/${folderId}`);
  },

  // Create folder
  createFolder: (data: any): Promise<ApiResponse<{ folder: any }>> => {
    return apiRequest('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update folder
  updateFolder: (folderId: string, data: any): Promise<ApiResponse<{ folder: any }>> => {
    return apiRequest(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete folder
  deleteFolder: (folderId: string): Promise<ApiResponse> => {
    return apiRequest(`/folders/${folderId}`, { method: 'DELETE' });
  },

  // Move folder
  moveFolder: (folderId: string, newParentId?: string): Promise<ApiResponse<{ folder: any }>> => {
    return apiRequest(`/folders/${folderId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId: newParentId }),
    });
  },

  // Share folder
  shareFolder: (folderId: string): Promise<ApiResponse<{ shareLink: string }>> => {
    return apiRequest(`/folders/${folderId}/share`, { method: 'PATCH' });
  },

  // Get folder tree
  getFolderTree: (projectId: string): Promise<{ success: boolean; data: { tree: any } }> => {
    return apiRequest(`/folders/tree/${projectId}`);
  },

  // Download folder as ZIP
  downloadFolderAsZip: async (folderId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/folders/${folderId}/download`, {
      method: 'GET',
      headers: {
        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Folder download failed' }));
      throw new Error(error.message || 'Folder download failed');
    }

    return response.blob();
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

// Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  avatar?: string;
  storageUsed: number;
  storageQuota: number;
  transferUsed: number;
  transferQuota: number;
  isEmailVerified: boolean;
  preferences: {
    notifications: {
      email: boolean;
      browser: boolean;
    };
    theme: string;
    language: string;
  };
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token?: string;
  };
  message?: string;
}

// Authentication API Functions
export const authApi = {
  // Login with email/password
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include', // Include cookies for JWT
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Invalid email or password');
    }

    const data = await response.json();
    
    // Store token in localStorage if provided
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },

  // Register new user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    
    // Store token in localStorage if provided
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },

  // Logout
  logout: async (): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: createHeaders(),
      credentials: 'include',
    });

    // Remove token from localStorage regardless of response
    localStorage.removeItem('token');

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Logout failed' }));
      throw new Error(error.message || 'Logout failed');
    }

    return response.json();
  },

  // Get current user info
  getMe: (): Promise<AuthResponse> => {
    return apiRequest('/users/me');
  },

  // Refresh token
  refreshToken: async (): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Token refresh failed' }));
      localStorage.removeItem('token'); // Clear invalid token
      throw new Error(error.message || 'Session expired');
    }

    const data = await response.json();
    
    // Store new token if provided
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<AuthResponse> => {
    return apiRequest('/auth/reset-password', {
      method: 'PATCH',
      body: JSON.stringify({ token, password }),
    });
  },

  // Google OAuth (to be implemented)
  googleLogin: async (googleToken: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Google login failed' }));
      throw new Error(error.message || 'Google authentication failed');
    }

    const data = await response.json();
    
    // Store token in localStorage if provided
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  },
};
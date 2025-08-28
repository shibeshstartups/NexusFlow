import { useState, useCallback } from 'react';

export interface BulkDownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (downloadId: string, filename: string) => void;
  onError?: (error: string) => void;
}

export interface DownloadProgress {
  downloadId: string;
  status: 'preparing' | 'downloading' | 'completed' | 'error' | 'paused' | 'resuming';
  percentage: number;
  totalFiles?: number;
  processedFiles?: number;
  estimatedSize?: number;
  currentFile?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  isResumable?: boolean;
}

export interface BulkDownloadState {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  error: string | null;
  canResume: boolean;
  downloadInfo: DownloadInfo | null;
}

interface DownloadInfo {
  downloadId: string;
  url: string;
  filename: string;
  totalSize: number;
  downloadedChunks: number[];
  chunkSize: number;
  totalChunks: number;
}

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const STORAGE_KEY = 'bulkDownload_resumeData';

interface ResumeData {
  [downloadId: string]: {
    downloadedChunks: number[];
    totalChunks: number;
    chunkSize: number;
    downloadedBytes: number;
    totalBytes: number;
    filename: string;
    url: string;
  };
}

const saveResumeData = (downloadId: string, data: any) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resumeData: ResumeData = stored ? JSON.parse(stored) : {};
    resumeData[downloadId] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  } catch (error) {
    console.warn('Failed to save resume data:', error);
  }
};

const getResumeData = (downloadId: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const resumeData: ResumeData = JSON.parse(stored);
    return resumeData[downloadId] || null;
  } catch (error) {
    console.warn('Failed to get resume data:', error);
    return null;
  }
};

const clearResumeData = (downloadId: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const resumeData: ResumeData = JSON.parse(stored);
    delete resumeData[downloadId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  } catch (error) {
    console.warn('Failed to clear resume data:', error);
  }
};

const downloadWithResume = async (
  url: string,
  filename: string,
  downloadId: string,
  onProgress: (progress: Partial<DownloadProgress>) => void,
  signal?: AbortSignal
): Promise<void> => {
  try {
    // First, get the total file size
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`
      },
      signal
    });
    
    if (!headResponse.ok) {
      throw new Error('Failed to get file info');
    }
    
    const totalBytes = parseInt(headResponse.headers.get('content-length') || '0');
    const acceptsRanges = headResponse.headers.get('accept-ranges') === 'bytes';
    
    if (!acceptsRanges || totalBytes === 0) {
      // Fallback to regular download if ranges not supported
      return downloadFileRegular(url, filename, downloadId, onProgress, signal);
    }
    
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    let resumeData = getResumeData(downloadId);
    
    // Initialize or validate resume data
    if (!resumeData || resumeData.totalBytes !== totalBytes) {
      resumeData = {
        downloadedChunks: [],
        totalChunks,
        chunkSize: CHUNK_SIZE,
        downloadedBytes: 0,
        totalBytes,
        filename,
        url
      };
    }
    
    const chunks: Uint8Array[] = new Array(totalChunks);
    
    // Download missing chunks
    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) {
        throw new Error('Download cancelled');
      }
      
      if (resumeData.downloadedChunks.includes(i)) {
        continue; // Skip already downloaded chunks
      }
      
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE - 1, totalBytes - 1);
      
      onProgress({
        status: 'downloading',
        percentage: (resumeData.downloadedBytes / totalBytes) * 100,
        downloadedBytes: resumeData.downloadedBytes,
        totalBytes,
        currentFile: `Chunk ${i + 1}/${totalChunks}`
      });
      
      const chunkResponse = await fetch(url, {
        headers: {
          'Range': `bytes=${start}-${end}`,
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        signal
      });
      
      if (!chunkResponse.ok && chunkResponse.status !== 206) {
        throw new Error(`Failed to download chunk ${i}`);
      }
      
      const chunkData = await chunkResponse.arrayBuffer();
      chunks[i] = new Uint8Array(chunkData);
      
      // Update resume data
      resumeData.downloadedChunks.push(i);
      resumeData.downloadedBytes += chunkData.byteLength;
      saveResumeData(downloadId, resumeData);
    }
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + (chunk?.length || 0), 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      if (chunk) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
    }
    
    // Create blob and download
    const blob = new Blob([combined]);
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
    clearResumeData(downloadId);
    
    onProgress({
      status: 'completed',
      percentage: 100,
      downloadedBytes: totalBytes,
      totalBytes
    });
    
  } catch (error) {
    if (signal?.aborted) {
      onProgress({ status: 'paused' });
    } else {
      throw error;
    }
  }
};

const downloadFileRegular = async (
  url: string,
  filename: string,
  downloadId: string,
  onProgress: (progress: Partial<DownloadProgress>) => void,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`
    },
    signal
  });
  
  if (!response.ok) {
    throw new Error('Download failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(downloadUrl);
  clearResumeData(downloadId);
  
  onProgress({
    status: 'completed',
    percentage: 100
  });
};



export const useBulkDownload = (): {
  state: BulkDownloadState;
  downloadFolder: (folderId: string, options?: BulkDownloadOptions) => Promise<void>;
  downloadFiles: (fileIds: string[], archiveName?: string, options?: BulkDownloadOptions) => Promise<void>;
  downloadProject: (projectId: string, projectName?: string, options?: BulkDownloadOptions) => Promise<void>;
  cancelDownload: () => void;
  resumeDownload: () => Promise<void>;
  pauseDownload: () => void;
} => {
  const [state, setState] = useState<BulkDownloadState>({
    isDownloading: false,
    progress: null,
    error: null,
    canResume: false,
    downloadInfo: null
  });
  
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const updateProgress = useCallback((progress: Partial<DownloadProgress>) => {
    setState(prev => ({
      ...prev,
      progress: prev.progress ? { ...prev.progress, ...progress } : null
    }));
  }, []);
  
  const resetState = useCallback(() => {
    setState({
      isDownloading: false,
      progress: null,
      error: null,
      canResume: false,
      downloadInfo: null
    });
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);
  
  const handleDownloadError = useCallback((error: string, options?: BulkDownloadOptions) => {
    setState(prev => ({
      ...prev,
      isDownloading: false,
      error,
      canResume: prev.downloadInfo !== null
    }));
    
    if (options?.onError) {
      options.onError(error);
    }
  }, []);
  
  const downloadFolder = useCallback(async (folderId: string, options?: BulkDownloadOptions) => {
    if (state.isDownloading) {
      throw new Error('Download already in progress');
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    
    const downloadId = `folder_${folderId}_${Date.now()}`;
    
    setState({
      isDownloading: true,
      progress: {
        downloadId,
        status: 'preparing',
        percentage: 0,
        isResumable: true
      },
      error: null,
      canResume: false,
      downloadInfo: null
    });
    
    try {
      // Get download URL
      const response = await fetch(`/api/files/download/folder/${folderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ requestResumable: true }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const downloadUrl = data.downloadUrl;
      const totalFiles = data.totalFiles || 0;
      const estimatedSize = data.estimatedSize || 0;
      const filename = data.filename || `folder_${folderId}.zip`;
      
      const downloadInfo: DownloadInfo = {
        downloadId,
        url: downloadUrl,
        filename,
        totalSize: estimatedSize,
        downloadedChunks: [],
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(estimatedSize / CHUNK_SIZE)
      };
      
      setState(prev => ({
        ...prev,
        downloadInfo,
        canResume: true
      }));
      
      updateProgress({
        downloadId,
        status: 'downloading',
        totalFiles,
        estimatedSize,
        isResumable: true
      });
      
      if (options?.onProgress) {
        options.onProgress({
          downloadId,
          status: 'downloading',
          percentage: 0,
          totalFiles,
          estimatedSize,
          isResumable: true
        });
      }
      
      await downloadWithResume(
        downloadUrl,
        filename,
        downloadId,
        (progress) => {
          updateProgress(progress);
          if (options?.onProgress && state.progress) {
            options.onProgress({ ...state.progress, ...progress });
          }
        },
        controller.signal
      );
      
      if (options?.onComplete) {
        options.onComplete(downloadId, filename);
      }
      
      setTimeout(resetState, 2000);
      
    } catch (error) {
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          canResume: prev.downloadInfo !== null
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        handleDownloadError(errorMessage, options);
      }
    }
  }, [state.isDownloading, state.progress, updateProgress, handleDownloadError, resetState]);
  
  const downloadFiles = useCallback(async (fileIds: string[], archiveName = 'selected_files', options?: BulkDownloadOptions) => {
    if (state.isDownloading) {
      throw new Error('Download already in progress');
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    
    const downloadId = `files_${Date.now()}`;
    
    setState({
      isDownloading: true,
      progress: {
        downloadId,
        status: 'preparing',
        percentage: 0,
        isResumable: true
      },
      error: null,
      canResume: false,
      downloadInfo: null
    });
    
    try {
      // Initiate files download
      const response = await fetch('/api/files/download/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          fileIds,
          archiveName,
          requestResumable: true
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const downloadUrl = data.downloadUrl;
      const totalFiles = data.totalFiles || 0;
      const estimatedSize = data.estimatedSize || 0;
      const filename = data.filename || `${archiveName}.zip`;
      
      const downloadInfo: DownloadInfo = {
        downloadId,
        url: downloadUrl,
        filename,
        totalSize: estimatedSize,
        downloadedChunks: [],
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(estimatedSize / CHUNK_SIZE)
      };
      
      setState(prev => ({
        ...prev,
        downloadInfo,
        canResume: true
      }));
      
      updateProgress({
        downloadId,
        status: 'downloading',
        totalFiles,
        estimatedSize,
        isResumable: true
      });
      
      if (options?.onProgress) {
        options.onProgress({
          downloadId,
          status: 'downloading',
          percentage: 0,
          totalFiles,
          estimatedSize,
          isResumable: true
        });
      }
      
      await downloadWithResume(
        downloadUrl,
        filename,
        downloadId,
        (progress) => {
          updateProgress(progress);
          if (options?.onProgress && state.progress) {
            options.onProgress({ ...state.progress, ...progress });
          }
        },
        controller.signal
      );
      
      if (options?.onComplete) {
        options.onComplete(downloadId, filename);
      }
      
      setTimeout(resetState, 2000);
      
    } catch (error) {
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          canResume: prev.downloadInfo !== null
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        handleDownloadError(errorMessage, options);
      }
    }
  }, [state.isDownloading, state.progress, updateProgress, handleDownloadError, resetState]);
  
  const downloadProject = useCallback(async (projectId: string, projectName?: string, options?: BulkDownloadOptions) => {
    if (state.isDownloading) {
      throw new Error('Download already in progress');
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    
    const downloadId = `project_${projectId}_${Date.now()}`;
    
    setState({
      isDownloading: true,
      progress: {
        downloadId,
        status: 'preparing',
        percentage: 0,
        isResumable: true
      },
      error: null,
      canResume: false,
      downloadInfo: null
    });
    
    try {
      // Initiate project download
      const response = await fetch(`/api/files/download/project/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          projectName,
          requestResumable: true
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const downloadUrl = data.downloadUrl;
      const totalFiles = data.totalFiles || 0;
      const estimatedSize = data.estimatedSize || 0;
      const filename = data.filename || `${projectName || 'project'}.zip`;
      
      const downloadInfo: DownloadInfo = {
        downloadId,
        url: downloadUrl,
        filename,
        totalSize: estimatedSize,
        downloadedChunks: [],
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(estimatedSize / CHUNK_SIZE)
      };
      
      setState(prev => ({
        ...prev,
        downloadInfo,
        canResume: true
      }));
      
      updateProgress({
        downloadId,
        status: 'downloading',
        totalFiles,
        estimatedSize,
        isResumable: true
      });
      
      if (options?.onProgress) {
        options.onProgress({
          downloadId,
          status: 'downloading',
          percentage: 0,
          totalFiles,
          estimatedSize,
          isResumable: true
        });
      }
      
      await downloadWithResume(
        downloadUrl,
        filename,
        downloadId,
        (progress) => {
          updateProgress(progress);
          if (options?.onProgress && state.progress) {
            options.onProgress({ ...state.progress, ...progress });
          }
        },
        controller.signal
      );
      
      if (options?.onComplete) {
        options.onComplete(downloadId, filename);
      }
      
      setTimeout(resetState, 2000);
      
    } catch (error) {
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          canResume: prev.downloadInfo !== null
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        handleDownloadError(errorMessage, options);
      }
    }
  }, [state.isDownloading, state.progress, updateProgress, handleDownloadError, resetState]);

  const pauseDownload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setState(prev => ({
      ...prev,
      isDownloading: false,
      canResume: prev.downloadInfo !== null
    }));
    updateProgress({ status: 'paused' });
  }, [abortController, updateProgress]);

  const resumeDownload = useCallback(async () => {
    if (!state.downloadInfo || state.isDownloading) {
      throw new Error('Cannot resume download');
    }

    const controller = new AbortController();
    setAbortController(controller);

    setState(prev => ({
      ...prev,
      isDownloading: true,
      error: null
    }));

    updateProgress({ status: 'resuming' });

    try {
      await downloadWithResume(
        state.downloadInfo.url,
        state.downloadInfo.filename,
        state.downloadInfo.downloadId,
        (progress) => {
          updateProgress(progress);
        },
        controller.signal
      );

      setTimeout(resetState, 2000);
    } catch (error) {
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          canResume: prev.downloadInfo !== null
        }));
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Download failed';
        handleDownloadError(errorMessage);
      }
    }
  }, [state.downloadInfo, state.isDownloading, updateProgress, handleDownloadError, resetState]);
  
  const cancelDownload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (state.progress?.downloadId) {
      clearResumeData(state.progress.downloadId);
    }
    resetState();
  }, [abortController, state.progress, resetState]);
  
  return {
    state,
    downloadFolder,
    downloadFiles,
    downloadProject,
    cancelDownload,
    resumeDownload,
    pauseDownload
  };
};
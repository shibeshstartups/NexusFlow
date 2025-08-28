import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Folder, 
  File, 
  X, 
  Check, 
  AlertCircle, 
  Loader,
  FolderOpen,
  FileText,
  Image,
  Video,
  Music
} from 'lucide-react';

export interface FolderUploadProps {
  projectId: string;
  parentFolderId?: string;
  onUploadComplete?: (files: any[]) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onError?: (error: string) => void;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export interface UploadProgress {
  totalFiles: number;
  uploadedFiles: number;
  currentFile?: string;
  percentage: number;
  bytesUploaded: number;
  totalBytes: number;
}

export interface FileWithPath extends File {
  webkitRelativePath: string;
  path?: string;
}

export interface FolderStructure {
  name: string;
  path: string;
  files: FileWithPath[];
  children: FolderStructure[];
}

interface UploadingFile {
  file: FileWithPath;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const getFileIcon = (file: FileWithPath) => {
  const type = file.type.split('/')[0];
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4 text-blue-600" />;
    case 'video':
      return <Video className="w-4 h-4 text-purple-600" />;
    case 'audio':
      return <Music className="w-4 h-4 text-green-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const parseFolderStructure = (files: FileWithPath[]): FolderStructure => {
  const root: FolderStructure = {
    name: 'root',
    path: '',
    files: [],
    children: []
  };

  const folderMap = new Map<string, FolderStructure>();
  folderMap.set('', root);

  files.forEach(file => {
    const pathParts = file.webkitRelativePath.split('/');
    const folderPath = pathParts.slice(0, -1).join('/');

    // Create folders if they don't exist
    let currentPath = '';
    pathParts.slice(0, -1).forEach((folderName) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      if (!folderMap.has(currentPath)) {
        const newFolder: FolderStructure = {
          name: folderName,
          path: currentPath,
          files: [],
          children: []
        };
        
        folderMap.set(currentPath, newFolder);
        const parentFolder = folderMap.get(parentPath)!;
        parentFolder.children.push(newFolder);
      }
    });

    // Add file to its folder
    const folder = folderMap.get(folderPath) || root;
    folder.files.push(file);
  });

  return root;
};

export const FolderUpload: React.FC<FolderUploadProps> = ({
  projectId,
  parentFolderId,
  onUploadComplete,
  onUploadProgress,
  onError,
  allowedFileTypes,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  maxFiles = 1000,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: FileWithPath[]): { valid: FileWithPath[], invalid: string[] } => {
    const valid: FileWithPath[] = [];
    const invalid: string[] = [];

    if (files.length > maxFiles) {
      invalid.push(`Too many files. Maximum allowed: ${maxFiles}`);
      return { valid: [], invalid };
    }

    files.forEach(file => {
      if (file.size > maxFileSize) {
        invalid.push(`${file.name}: File too large. Maximum size: ${formatFileSize(maxFileSize)}`);
        return;
      }

      if (allowedFileTypes && allowedFileTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        const isAllowed = allowedFileTypes.some(allowed => 
          file.type.includes(allowed) || 
          fileExtension === allowed.replace('.', '')
        );

        if (!isAllowed) {
          invalid.push(`${file.name}: File type not allowed`);
          return;
        }
      }

      valid.push(file);
    });

    return { valid, invalid };
  }, [maxFileSize, maxFiles, allowedFileTypes]);

  const handleFileSelection = useCallback((files: FileList) => {
    const fileArray = Array.from(files) as FileWithPath[];
    
    // Check if files have webkitRelativePath (folder upload)
    const hasRelativePath = fileArray.some(file => file.webkitRelativePath);
    
    if (hasRelativePath) {
      // This is a folder upload
      const { valid, invalid } = validateFiles(fileArray);
      
      if (invalid.length > 0) {
        setErrors(invalid);
        if (onError) {
          onError(invalid.join(', '));
        }
        return;
      }

      setSelectedFiles(valid);
      setFolderStructure(parseFolderStructure(valid));
      setShowPreview(true);
      setErrors([]);
    } else {
      // Individual file upload - add webkitRelativePath
      const filesWithPath = fileArray.map(file => {
        (file as FileWithPath).webkitRelativePath = file.name;
        return file as FileWithPath;
      });
      
      const { valid, invalid } = validateFiles(filesWithPath);
      
      if (invalid.length > 0) {
        setErrors(invalid);
        if (onError) {
          onError(invalid.join(', '));
        }
        return;
      }

      setSelectedFiles(valid);
      setFolderStructure(parseFolderStructure(valid));
      setShowPreview(true);
      setErrors([]);
    }
  }, [validateFiles, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const { files } = e.dataTransfer;
    if (files.length > 0) {
      handleFileSelection(files);
    }
  }, [handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFolderSelect = useCallback(() => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const startUpload = useCallback(async () => {
    if (!selectedFiles.length || isUploading) return;

    setIsUploading(true);
    setErrors([]);
    
    const uploadingFilesList: UploadingFile[] = selectedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));
    
    setUploadingFiles(uploadingFilesList);
    
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    
    // Initialize progress and notify parent
    const initialProgress: UploadProgress = {
      totalFiles: selectedFiles.length,
      uploadedFiles: 0,
      percentage: 0,
      bytesUploaded: 0,
      totalBytes
    };
    setUploadProgress(initialProgress);
    if (onUploadProgress) {
      onUploadProgress(initialProgress);
    }
    
    try {
      // Create FormData with folder structure
      const formData = new FormData();
      
      // Add files with their relative paths
      selectedFiles.forEach(file => {
        formData.append('files', file, file.webkitRelativePath || file.name);
      });
      
      // Add metadata
      formData.append('projectId', projectId);
      if (parentFolderId) {
        formData.append('parentFolderId', parentFolderId);
      }
      formData.append('folderStructure', JSON.stringify(folderStructure));
      formData.append('allowDuplicates', 'false');

      // Upload using the folder upload endpoint
      const response = await fetch('/api/files/upload-folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update progress to completed
      const completedProgress: UploadProgress = {
        totalFiles: selectedFiles.length,
        uploadedFiles: selectedFiles.length,
        percentage: 100,
        bytesUploaded: totalBytes,
        totalBytes
      };
      setUploadProgress(completedProgress);
      if (onUploadProgress) {
        onUploadProgress(completedProgress);
      }
      
      // Mark all files as completed
      setUploadingFiles(prev => prev.map(file => ({
        ...file,
        status: 'completed',
        progress: 100
      })));

      if (onUploadComplete) {
        onUploadComplete(result.data.files);
      }

      // Clear selection after successful upload
      setTimeout(() => {
        setSelectedFiles([]);
        setFolderStructure(null);
        setShowPreview(false);
        setUploadingFiles([]);
        setUploadProgress(null);
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors([errorMessage]);
      
      if (onError) {
        onError(errorMessage);
      }
      
      // Mark failed files
      setUploadingFiles(prev => prev.map(file => ({
        ...file,
        status: 'error',
        error: errorMessage
      })));
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, isUploading, projectId, parentFolderId, folderStructure, onUploadComplete, onUploadProgress, onError]);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
    setFolderStructure(null);
    setShowPreview(false);
    setUploadingFiles([]);
    setUploadProgress(null);
    setErrors([]);
  }, []);

  const renderFolderTree = (folder: FolderStructure, level: number = 0): React.ReactNode => {
    if (!folder) return null;

    return (
      <div key={folder.path} className={`${level > 0 ? 'ml-4' : ''}`}>
        {folder.name !== 'root' && (
          <div className="flex items-center py-1">
            <FolderOpen className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="font-medium text-gray-700">{folder.name}</span>
            <span className="text-sm text-gray-500 ml-2">({folder.files.length + folder.children.reduce((sum, child) => sum + child.files.length, 0)} files)</span>
          </div>
        )}
        
        {folder.files.map((file, index) => {
          const uploadingFile = uploadingFiles.find(uf => uf.file === file);
          return (
            <div key={`${folder.path}-file-${index}`} className={`flex items-center py-1 ${level > 0 || folder.name !== 'root' ? 'ml-6' : 'ml-2'}`}>
              {getFileIcon(file)}
              <span className="text-sm text-gray-600 ml-2 flex-1">{file.name}</span>
              <span className="text-xs text-gray-400 ml-2">{formatFileSize(file.size)}</span>
              {uploadingFile && (
                <div className="ml-2">
                  {uploadingFile.status === 'completed' && <Check className="w-4 h-4 text-green-600" />}
                  {uploadingFile.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {uploadingFile.status === 'uploading' && <Loader className="w-4 h-4 text-blue-600 animate-spin" />}
                </div>
              )}
            </div>
          );
        })}
        
        {folder.children.map(child => renderFolderTree(child, level + 1))}
      </div>
    );
  };

  const totalFiles = selectedFiles.length;
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className={`folder-upload ${className}`}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
      />
      
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
      />

      {/* Upload Area */}
      {!showPreview && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drag and drop folders or files here
              </h3>
              <p className="text-gray-600 mb-4">
                Upload entire folders with their structure preserved, or select individual files
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleFolderSelect}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={isUploading}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Select Folder
                </button>
                
                <button
                  type="button"
                  onClick={handleFileSelect}
                  className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isUploading}
                >
                  <File className="w-4 h-4 mr-2" />
                  Select Files
                </button>
              </div>
            </div>
            
            {maxFiles && (
              <div className="text-sm text-gray-500">
                Maximum {maxFiles} files, {formatFileSize(maxFileSize)} per file
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Preview */}
      {showPreview && folderStructure && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Ready to Upload
              </h3>
              <p className="text-sm text-gray-600">
                {totalFiles} files ({formatFileSize(totalSize)})
              </p>
            </div>
            
            <button
              onClick={clearSelection}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          {uploadProgress && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Uploading {uploadProgress.currentFile || '...'}</span>
                <span>{uploadProgress.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{uploadProgress.uploadedFiles} of {uploadProgress.totalFiles} files</span>
                <span>{formatFileSize(uploadProgress.bytesUploaded)} of {formatFileSize(uploadProgress.totalBytes)}</span>
              </div>
            </div>
          )}

          {/* Folder Tree */}
          <div className="max-h-64 overflow-y-auto mb-4 border border-gray-100 rounded p-3">
            {renderFolderTree(folderStructure)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={startUpload}
                disabled={isUploading || totalFiles === 0}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </button>
              
              {!isUploading && (
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 mb-1">Upload Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderUpload;
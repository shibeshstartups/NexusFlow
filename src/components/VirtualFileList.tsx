import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { FileIcon, MoreHorizontal, Download, Share2, Trash2, Eye } from 'lucide-react';
import { File } from '../lib/api';

interface VirtualFileListProps {
  files: File[];
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void>;
  onFileSelect?: (file: File) => void;
  onFileAction?: (action: string, file: File) => void;
  selectedFiles?: Set<string>;
  viewMode?: 'list' | 'grid';
  searchTerm?: string;
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
}

interface FileItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    files: File[];
    onFileSelect?: (file: File) => void;
    onFileAction?: (action: string, file: File) => void;
    selectedFiles?: Set<string>;
    viewMode: 'list' | 'grid';
  };
}

// Memoized file item component for optimal performance
const FileItem = React.memo<FileItemProps>(({ index, style, data }) => {
  const { files, onFileSelect, onFileAction, selectedFiles, viewMode } = data;
  const file = files[index];
  
  if (!file) {
    // Loading placeholder
    return (
      <div style={style} className="flex items-center p-3 border-b border-gray-100">
        <div className="animate-pulse flex space-x-4 w-full">
          <div className="rounded bg-gray-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const isSelected = selectedFiles?.has(file._id);
  const fileSize = formatBytes(file.size);
  const fileDate = new Date(file.createdAt).toLocaleDateString();

  const handleFileClick = useCallback(() => {
    onFileSelect?.(file);
  }, [file, onFileSelect]);

  const handleActionClick = useCallback((action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onFileAction?.(action, file);
  }, [file, onFileAction]);

  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return file.storage.cdnUrl ? (
          <img
            src={file.storage.cdnUrl}
            alt={file.displayName}
            className="w-10 h-10 object-cover rounded"
            loading="lazy"
          />
        ) : (
          <FileIcon className="w-10 h-10 text-blue-500" />
        );
      case 'video':
        return <FileIcon className="w-10 h-10 text-purple-500" />;
      case 'document':
        return <FileIcon className="w-10 h-10 text-green-500" />;
      case 'archive':
        return <FileIcon className="w-10 h-10 text-orange-500" />;
      default:
        return <FileIcon className="w-10 h-10 text-gray-500" />;
    }
  };

  if (viewMode === 'grid') {
    return (
      <div style={style} className="p-2">
        <div
          className={`
            bg-white rounded-lg border p-4 cursor-pointer transition-all duration-200
            hover:shadow-md hover:border-blue-300
            ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          `}
          onClick={handleFileClick}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 flex items-center justify-center">
              {getFileIcon()}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 truncate w-full" title={file.displayName}>
                {file.displayName}
              </p>
              <p className="text-xs text-gray-500">{fileSize}</p>
            </div>
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleActionClick('view', e)}
                className="p-1 rounded hover:bg-gray-100"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleActionClick('download', e)}
                className="p-1 rounded hover:bg-gray-100"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleActionClick('share', e)}
                className="p-1 rounded hover:bg-gray-100"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={style}>
      <div
        className={`
          flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer
          hover:bg-gray-50 transition-colors duration-150
          ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
        `}
        onClick={handleFileClick}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900 truncate" title={file.displayName}>
                {file.displayName}
              </p>
              {file.analytics?.viewCount > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {file.analytics.viewCount} views
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{fileSize}</span>
              <span>{fileDate}</span>
              <span className="capitalize">{file.type}</span>
              {file.project && (
                <span>Project: {file.project.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleActionClick('view', e)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="View file"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => handleActionClick('download', e)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => handleActionClick('share', e)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Share file"
            >
              <Share2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => handleActionClick('delete', e)}
              className="p-2 rounded-md hover:bg-red-100 transition-colors"
              title="Delete file"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
          
          <button
            onClick={(e) => handleActionClick('menu', e)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
});

FileItem.displayName = 'FileItem';

const VirtualFileList: React.FC<VirtualFileListProps> = ({
  files,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  onFileSelect,
  onFileAction,
  selectedFiles = new Set(),
  viewMode = 'list',
  searchTerm = '',
  sortBy = 'name',
  sortOrder = 'asc'
}) => {
  const [isScrolling, setIsScrolling] = useState(false);

  // Memoize filtered and sorted files
  const processedFiles = useMemo(() => {
    let result = [...files];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(file => 
        file.displayName.toLowerCase().includes(term) ||
        file.originalName.toLowerCase().includes(term) ||
        file.type.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [files, searchTerm, sortBy, sortOrder]);

  // Calculate total item count including loading items
  const itemCount = hasNextPage ? processedFiles.length + 1 : processedFiles.length;
  
  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !!processedFiles[index];
  }, [processedFiles]);

  // Item data for react-window
  const itemData = useMemo(() => ({
    files: processedFiles,
    onFileSelect,
    onFileAction,
    selectedFiles,
    viewMode
  }), [processedFiles, onFileSelect, onFileAction, selectedFiles, viewMode]);

  // Dynamic item height based on view mode
  const itemSize = viewMode === 'grid' ? 180 : 80;

  // Handle scroll events for performance optimization
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsScrolling(false), 150);
    return () => clearTimeout(timer);
  }, [isScrolling]);

  if (processedFiles.length === 0 && !isNextPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileIcon className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No files found</p>
        {searchTerm && (
          <p className="text-sm">Try adjusting your search terms</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={loadNextPage}
            threshold={5} // Load more items when 5 items away from the end
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                className="virtual-file-list"
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={itemSize}
                itemData={itemData}
                onItemsRendered={onItemsRendered}
                onScroll={handleScroll}
                overscanCount={10} // Render 10 extra items for smoother scrolling
                style={{
                  transition: isScrolling ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                {FileItem}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
    </div>
  );
};

// Utility function to format file sizes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default VirtualFileList;
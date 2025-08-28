import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  X, 
  Pause, 
  Play,
  Check, 
  AlertCircle,
  Loader,
  File,
  Folder,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

export interface ProgressItem {
  id: string;
  type: 'upload' | 'download';
  operation: 'file' | 'folder' | 'bulk';
  name: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number; // 0-100
  totalFiles?: number;
  processedFiles?: number;
  totalSize?: number;
  processedSize?: number;
  currentFile?: string;
  speed?: number; // bytes per second
  eta?: number; // seconds
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export interface ProgressTrackerProps {
  items: ProgressItem[];
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onClear?: (id: string) => void;
  maxVisible?: number;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '--';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const getStatusIcon = (item: ProgressItem) => {
  switch (item.status) {
    case 'pending':
      return <Loader className="w-4 h-4 text-gray-500" />;
    case 'active':
      return item.type === 'upload' 
        ? <ArrowUp className="w-4 h-4 text-blue-600 animate-pulse" />
        : <ArrowDown className="w-4 h-4 text-green-600 animate-pulse" />;
    case 'paused':
      return <Pause className="w-4 h-4 text-yellow-600" />;
    case 'completed':
      return <Check className="w-4 h-4 text-green-600" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-gray-500" />;
    default:
      return <Loader className="w-4 h-4 text-gray-500" />;
  }
};

const getOperationIcon = (item: ProgressItem) => {
  if (item.operation === 'folder') {
    return <Folder className="w-4 h-4 text-yellow-600" />;
  }
  return <File className="w-4 h-4 text-blue-600" />;
};

const getStatusColor = (status: ProgressItem['status']): string => {
  switch (status) {
    case 'pending':
      return 'border-l-gray-400';
    case 'active':
      return 'border-l-blue-500';
    case 'paused':
      return 'border-l-yellow-500';
    case 'completed':
      return 'border-l-green-500';
    case 'error':
      return 'border-l-red-500';
    case 'cancelled':
      return 'border-l-gray-400';
    default:
      return 'border-l-gray-400';
  }
};

const ProgressItem: React.FC<{
  item: ProgressItem;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onClear?: (id: string) => void;
}> = ({ item, onPause, onResume, onCancel, onRetry, onClear }) => {
  const [expanded, setExpanded] = useState(false);
  
  const canPause = item.status === 'active' && onPause;
  const canResume = item.status === 'paused' && onResume;
  const canCancel = ['pending', 'active', 'paused'].includes(item.status) && onCancel;
  const canRetry = item.status === 'error' && onRetry;
  const canClear = ['completed', 'error', 'cancelled'].includes(item.status) && onClear;
  
  const duration = item.endTime 
    ? (item.endTime.getTime() - item.startTime.getTime()) / 1000
    : (Date.now() - item.startTime.getTime()) / 1000;

  return (
    <div className={`bg-white border-l-4 ${getStatusColor(item.status)} rounded-r-lg shadow-sm mb-2 transition-all duration-200`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {getStatusIcon(item)}
            {getOperationIcon(item)}
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </h4>
                <span className="text-xs text-gray-500">
                  ({item.type === 'upload' ? 'Uploading' : 'Downloading'})
                </span>
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 capitalize">
                  {item.status}
                </span>
                
                {item.totalFiles && (
                  <span className="text-xs text-gray-500">
                    {item.processedFiles || 0} of {item.totalFiles} files
                  </span>
                )}
                
                {item.totalSize && (
                  <span className="text-xs text-gray-500">
                    {formatFileSize(item.processedSize || 0)} of {formatFileSize(item.totalSize)}
                  </span>
                )}
              </div>
              
              {item.currentFile && item.status === 'active' && (
                <div className="text-xs text-blue-600 mt-1 truncate">
                  {item.currentFile}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {item.progress.toFixed(1)}%
              </div>
              
              {item.speed && item.status === 'active' && (
                <div className="text-xs text-gray-500">
                  {formatSpeed(item.speed)}
                </div>
              )}
              
              {item.eta && item.status === 'active' && (
                <div className="text-xs text-gray-500">
                  ETA: {formatTime(item.eta)}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {canPause && (
                <button
                  onClick={() => onPause(item.id)}
                  className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              
              {canResume && (
                <button
                  onClick={() => onResume(item.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Resume"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              
              {canRetry && (
                <button
                  onClick={() => onRetry(item.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Retry"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              
              {canCancel && (
                <button
                  onClick={() => onCancel(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {canClear && (
                <button
                  onClick={() => onClear(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                <div className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                item.status === 'error' ? 'bg-red-500' :
                item.status === 'completed' ? 'bg-green-500' :
                item.status === 'paused' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
            />
          </div>
        </div>
        
        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Started</div>
                <div className="text-gray-900">{item.startTime.toLocaleTimeString()}</div>
              </div>
              
              {item.endTime && (
                <div>
                  <div className="text-gray-500 mb-1">Completed</div>
                  <div className="text-gray-900">{item.endTime.toLocaleTimeString()}</div>
                </div>
              )}
              
              <div>
                <div className="text-gray-500 mb-1">Duration</div>
                <div className="text-gray-900">{formatTime(duration)}</div>
              </div>
              
              {item.speed && (
                <div>
                  <div className="text-gray-500 mb-1">Speed</div>
                  <div className="text-gray-900">{formatSpeed(item.speed)}</div>
                </div>
              )}
              
              {item.operation === 'folder' && item.totalFiles && (
                <div>
                  <div className="text-gray-500 mb-1">Files</div>
                  <div className="text-gray-900">{item.processedFiles || 0} / {item.totalFiles}</div>
                </div>
              )}
              
              {item.totalSize && (
                <div>
                  <div className="text-gray-500 mb-1">Size</div>
                  <div className="text-gray-900">
                    {formatFileSize(item.processedSize || 0)} / {formatFileSize(item.totalSize)}
                  </div>
                </div>
              )}
            </div>
            
            {item.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                <div className="text-red-800 font-medium mb-1">Error</div>
                <div className="text-red-700">{item.error}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  items,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClear,
  maxVisible = 5,
  className = ''
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const activeItems = items.filter(item => 
    ['pending', 'active', 'paused'].includes(item.status)
  );
  
  const completedItems = items.filter(item => 
    ['completed', 'error', 'cancelled'].includes(item.status)
  );
  
  const visibleItems = showAll ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;
  
  const clearAllCompleted = useCallback(() => {
    completedItems.forEach(item => {
      if (onClear) {
        onClear(item.id);
      }
    });
  }, [completedItems, onClear]);
  
  if (items.length === 0) {
    return null;
  }
  
  return (
    <div className={`progress-tracker ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {activeItems.some(item => item.type === 'upload') ? (
                <Upload className="w-5 h-5 text-blue-600" />
              ) : (
                <Download className="w-5 h-5 text-green-600" />
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Transfer Progress
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {activeItems.length > 0 && (
                  <span>{activeItems.length} active</span>
                )}
                {completedItems.length > 0 && (
                  <span>{completedItems.length} completed</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {completedItems.length > 0 && onClear && (
              <button
                onClick={clearAllCompleted}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
            )}
            
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showAll ? 'Show Less' : `Show All (${items.length})`}
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {visibleItems.map(item => (
            <ProgressItem
              key={item.id}
              item={item}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRetry={onRetry}
              onClear={onClear}
            />
          ))}
        </div>
        
        {/* Overall Statistics */}
        {activeItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">Overall Progress</div>
                <div className="text-lg font-semibold text-gray-900">
                  {activeItems.length > 0 ? (
                    `${(activeItems.reduce((sum, item) => sum + item.progress, 0) / activeItems.length).toFixed(1)}%`
                  ) : '0%'}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Speed</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatSpeed(
                    activeItems
                      .filter(item => item.speed)
                      .reduce((sum, item) => sum + (item.speed || 0), 0)
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1">Active Operations</div>
                <div className="text-lg font-semibold text-gray-900">
                  {activeItems.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
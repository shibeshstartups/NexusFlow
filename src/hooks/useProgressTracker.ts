import { useState, useCallback, useRef, useEffect } from 'react';
import { ProgressItem } from '../components/ProgressTracker';

export interface UseProgressTrackerOptions {
  maxItems?: number;
  autoCleanup?: boolean;
  cleanupDelay?: number; // ms
}

export interface ProgressUpdate {
  id: string;
  progress?: number;
  status?: ProgressItem['status'];
  currentFile?: string;
  processedFiles?: number;
  processedSize?: number;
  speed?: number;
  eta?: number;
  error?: string;
}

const calculateSpeed = (bytesTransferred: number, timeElapsed: number): number => {
  if (timeElapsed <= 0) return 0;
  return bytesTransferred / (timeElapsed / 1000);
};

const calculateETA = (progress: number, speed: number, totalSize: number): number => {
  if (progress >= 100 || speed <= 0 || !totalSize) return 0;
  
  const remainingBytes = totalSize * ((100 - progress) / 100);
  return remainingBytes / speed;
};

export const useProgressTracker = (options: UseProgressTrackerOptions = {}) => {
  const {
    maxItems = 50,
    autoCleanup = true,
    cleanupDelay = 5000
  } = options;
  
  const [items, setItems] = useState<ProgressItem[]>([]);
  const speedTracking = useRef<Map<string, { startTime: number; startBytes: number }>>(new Map());
  const cleanupTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clear all timers on unmount
      cleanupTimers.current.forEach(timer => clearTimeout(timer));
      cleanupTimers.current.clear();
    };
  }, []);
  
  const addOperation = useCallback((operation: Omit<ProgressItem, 'startTime' | 'progress'>) => {
    const newItem: ProgressItem = {
      ...operation,
      progress: 0,
      startTime: new Date()
    };
    
    setItems(prev => {
      const updated = [newItem, ...prev];
      // Respect max items limit
      if (updated.length > maxItems) {
        const removed = updated.slice(maxItems);
        removed.forEach(item => {
          // Clear any existing timers for removed items
          const timer = cleanupTimers.current.get(item.id);
          if (timer) {
            clearTimeout(timer);
            cleanupTimers.current.delete(item.id);
          }
        });
        return updated.slice(0, maxItems);
      }
      return updated;
    });
    
    // Initialize speed tracking
    speedTracking.current.set(operation.id, {
      startTime: Date.now(),
      startBytes: 0
    });
    
    return operation.id;
  }, [maxItems]);
  
  const updateProgress = useCallback((update: ProgressUpdate) => {
    setItems(prev => {
      return prev.map(item => {
        if (item.id !== update.id) return item;
        
        const now = Date.now();
        const speedData = speedTracking.current.get(item.id);
        let calculatedSpeed = item.speed;
        let calculatedETA = item.eta;
        
        // Calculate speed if we have processed size
        if (update.processedSize !== undefined && speedData) {
          const timeElapsed = now - speedData.startTime;
          const bytesTransferred = update.processedSize - speedData.startBytes;
          
          if (timeElapsed > 1000) { // Calculate after at least 1 second
            calculatedSpeed = calculateSpeed(bytesTransferred, timeElapsed);
            
            // Calculate ETA
            if (item.totalSize && update.progress !== undefined) {
              calculatedETA = calculateETA(update.progress, calculatedSpeed, item.totalSize);
            }
            
            // Update speed tracking reference point every 5 seconds
            if (timeElapsed > 5000) {
              speedTracking.current.set(item.id, {
                startTime: now,
                startBytes: update.processedSize
              });
            }
          }
        }
        
        const updatedItem = {
          ...item,
          ...update,
          speed: calculatedSpeed,
          eta: calculatedETA
        };
        
        // Set end time when completed, error, or cancelled
        if (['completed', 'error', 'cancelled'].includes(update.status || item.status) && !item.endTime) {
          updatedItem.endTime = new Date();
          
          // Clean up speed tracking
          speedTracking.current.delete(item.id);
          
          // Schedule auto cleanup
          if (autoCleanup) {
            const timer = setTimeout(() => {
              removeOperation(item.id);
            }, cleanupDelay);
            cleanupTimers.current.set(item.id, timer);
          }
        }
        
        return updatedItem;
      });
    });
  }, [autoCleanup, cleanupDelay]);
  
  const removeOperation = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    speedTracking.current.delete(id);
    
    const timer = cleanupTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      cleanupTimers.current.delete(id);
    }
  }, []);
  
  const pauseOperation = useCallback((id: string) => {
    updateProgress({ id, status: 'paused' });
  }, [updateProgress]);
  
  const resumeOperation = useCallback((id: string) => {
    updateProgress({ id, status: 'active' });
    
    // Reset speed tracking when resuming
    const item = items.find(i => i.id === id);
    if (item) {
      speedTracking.current.set(id, {
        startTime: Date.now(),
        startBytes: item.processedSize || 0
      });
    }
  }, [updateProgress, items]);
  
  const cancelOperation = useCallback((id: string) => {
    updateProgress({ id, status: 'cancelled' });
  }, [updateProgress]);
  
  const retryOperation = useCallback((id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      // Reset the operation
      const resetItem = {
        ...item,
        status: 'pending' as const,
        progress: 0,
        processedFiles: 0,
        processedSize: 0,
        currentFile: undefined,
        speed: undefined,
        eta: undefined,
        error: undefined,
        endTime: undefined,
        startTime: new Date()
      };
      
      // Reset speed tracking
      speedTracking.current.set(id, {
        startTime: Date.now(),
        startBytes: 0
      });
      
      // Clear any cleanup timer
      const timer = cleanupTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        cleanupTimers.current.delete(id);
      }
      
      return resetItem;
    }));
  }, []);
  
  const clearCompleted = useCallback(() => {
    const completedIds: string[] = [];
    
    setItems(prev => {
      const remaining = prev.filter(item => {
        const isCompleted = ['completed', 'error', 'cancelled'].includes(item.status);
        if (isCompleted) {
          completedIds.push(item.id);
        }
        return !isCompleted;
      });
      return remaining;
    });
    
    // Clean up associated data
    completedIds.forEach(id => {
      speedTracking.current.delete(id);
      const timer = cleanupTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        cleanupTimers.current.delete(id);
      }
    });
  }, []);
  
  const clearAll = useCallback(() => {
    setItems([]);
    speedTracking.current.clear();
    cleanupTimers.current.forEach(timer => clearTimeout(timer));
    cleanupTimers.current.clear();
  }, []);
  
  const getOperation = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);
  
  const getActiveOperations = useCallback(() => {
    return items.filter(item => ['pending', 'active', 'paused'].includes(item.status));
  }, [items]);
  
  const getCompletedOperations = useCallback(() => {
    return items.filter(item => ['completed', 'error', 'cancelled'].includes(item.status));
  }, [items]);
  
  // Helper functions for common operations
  const startUpload = useCallback((params: {
    name: string;
    operation: 'file' | 'folder' | 'bulk';
    totalFiles?: number;
    totalSize?: number;
  }) => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return addOperation({
      id,
      type: 'upload',
      operation: params.operation,
      name: params.name,
      status: 'pending',
      totalFiles: params.totalFiles,
      totalSize: params.totalSize
    });
  }, [addOperation]);
  
  const startDownload = useCallback((params: {
    name: string;
    operation: 'file' | 'folder' | 'bulk';
    totalFiles?: number;
    totalSize?: number;
  }) => {
    const id = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return addOperation({
      id,
      type: 'download',
      operation: params.operation,
      name: params.name,
      status: 'pending',
      totalFiles: params.totalFiles,
      totalSize: params.totalSize
    });
  }, [addOperation]);
  
  return {
    // State
    items,
    
    // Core operations
    addOperation,
    updateProgress,
    removeOperation,
    
    // Control operations
    pauseOperation,
    resumeOperation,
    cancelOperation,
    retryOperation,
    
    // Cleanup operations
    clearCompleted,
    clearAll,
    
    // Query operations
    getOperation,
    getActiveOperations,
    getCompletedOperations,
    
    // Helper functions
    startUpload,
    startDownload
  };
};
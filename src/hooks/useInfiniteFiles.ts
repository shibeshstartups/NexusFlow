import { useInfiniteQuery } from '@tanstack/react-query';
import { fileApi, File } from '../lib/api';
import { useMemo } from 'react';

interface UseInfiniteFilesOptions {
  projectId?: string;
  folderId?: string;
  type?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enabled?: boolean;
}

interface FilePageResponse {
  files: File[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const useInfiniteFiles = (options: UseInfiniteFilesOptions = {}) => {
  const {
    projectId,
    folderId,
    type,
    searchTerm,
    sortBy = 'name',
    sortOrder = 'asc',
    pageSize = 50,
    enabled = true
  } = options;

  const queryKey = ['files', 'infinite', { 
    projectId, 
    folderId, 
    type, 
    searchTerm, 
    sortBy, 
    sortOrder,
    pageSize 
  }];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const params = {
        page: pageParam,
        limit: pageSize,
        ...(projectId && { project: projectId }),
        ...(folderId && { folder: folderId }),
        ...(type && { type }),
        ...(searchTerm && { search: searchTerm }),
        sort: `${sortOrder === 'desc' ? '-' : ''}${sortBy}`
      };

      const response = await fileApi.getFiles(params);
      
      // Transform response to expected format
      return {
        files: response.data.files,
        pagination: {
          page: pageParam,
          limit: pageSize,
          total: response.data.files.length, // Use actual file count
          pages: Math.ceil(response.data.files.length / pageSize),
          hasNext: response.data.files.length === pageSize,
          hasPrev: pageParam > 1
        }
      } as FilePageResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: FilePageResponse) => {
      return lastPage.pagination.hasNext 
        ? lastPage.pagination.page + 1 
        : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Flatten all pages into a single array for virtual scrolling
  const allFiles = useMemo(() => {
    return query.data?.pages.flatMap((page: FilePageResponse) => page.files) ?? [];
  }, [query.data?.pages]);

  // Calculate total count across all pages
  const totalCount = useMemo(() => {
    const firstPage = query.data?.pages[0] as FilePageResponse | undefined;
    return firstPage?.pagination.total ?? 0;
  }, [query.data?.pages]);

  // Enhanced loading states for better UX
  const isLoadingInitial = query.isLoading && !query.data;
  const isLoadingMore = query.isFetchingNextPage;
  const hasNextPage = query.hasNextPage;

  return {
    // Data
    files: allFiles,
    totalCount,
    
    // Loading states
    isLoading: query.isLoading,
    isLoadingInitial,
    isLoadingMore,
    isFetching: query.isFetching,
    
    // Pagination
    hasNextPage,
    loadNextPage: query.fetchNextPage,
    
    // Error handling
    error: query.error,
    isError: query.isError,
    
    // Refetch capabilities
    refetch: query.refetch,
    
    // Query status
    status: query.status,
    
    // For debugging
    queryKey
  };
};

// Hook for files with additional filtering and caching optimizations
export const useOptimizedInfiniteFiles = (options: UseInfiniteFilesOptions = {}) => {
  const baseQuery = useInfiniteFiles(options);
  
  // Additional optimizations for large datasets
  const optimizedFiles = useMemo(() => {
    const files = baseQuery.files;
    
    // Pre-sort files for better virtual scrolling performance
    if (options.sortBy && files.length > 0) {
      return [...files].sort((a, b) => {
        let comparison = 0;
        
        switch (options.sortBy) {
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
            comparison = 0; // No sorting for unknown sort types
        }
        
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    return files;
  }, [baseQuery.files, options.sortBy, options.sortOrder]);

  return {
    ...baseQuery,
    files: optimizedFiles
  };
};

// Hook for file statistics and metadata
export const useFileStats = (files: File[]) => {
  return useMemo(() => {
    const stats = {
      total: files.length,
      totalSize: 0,
      byType: {} as Record<string, number>,
      bySizeRange: {
        small: 0,    // < 1MB
        medium: 0,   // 1MB - 100MB
        large: 0,    // 100MB - 1GB
        huge: 0      // > 1GB
      },
      recentFiles: 0, // Files from last 7 days
      mostViewed: files
        .filter(f => f.analytics?.viewCount > 0)
        .sort((a, b) => (b.analytics?.viewCount || 0) - (a.analytics?.viewCount || 0))
        .slice(0, 10)
    };

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      // Total size
      stats.totalSize += file.size;

      // By type
      stats.byType[file.type] = (stats.byType[file.type] || 0) + 1;

      // By size range
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB < 1) {
        stats.bySizeRange.small++;
      } else if (sizeMB < 100) {
        stats.bySizeRange.medium++;
      } else if (sizeMB < 1024) {
        stats.bySizeRange.large++;
      } else {
        stats.bySizeRange.huge++;
      }

      // Recent files
      if (new Date(file.createdAt).getTime() > oneWeekAgo) {
        stats.recentFiles++;
      }
    });

    return stats;
  }, [files]);
};

export default useInfiniteFiles;
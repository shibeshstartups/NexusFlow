import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fileApi, projectApi, cdnApi, File, Project } from '../lib/api';

// Query Keys for consistent caching
export const QUERY_KEYS = {
  files: ['files'] as const,
  filesByProject: (projectId: string) => ['files', 'project', projectId] as const,
  file: (fileId: string) => ['files', fileId] as const,
  responsiveImages: (fileId: string) => ['files', fileId, 'responsive'] as const,
  projects: ['projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  storageStats: ['storage', 'stats'] as const,
  cdnAnalytics: (since?: string) => ['cdn', 'analytics', since] as const,
};

// File Hooks
export const useFiles = (filters: Record<string, any> = {}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.files, filters],
    queryFn: () => fileApi.getFiles(filters),
    select: (data) => data.data.files,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInfiniteFiles = (filters: Record<string, any> = {}) => {
  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.files, 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      fileApi.getFiles({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any, allPages) => {
      const totalPages = Math.ceil(lastPage.data.pagination?.total / 20);
      return allPages.length < totalPages ? allPages.length + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages.map((page: any) => page.data.files),
      pageParams: data.pageParams,
    }),
    staleTime: 2 * 60 * 1000,
  });
};

export const useFile = (fileId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.file(fileId),
    queryFn: () => fileApi.getFile(fileId),
    select: (data) => data.data.file,
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useResponsiveImages = (fileId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.responsiveImages(fileId),
    queryFn: () => fileApi.getResponsiveImages(fileId),
    enabled: !!fileId,
    staleTime: 30 * 60 * 1000, // 30 minutes - responsive URLs don't change often
  });
};

export const useStorageStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.storageStats,
    queryFn: () => fileApi.getStorageStats(),
    select: (data) => data.data,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

// Project Hooks
export const useProjects = (filters: Record<string, any> = {}) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.projects, filters],
    queryFn: () => projectApi.getProjects(filters),
    select: (data) => data.data.projects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.project(projectId),
    queryFn: () => projectApi.getProject(projectId),
    select: (data) => data.data.project,
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
};

// CDN Hooks
export const useCdnAnalytics = (since?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.cdnAnalytics(since),
    queryFn: () => cdnApi.getCdnAnalytics(since),
    select: (data) => data.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation Hooks
export const useUploadFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ files, projectId, isPublic }: { 
      files: FileList; 
      projectId: string; 
      isPublic?: boolean;
    }) => fileApi.uploadFiles(files, projectId, isPublic),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.filesByProject(variables.projectId) 
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats });
      
      // Update project metrics if available
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.project(variables.projectId) 
      });
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => fileApi.deleteFile(fileId),
    onSuccess: (_, fileId) => {
      // Remove the specific file from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.file(fileId) });
      
      // Invalidate file lists and storage stats
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats });
    },
  });
};

export const useShareFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, options }: { fileId: string; options: any }) =>
      fileApi.shareFile(fileId, options),
    onSuccess: (_, variables) => {
      // Update the specific file in cache
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.file(variables.fileId) 
      });
    },
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Project> }) =>
      projectApi.updateProject(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.project(variables.projectId) 
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectApi.deleteProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.project(projectId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats });
    },
  });
};

export const usePurgeCdnCache = () => {
  return useMutation({
    mutationFn: (fileIds: string[]) => cdnApi.purgeCdnCache(fileIds),
    onSuccess: () => {
      console.log('CDN cache purged successfully');
    },
  });
};

export const useSetupCdnOptimization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cdnApi.setupCdnOptimization(),
    onSuccess: () => {
      // Invalidate CDN analytics to show updated optimization
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.cdnAnalytics() 
      });
    },
  });
};

// Utility hook for optimistic updates
export const useOptimisticFileUpdate = () => {
  const queryClient = useQueryClient();

  const updateFileOptimistically = (fileId: string, updates: Partial<File>) => {
    queryClient.setQueryData(
      QUERY_KEYS.file(fileId),
      (oldData: any) => oldData ? { ...oldData, ...updates } : oldData
    );
  };

  return { updateFileOptimistically };
};
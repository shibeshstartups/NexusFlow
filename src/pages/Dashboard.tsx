import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  File, 
  Folder, 
  Share2, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Database,
  Zap,
  User,
  Settings,
  LogOut,
  Bell,
  HardDrive,
  Activity,
  TrendingUp,
  Users,
  Camera,
  Video,
  Grid,
  List,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fileApi, projectApi } from '../lib/api';

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  projectsCount: number;
  totalFiles: number;
  lastActivity: Date;
  status: 'active' | 'inactive';
}

interface DashboardProject {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  createdDate: Date;
  photosCount: number;
  videosCount: number;
  totalSize: number;
  status: 'active' | 'completed' | 'review';
  isShared: boolean;
}

interface MediaFile {
  id: string;
  name: string;
  type: 'photo' | 'video';
  size: number;
  uploadDate: Date;
  projectId: string;
  clientId: string;
  isShared: boolean;
  downloads: number;
}

type ViewMode = 'clients' | 'client-projects' | 'project-files';
type DashboardTab = 'clients' | 'team' | 'storage' | 'analytics';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('clients');
  const [viewMode, setViewMode] = useState<ViewMode>('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileViewMode, setFileViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real data from API
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load projects (which contain client info)
      const projectsResponse = await projectApi.getProjects();
      if (projectsResponse.success && projectsResponse.data) {
        const apiProjects = projectsResponse.data.projects || [];
        const transformedProjects = transformAPIProjectsToDashboardProjects(apiProjects);
        setProjects(transformedProjects);
        
        // Extract unique clients from projects
        const uniqueClients = extractClientsFromProjects(apiProjects);
        setClients(uniqueClients);
      }
      
      // Load files
      const filesResponse = await fileApi.getFiles();
      if (filesResponse.success && filesResponse.data) {
        setMediaFiles(transformFilesToMediaFiles(filesResponse.data.files || []));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const transformAPIProjectsToDashboardProjects = (apiProjects: any[]): DashboardProject[] => {
    return apiProjects.map(project => ({
      id: project._id,
      name: project.name,
      clientId: typeof project.owner === 'string' ? project.owner : project.owner?._id || '',
      description: project.description || '',
      createdDate: new Date(project.createdAt || Date.now()),
      photosCount: project.metrics?.totalFiles || 0, // Will be updated with actual file counts
      videosCount: 0, // Will be calculated from files
      totalSize: project.metrics?.totalSize || 0,
      status: project.status === 'active' ? 'active' : project.status === 'completed' ? 'completed' : 'review',
      isShared: false // TODO: Implement sharing logic
    }));
  };

  const extractClientsFromProjects = (projects: any[]): Client[] => {
    const clientMap = new Map<string, Client>();
    
    projects.forEach(project => {
      if (project.owner && !clientMap.has(project.owner._id || project.owner)) {
        const ownerId = typeof project.owner === 'string' ? project.owner : project.owner._id;
        const ownerName = typeof project.owner === 'string' ? 'User' : project.owner.name || project.owner.email;
        const ownerEmail = typeof project.owner === 'string' ? '' : project.owner.email;
        
        clientMap.set(ownerId, {
          id: ownerId,
          name: ownerName,
          email: ownerEmail,
          company: '',
          projectsCount: projects.filter(p => 
            (typeof p.owner === 'string' ? p.owner : p.owner._id) === ownerId
          ).length,
          totalFiles: 0, // Will be calculated from files
          lastActivity: new Date(project.createdAt || Date.now()),
          status: 'active'
        });
      }
    });
    
    return Array.from(clientMap.values());
  };

  const transformFilesToMediaFiles = (files: any[]): MediaFile[] => {
    return files.map(file => ({
      id: file._id,
      name: file.originalName || file.displayName,
      type: file.mimeType?.startsWith('image/') ? 'photo' : 
            file.mimeType?.startsWith('video/') ? 'video' : 'photo',
      size: file.size || 0,
      uploadDate: new Date(file.createdAt || Date.now()),
      projectId: typeof file.project === 'string' ? file.project : file.project?._id || '',
      clientId: typeof file.project?.owner === 'string' ? file.project.owner : file.project?.owner?._id || '',
      isShared: false, // TODO: Implement sharing logic
      downloads: file.analytics?.downloadCount || 0
    }));
  };

  const handleFileUpload = (files: FileList) => {
    console.log('Files to upload:', files);
    // Implementation for file upload
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div 
            key={client.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedClient(client);
              setViewMode('client-projects');
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {client.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">{client.name}</h3>
                <p className="text-sm text-gray-600">{client.email}</p>
              </div>
            </div>
            
            {client.company && (
              <p className="text-sm text-gray-600 mb-3">{client.company}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Projects</span>
                <p className="font-semibold">{client.projectsCount}</p>
              </div>
              <div>
                <span className="text-gray-500">Files</span>
                <p className="font-semibold">{client.totalFiles}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Last active</span>
                <span className="text-xs text-gray-600">
                  {client.lastActivity.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => setViewMode('clients')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-2 flex items-center"
          >
            ← Back to Clients
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedClient?.name} - Projects
          </h2>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => p.clientId === selectedClient?.id).map((project) => (
          <div 
            key={project.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedProject(project);
              setViewMode('project-files');
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' ? 'bg-green-100 text-green-800' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {project.status}
              </span>
            </div>
            
            {project.description && (
              <p className="text-sm text-gray-600 mb-4">{project.description}</p>
            )}
            
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-500">Photos</span>
                <p className="font-semibold">{project.photosCount}</p>
              </div>
              <div>
                <span className="text-gray-500">Videos</span>
                <p className="font-semibold">{project.videosCount}</p>
              </div>
              <div>
                <span className="text-gray-500">Size</span>
                <p className="font-semibold">{formatFileSize(project.totalSize)}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Created {project.createdDate.toLocaleDateString()}
              </span>
              {project.isShared && (
                <Share2 className="w-4 h-4 text-green-600" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => setViewMode('client-projects')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-2 flex items-center"
          >
            ← Back to Projects
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedProject?.name} - Files
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFileViewMode('grid')}
              className={`p-2 rounded ${fileViewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFileViewMode('list')}
              className={`p-2 rounded ${fileViewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-gray-600">
          Support for images, videos, and documents up to 5GB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
      </div>

      {/* Files Grid */}
      <div className={fileViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-2'}>
        {mediaFiles.filter(f => f.projectId === selectedProject?.id).map((file) => (
          <div 
            key={file.id}
            className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow ${
              fileViewMode === 'grid' ? 'p-4' : 'p-3 flex items-center space-x-4'
            }`}
          >
            <div className={`${fileViewMode === 'grid' ? 'mb-4' : ''}`}>
              {file.type === 'photo' ? (
                <Camera className={`${fileViewMode === 'grid' ? 'w-8 h-8' : 'w-6 h-6'} text-blue-600`} />
              ) : (
                <Video className={`${fileViewMode === 'grid' ? 'w-8 h-8' : 'w-6 h-6'} text-purple-600`} />
              )}
            </div>
            
            <div className={fileViewMode === 'grid' ? '' : 'flex-1'}>
              <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
              <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
              <p className="text-xs text-gray-500">{file.downloads} downloads</p>
            </div>
            
            <div className={`${fileViewMode === 'grid' ? 'mt-4 pt-4 border-t border-gray-200' : ''} flex items-center space-x-2`}>
              <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">NexusFlow Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                U
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search clients, projects, or files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Data</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button 
              onClick={loadDashboardData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content based on view mode */}
        {!isLoading && !error && (
          <>
            {viewMode === 'clients' && renderClients()}
            {viewMode === 'client-projects' && renderProjects()}
            {viewMode === 'project-files' && renderFiles()}
          </>
        )}
      </main>
    </div>
  );
}
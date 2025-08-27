<<<<<<< HEAD
import { useState } from 'react';
import { 
  Upload, 
=======
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  File, 
  Folder, 
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  Share2, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
<<<<<<< HEAD
  Zap,
  User,
  Bell,
  HardDrive,
  Activity,
=======
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
  Eye,
  Copy,
  ExternalLink,
  Calendar,
  BarChart3,
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  Users,
  Camera,
  Video,
  FolderOpen,
  Grid,
<<<<<<< HEAD
  List
=======
  List,
  ArrowLeft,
  Edit3,
  Mail,
  Phone,
  Building,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Crown,
  Briefcase,
  PieChart,
  TrendingDown,
  FileText,
  Globe
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
  projectsCount: number;
  totalFiles: number;
  lastActivity: Date;
  status: 'active' | 'inactive';
}

interface Project {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  createdDate: Date;
  photosCount: number;
  videosCount: number;
  totalSize: number;
  status: 'active' | 'completed' | 'review';
  shareLink?: string;
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
  thumbnailUrl?: string;
  isShared: boolean;
  shareLink?: string;
  downloads: number;
}

<<<<<<< HEAD
type ViewMode = 'clients' | 'client-projects' | 'project-files';

export default function Dashboard() {
=======
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  lastActivity: Date;
  joinedDate: Date;
  permissions: string[];
  avatar?: string;
}

type ViewMode = 'clients' | 'client-projects' | 'project-files';
type DashboardTab = 'clients' | 'team' | 'storage' | 'analytics';

export default function Dashboard() {
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('clients');
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  const [viewMode, setViewMode] = useState<ViewMode>('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileViewMode, setFileViewMode] = useState<'grid' | 'list'>('grid');
<<<<<<< HEAD
=======
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc

  // Mock data for creative professionals
  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@creativestudio.com',
      company: 'Creative Studio Inc.',
      projectsCount: 3,
      totalFiles: 45,
      lastActivity: new Date('2024-01-15'),
      status: 'active'
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'mike@techcorp.com',
      company: 'TechCorp Solutions',
      projectsCount: 2,
      totalFiles: 28,
      lastActivity: new Date('2024-01-12'),
      status: 'active'
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      email: 'emma@fashionbrand.com',
      company: 'Fashion Brand Co.',
      projectsCount: 1,
      totalFiles: 67,
      lastActivity: new Date('2024-01-10'),
      status: 'inactive'
    }
  ]);

  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Brand Photography Session',
      clientId: '1',
      description: 'Product photography for new collection launch',
      createdDate: new Date('2024-01-10'),
      photosCount: 35,
      videosCount: 5,
      totalSize: 2400000000, // 2.4 GB
      status: 'active',
      isShared: true,
      shareLink: 'https://nexusflow.com/p/brand-photo-abc123'
    },
    {
      id: '2',
      name: 'Corporate Headshots',
      clientId: '1',
      description: 'Executive team headshots for website',
      createdDate: new Date('2024-01-05'),
      photosCount: 15,
      videosCount: 0,
      totalSize: 800000000, // 800 MB
      status: 'completed',
      isShared: true,
      shareLink: 'https://nexusflow.com/p/headshots-def456'
    },
    {
      id: '3',
      name: 'Product Launch Video',
      clientId: '2',
      description: 'Marketing video for new product launch',
      createdDate: new Date('2024-01-08'),
      photosCount: 10,
      videosCount: 8,
      totalSize: 5200000000, // 5.2 GB
      status: 'review',
      isShared: false
    }
  ]);

  const [mediaFiles] = useState<MediaFile[]>([
    {
      id: '1',
      name: 'hero-shot-001.jpg',
      type: 'photo',
      size: 15000000, // 15 MB
      uploadDate: new Date('2024-01-15'),
      projectId: '1',
      clientId: '1',
      isShared: true,
      shareLink: 'https://nexusflow.com/f/hero-001',
      downloads: 12
    },
    {
      id: '2',
      name: 'product-showcase.mp4',
      type: 'video',
      size: 250000000, // 250 MB
      uploadDate: new Date('2024-01-14'),
      projectId: '1',
      clientId: '1',
      isShared: true,
      shareLink: 'https://nexusflow.com/f/showcase-vid',
      downloads: 8
    }
  ]);

<<<<<<< HEAD
=======
  // Mock team data
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Alex Thompson',
      email: 'alex@creativepro.com',
      role: 'admin',
      status: 'active',
      lastActivity: new Date('2024-01-15'),
      joinedDate: new Date('2023-06-01'),
      permissions: ['all'],
      avatar: undefined
    },
    {
      id: '2',
      name: 'Jessica Martinez',
      email: 'jessica@creativepro.com',
      role: 'manager',
      status: 'active',
      lastActivity: new Date('2024-01-14'),
      joinedDate: new Date('2023-08-15'),
      permissions: ['manage_projects', 'manage_clients', 'view_analytics']
    },
    {
      id: '3',
      name: 'David Kim',
      email: 'david@creativepro.com',
      role: 'editor',
      status: 'active',
      lastActivity: new Date('2024-01-13'),
      joinedDate: new Date('2023-10-01'),
      permissions: ['upload_files', 'edit_projects', 'share_files']
    },
    {
      id: '4',
      name: 'Lisa Wang',
      email: 'lisa@creativepro.com',
      role: 'viewer',
      status: 'pending',
      lastActivity: new Date('2024-01-10'),
      joinedDate: new Date('2024-01-10'),
      permissions: ['view_files', 'download_files']
    },
    {
      id: '5',
      name: 'Robert Brown',
      email: 'robert@creativepro.com',
      role: 'editor',
      status: 'inactive',
      lastActivity: new Date('2023-12-20'),
      joinedDate: new Date('2023-09-01'),
      permissions: ['upload_files', 'edit_projects']
    }
  ]);

>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  // Mock user data
  const userData = {
    name: 'Alex Thompson',
    email: 'alex@creativepro.com',
<<<<<<< HEAD
    plan: 'Creative Pro',
    storageUsed: 8500000000, // 8.5 GB
    storageQuota: 107374182400, // 100 GB
    transferUsed: 2100000000, // 2.1 GB
    transferQuota: 1073741824000, // 1 TB
    clientsCount: clients.length,
    activeProjects: projects.filter(p => p.status === 'active').length
=======
    plan: 'Business Pro',
    storageUsed: 8500000000, // 8.5 GB
    storageQuota: 5368709120000, // 5 TB
    transferUsed: 2100000000, // 2.1 GB
    transferQuota: 26843545600000, // 25 TB
    clientsCount: clients.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    teamMembersCount: teamMembers.length,
    activeTeamMembers: teamMembers.filter(m => m.status === 'active').length
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = (): number => {
    return (userData.storageUsed / userData.storageQuota) * 100;
  };

  const getTransferPercentage = (): number => {
    return (userData.transferUsed / userData.transferQuota) * 100;
  };

<<<<<<< HEAD
=======
  const handleTabChange = (tab: DashboardTab) => {
    setActiveDashboardTab(tab);
    // Reset client/project view when switching tabs
    if (tab !== 'clients') {
      setViewMode('clients');
      setSelectedClient(null);
      setSelectedProject(null);
    }
  };

>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setViewMode('client-projects');
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setViewMode('project-files');
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setSelectedProject(null);
    setViewMode('clients');
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setViewMode('client-projects');
  };

  const getClientProjects = (clientId: string) => {
    return projects.filter(p => p.clientId === clientId);
  };

  const getProjectFiles = (projectId: string) => {
    return mediaFiles.filter(f => f.projectId === projectId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
<<<<<<< HEAD
=======
      case 'pending': return 'bg-orange-100 text-orange-800';
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
      default: return 'bg-gray-100 text-gray-800';
    }
  };

<<<<<<< HEAD
=======
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'manager': return Briefcase;
      case 'editor': return Edit3;
      case 'viewer': return Eye;
      default: return User;
    }
  };

  const dashboardTabs = [
    { id: 'clients', label: 'Clients & Projects', icon: Users },
    { id: 'team', label: 'Team Management', icon: Building },
    { id: 'storage', label: 'Storage Analytics', icon: BarChart3 },
    { id: 'analytics', label: 'Business Analytics', icon: TrendingUp }
  ];

>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  NexusFlow
                </span>
              </a>
              <span className="text-gray-300">|</span>
<<<<<<< HEAD
              <span className="text-gray-700 font-medium">Creative Dashboard</span>
=======
              <span className="text-gray-700 font-medium">Business Dashboard</span>
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                  <div className="text-xs text-gray-500">{userData.plan}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{formatFileSize(userData.storageUsed)}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Storage Used</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {getStoragePercentage().toFixed(1)}% of {formatFileSize(userData.storageQuota)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{formatFileSize(userData.transferUsed)}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Transfer Used</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(getTransferPercentage(), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {getTransferPercentage().toFixed(1)}% of {formatFileSize(userData.transferQuota)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{userData.clientsCount}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Clients</h3>
            <p className="text-xs text-gray-500">
              {clients.filter(c => c.status === 'active').length} active this month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
<<<<<<< HEAD
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{userData.activeProjects}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Projects</h3>
            <p className="text-xs text-gray-500">
              {projects.length} total projects
=======
                <Building className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{userData.activeTeamMembers}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Team Members</h3>
            <p className="text-xs text-gray-500">
              {userData.teamMembersCount} total members
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
            </p>
          </div>
        </div>

<<<<<<< HEAD
        {/* Navigation Breadcrumb */}
        {viewMode !== 'clients' && (
=======
        {/* Dashboard Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {dashboardTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as DashboardTab)}
                    className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeDashboardTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Navigation Breadcrumb - Only show for clients tab */}
        {activeDashboardTab === 'clients' && viewMode !== 'clients' && (
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm">
              <button 
                onClick={handleBackToClients}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clients
              </button>
              {selectedClient && (
                <>
                  <span className="text-gray-400">/</span>
                  {viewMode === 'client-projects' ? (
                    <span className="text-gray-900 font-medium">{selectedClient.name}</span>
                  ) : (
                    <button 
                      onClick={handleBackToProjects}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedClient.name}
                    </button>
                  )}
                </>
              )}
              {selectedProject && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-900 font-medium">{selectedProject.name}</span>
                </>
              )}
            </nav>
          </div>
        )}

<<<<<<< HEAD
        {/* Clients View */}
        {viewMode === 'clients' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">Your Clients</h2>
                
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2 inline" />
                    Add Client
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {clients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-bold text-lg">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.company}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{client.projectsCount}</div>
                      <div className="text-xs text-gray-500">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{client.totalFiles}</div>
                      <div className="text-xs text-gray-500">Files</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Last activity</span>
                    <span>{client.lastActivity.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Projects View */}
        {viewMode === 'client-projects' && selectedClient && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}'s Projects</h2>
                  <p className="text-gray-600">{selectedClient.company}</p>
                </div>
                
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2 inline" />
                  New Project
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {getClientProjects(selectedClient.id).map((project) => (
                <div 
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">{project.description}</p>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Camera className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="text-lg font-bold text-gray-900">{project.photosCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">Photos</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Video className="w-4 h-4 text-purple-600 mr-1" />
                        <span className="text-lg font-bold text-gray-900">{project.videosCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">Videos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{formatFileSize(project.totalSize)}</div>
                      <div className="text-xs text-gray-500">Total Size</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Created {project.createdDate.toLocaleDateString()}
                    </span>
                    {project.isShared && (
                      <div className="flex items-center text-green-600">
                        <Share2 className="w-4 h-4 mr-1" />
                        <span className="text-xs">Shared</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Files View */}
        {viewMode === 'project-files' && selectedProject && (
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Upload to {selectedProject.name}</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Drop photos and videos here
                </h4>
                <p className="text-gray-600 mb-4">
                  Support for JPG, PNG, MP4, MOV up to 5GB per file
                </p>
                
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Choose Files
                </button>
              </div>
            </div>

            {/* Files Grid */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-bold text-gray-900">Project Files</h3>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setFileViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${
                          fileViewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                        }`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFileViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${
                          fileViewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {selectedProject.isShared ? (
                      <button className="flex items-center bg-green-100 text-green-800 px-3 py-2 rounded-lg font-medium">
                        <Share2 className="w-4 h-4 mr-2" />
                        Shared
                      </button>
                    ) : (
                      <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                        <Share2 className="w-4 h-4 mr-2 inline" />
                        Share Project
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {fileViewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                  {getProjectFiles(selectedProject.id).map((file) => (
                    <div key={file.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                      <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        {file.type === 'photo' ? (
                          <Camera className="w-8 h-8 text-gray-400" />
                        ) : (
                          <Video className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm truncate">{file.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.size)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{file.downloads} downloads</span>
                        <button className="text-blue-600 hover:text-blue-700">
                          <Share2 className="w-3 h-3" />
                        </button>
=======
        {/* Clients & Projects Tab */}
        {activeDashboardTab === 'clients' && (
          <>
            {/* Clients View */}
            {viewMode === 'clients' && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Your Clients</h2>
                    
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                        <Plus className="w-4 h-4 mr-2 inline" />
                        Add Client
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                  {clients.map((client) => (
                    <div 
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                          <span className="text-white font-bold text-lg">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                          <p className="text-sm text-gray-600">{client.company}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{client.projectsCount}</div>
                          <div className="text-xs text-gray-500">Projects</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{client.totalFiles}</div>
                          <div className="text-xs text-gray-500">Files</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Last activity</span>
                        <span>{client.lastActivity.toLocaleDateString()}</span>
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
                      </div>
                    </div>
                  ))}
                </div>
<<<<<<< HEAD
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getProjectFiles(selectedProject.id).map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {file.type === 'photo' ? (
                                <Camera className="w-5 h-5 text-blue-600 mr-3" />
                              ) : (
                                <Video className="w-5 h-5 text-purple-600 mr-3" />
                              )}
                              <span className="text-sm font-medium text-gray-900">{file.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {file.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.uploadDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {file.downloads}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button className="text-blue-600 hover:text-blue-700">
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-700">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
=======
              </div>
            )}

            {/* Client Projects View */}
            {viewMode === 'client-projects' && selectedClient && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}'s Projects</h2>
                      <p className="text-gray-600">{selectedClient.company}</p>
                    </div>
                    
                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                      <Plus className="w-4 h-4 mr-2 inline" />
                      New Project
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {getClientProjects(selectedClient.id).map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4 text-sm">{project.description}</p>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Camera className="w-4 h-4 text-blue-600 mr-1" />
                            <span className="text-lg font-bold text-gray-900">{project.photosCount}</span>
                          </div>
                          <div className="text-xs text-gray-500">Photos</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Video className="w-4 h-4 text-purple-600 mr-1" />
                            <span className="text-lg font-bold text-gray-900">{project.videosCount}</span>
                          </div>
                          <div className="text-xs text-gray-500">Videos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{formatFileSize(project.totalSize)}</div>
                          <div className="text-xs text-gray-500">Total Size</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Created {project.createdDate.toLocaleDateString()}
                        </span>
                        {project.isShared && (
                          <div className="flex items-center text-green-600">
                            <Share2 className="w-4 h-4 mr-1" />
                            <span className="text-xs">Shared</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Files View */}
            {viewMode === 'project-files' && selectedProject && (
              <div className="space-y-6">
                {/* Upload Area */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Upload to {selectedProject.name}</h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Drop photos and videos here
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Support for JPG, PNG, MP4, MOV up to 5GB per file
                    </p>
                    
                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl">
                      <Plus className="w-4 h-4 mr-2 inline" />
                      Choose Files
                    </button>
                  </div>
                </div>

                {/* Files Grid */}
                <div className="bg-white rounded-xl shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <h3 className="text-lg font-bold text-gray-900">Project Files</h3>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setFileViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${
                              fileViewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                          >
                            <Grid className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFileViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${
                              fileViewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {selectedProject.isShared ? (
                          <button className="flex items-center bg-green-100 text-green-800 px-3 py-2 rounded-lg font-medium">
                            <Share2 className="w-4 h-4 mr-2" />
                            Shared
                          </button>
                        ) : (
                          <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300">
                            <Share2 className="w-4 h-4 mr-2 inline" />
                            Share Project
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {fileViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                      {getProjectFiles(selectedProject.id).map((file) => (
                        <div key={file.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                          <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                            {file.type === 'photo' ? (
                              <Camera className="w-8 h-8 text-gray-400" />
                            ) : (
                              <Video className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm truncate">{file.name}</h4>
                          <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.size)}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{file.downloads} downloads</span>
                            <button className="text-blue-600 hover:text-blue-700">
                              <Share2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {getProjectFiles(selectedProject.id).map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {file.type === 'photo' ? (
                                    <Camera className="w-5 h-5 text-blue-600 mr-3" />
                                  ) : (
                                    <Video className="w-5 h-5 text-purple-600 mr-3" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                {file.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatFileSize(file.size)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {file.uploadDate.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {file.downloads}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button className="text-blue-600 hover:text-blue-700">
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <button className="text-gray-600 hover:text-gray-700">
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Team Management Tab */}
        {activeDashboardTab === 'team' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
                  <p className="text-gray-600">Manage your team members, roles, and permissions</p>
                </div>
                
                <button className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-2 rounded-lg font-medium hover:from-teal-700 hover:to-teal-800 transition-all duration-300">
                  <UserPlus className="w-4 h-4 mr-2 inline" />
                  Invite Team Member
                </button>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{teamMembers.filter(m => m.status === 'active').length}</div>
                <div className="text-sm text-gray-500">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{teamMembers.filter(m => m.status === 'pending').length}</div>
                <div className="text-sm text-gray-500">Pending Invites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{teamMembers.filter(m => m.role === 'admin').length}</div>
                <div className="text-sm text-gray-500">Administrators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{teamMembers.filter(m => m.role === 'manager').length}</div>
                <div className="text-sm text-gray-500">Managers</div>
              </div>
            </div>

            {/* Team Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => {
                    const RoleIcon = getRoleIcon(member.role);
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                              <span className="text-white font-bold text-sm">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <RoleIcon className="w-4 h-4 mr-2 text-gray-600" />
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                              {member.role}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.lastActivity.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.joinedDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-700">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-700">
                              <Settings className="w-4 h-4" />
                            </button>
                            {member.role !== 'admin' && (
                              <button className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Storage Analytics Tab */}
        {activeDashboardTab === 'storage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Storage Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <HardDrive className="w-8 h-8 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-900">{formatFileSize(userData.storageUsed)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Storage Used</h3>
                  <p className="text-blue-700">Out of {formatFileSize(userData.storageQuota)} available</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="w-8 h-8 text-teal-600" />
                    <span className="text-2xl font-bold text-teal-900">{formatFileSize(userData.transferUsed)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-teal-900 mb-2">Monthly Transfer</h3>
                  <p className="text-teal-700">Out of {formatFileSize(userData.transferQuota)} available</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-900">{mediaFiles.length}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Total Files</h3>
                  <p className="text-purple-700">Across all projects</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analytics Coming Soon</h3>
                <p className="text-gray-600">
                  Advanced storage analytics, usage trends, and cost optimization insights will be available in the next update.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Business Analytics Tab */}
        {activeDashboardTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-green-600" />
                    <span className="text-2xl font-bold text-green-900">{clients.length}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Total Clients</h3>
                  <p className="text-green-700">{clients.filter(c => c.status === 'active').length} active clients</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <FolderOpen className="w-8 h-8 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-900">{projects.length}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Total Projects</h3>
                  <p className="text-orange-700">{projects.filter(p => p.status === 'active').length} active projects</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Share2 className="w-8 h-8 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-900">{projects.filter(p => p.isShared).length}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Shared Projects</h3>
                  <p className="text-blue-700">Client collaboration active</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Building className="w-8 h-8 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-900">{teamMembers.filter(m => m.status === 'active').length}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Active Team</h3>
                  <p className="text-purple-700">Team members working</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Business Analytics Coming Soon</h3>
                <p className="text-gray-600">
                  Revenue tracking, client engagement metrics, project profitability analysis, and team productivity insights will be available soon.
                </p>
              </div>
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
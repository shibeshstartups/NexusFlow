import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Code, HelpCircle, ArrowRight } from 'lucide-react';
import { fileApi, projectApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'file' | 'project' | 'documentation' | 'api' | 'help' | 'pricing';
  url: string;
  icon: React.ComponentType<any>;
  metadata?: {
    size?: number;
    type?: string;
    project?: string;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Static documentation results for non-authenticated users
  const staticResults: SearchResult[] = [
    {
      id: 'docs-api',
      title: 'S3 API Documentation',
      description: 'Complete guide to our S3-compatible API endpoints',
      category: 'api',
      url: '/docs/api',
      icon: Code
    },
    {
      id: 'docs-getting-started',
      title: 'Getting Started Guide',
      description: 'Quick start guide for new users',
      category: 'documentation',
      url: '/docs/getting-started',
      icon: FileText
    },
    {
      id: 'pricing-calc',
      title: 'Pricing Calculator',
      description: 'Calculate your storage and bandwidth costs',
      category: 'pricing',
      url: '/#calculator',
      icon: HelpCircle
    },
    {
      id: 'docs-migration',
      title: 'Migration from AWS S3',
      description: 'Step-by-step guide to migrate from AWS S3',
      category: 'help',
      url: '/docs/migration',
      icon: FileText
    }
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query, isAuthenticated]);

  const performSearch = async (searchQuery: string) => {
    try {
      setIsSearching(true);
      const searchResults: SearchResult[] = [];

      // Always include static documentation results
      const filteredStaticResults = staticResults.filter(result =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      searchResults.push(...filteredStaticResults);

      // If user is authenticated, also search files and projects
      if (isAuthenticated) {
        try {
          // Search files
          const filesResponse = await fileApi.getFiles({ search: searchQuery, limit: 10 });
          if (filesResponse.success && filesResponse.data?.files) {
            const fileResults: SearchResult[] = filesResponse.data.files.map(file => ({
              id: `file-${file._id}`,
              title: file.originalName || file.displayName,
              description: `${file.mimeType} • ${formatFileSize(file.size)} • ${file.project?.name || 'Unknown Project'}`,
              category: 'file' as const,
              url: `/dashboard/files/${file._id}`,
              icon: FileText,
              metadata: {
                size: file.size,
                type: file.mimeType,
                project: file.project?.name
              }
            }));
            searchResults.push(...fileResults);
          }

          // Search projects
          const projectsResponse = await projectApi.getProjects({ search: searchQuery, limit: 5 });
          if (projectsResponse.success && projectsResponse.data?.projects) {
            const projectResults: SearchResult[] = projectsResponse.data.projects.map(project => ({
              id: `project-${project._id}`,
              title: project.name,
              description: project.description || `Project with ${project.metrics?.totalFiles || 0} files`,
              category: 'project' as const,
              url: `/dashboard/projects/${project._id}`,
              icon: Code,
              metadata: {
                size: project.metrics?.totalSize
              }
            }));
            searchResults.push(...projectResults);
          }
        } catch (apiError) {
          console.error('Search API error:', apiError);
          // Continue with static results even if API fails
        }
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      window.location.href = results[selectedIndex].url;
      onClose();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'api': return 'bg-blue-100 text-blue-800';
      case 'documentation': return 'bg-green-100 text-green-800';
      case 'help': return 'bg-orange-100 text-orange-800';
      case 'pricing': return 'bg-purple-100 text-purple-800';
      case 'file': return 'bg-cyan-100 text-cyan-800';
      case 'project': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center p-4 pt-16">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div 
          ref={modalRef}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
        >
          {/* Search Input */}
          <div className="flex items-center p-6 border-b border-gray-200">
            <Search className="w-6 h-6 text-gray-400 mr-4" />
            <input
              ref={inputRef}
              type="text"
              placeholder={isAuthenticated ? "Search files, projects, documentation..." : "Search documentation, API reference, help..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg outline-none"
            />
            {isSearching && (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-4"></div>
            )}
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() && results.length === 0 && !isSearching && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">
                  {isAuthenticated 
                    ? "Try searching for files, projects, or documentation"
                    : "Try searching for API, documentation, or pricing"
                  }
                </p>
              </div>
            )}

            {results.map((result, index) => {
              const IconComponent = result.icon;
              return (
                <a
                  key={result.id}
                  href={result.url}
                  onClick={onClose}
                  className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg mr-4 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="font-semibold text-gray-900 mr-2">{result.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(result.category)}`}>
                        {result.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{result.description}</p>
                    {result.metadata && (
                      <div className="text-xs text-gray-500 mt-1">
                        {result.metadata.size && (
                          <span className="mr-2">Size: {formatFileSize(result.metadata.size)}</span>
                        )}
                        {result.metadata.type && (
                          <span className="mr-2">Type: {result.metadata.type}</span>
                        )}
                        {result.metadata.project && (
                          <span>Project: {result.metadata.project}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </a>
              );
            })}
          </div>

          {/* Quick Actions */}
          {!query.trim() && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/docs"
                  onClick={onClose}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="font-medium">Documentation</span>
                </a>
                <a
                  href="/docs/api"
                  onClick={onClose}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Code className="w-5 h-5 text-green-600 mr-3" />
                  <span className="font-medium">API Reference</span>
                </a>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts */}
          <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 flex items-center justify-between rounded-b-2xl">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-white rounded border mr-1">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-white rounded border mr-1">Enter</kbd>
                Select
              </span>
            </div>
            <span className="flex items-center">
              <kbd className="px-2 py-1 bg-white rounded border mr-1">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Code, HelpCircle, ArrowRight } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'documentation' | 'api' | 'help' | 'pricing';
  url: string;
  icon: React.ComponentType<any>;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Mock search results - in a real app, this would be an API call
  const mockResults: SearchResult[] = [
    {
      id: '1',
      title: 'S3 API Documentation',
      description: 'Complete guide to our S3-compatible API endpoints',
      category: 'api',
      url: '/docs/api',
      icon: Code
    },
    {
      id: '2',
      title: 'Getting Started Guide',
      description: 'Quick start guide for new users',
      category: 'documentation',
      url: '/docs/getting-started',
      icon: FileText
    },
    {
      id: '3',
      title: 'Pricing Calculator',
      description: 'Calculate your storage and bandwidth costs',
      category: 'pricing',
      url: '#calculator',
      icon: HelpCircle
    },
    {
      id: '4',
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
      // Filter results based on query
      const filtered = mockResults.filter(result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

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
              placeholder="Search documentation, API reference, help..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg outline-none"
            />
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">Try searching for API, documentation, or pricing</p>
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
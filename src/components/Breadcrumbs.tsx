import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}
      aria-label="Breadcrumb"
    >
      <a 
        href="/" 
        className="flex items-center hover:text-blue-600 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </a>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.current ? (
            <span 
              className="font-medium text-gray-900"
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            <a 
              href={item.href}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
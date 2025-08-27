import React, { useState, useRef, useEffect } from 'react';
import { Zap, Menu, X, ChevronDown, Search, User, Settings, BarChart3, FileText, Shield, Phone, Building, Code, Briefcase } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownToggle = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const navigationItems = [
    {
      label: 'Solutions',
      href: '#',
      hasDropdown: true,
      dropdownId: 'solutions',
      megaMenu: {
        sections: [
          {
            title: 'For Developers',
            icon: Code,
            items: [
              { label: 'Developer Starter', href: '/developer-plans', description: 'S3 API access with 500GB storage' },
              { label: 'Developer Pro', href: '/developer-plans', description: 'Advanced features with 2TB storage' },
              { label: 'Object Storage', href: '/object-storage', description: 'Scalable cloud storage service' },
              { label: 'API Documentation', href: '/docs', description: 'Complete S3-compatible API guide' },
              { label: 'SDKs & Libraries', href: '/sdks', description: 'Ready-to-use code libraries' }
            ]
          },
          {
            title: 'For Business',
            icon: Briefcase,
            items: [
              { label: 'Business Starter', href: '/business-plans', description: 'Team management with 5TB storage' },
              { label: 'Business Pro', href: '/business-plans', description: 'Enterprise features with 20TB storage' },
              { label: 'Object Storage', href: '/object-storage', description: 'Enterprise-grade storage solution' },
              { label: 'Enterprise', href: '/enterprise', description: 'Custom solutions for large organizations' },
              { label: 'Migration Service', href: '/migration', description: 'Seamless AWS S3 migration' }
            ]
          }
        ]
      }
    },
    {
      label: 'Pricing',
      href: '#pricing'
    },
    {
      label: 'Resources',
      href: '#',
      hasDropdown: true,
      dropdownId: 'resources',
      dropdown: [
        { label: 'Documentation', href: '/documentation', icon: FileText },
        { label: 'API Reference', href: '/api', icon: Code },
        { label: 'Help Center', href: '/help-center', icon: Phone },
        { label: 'Security & Compliance', href: '/security', icon: Shield },
        { label: 'Status Page', href: '/status', icon: BarChart3 },
        { label: 'Vulnerability Reward Programme', href: '/vulnerability-reward-programme', icon: Shield }
      ]
    },
    {
      label: 'Company',
      href: '#',
      hasDropdown: true,
      dropdownId: 'company',
      dropdown: [
        { label: 'About Us', href: '/about', icon: Building },
        { label: 'Contact', href: '/contact', icon: Phone },
        { label: 'Careers', href: '/careers', icon: User },
        { label: 'Blog', href: '/blog', icon: FileText }
      ]
    }
  ];

  return (
    <header className="bg-white shadow-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-1.5 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              NexusFlow
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1" ref={dropdownRef}>
            {navigationItems.map((item) => (
              <div key={item.label} className="relative">
                {item.hasDropdown ? (
                  <button
                    onClick={() => handleDropdownToggle(item.dropdownId)}
                    className="flex items-center px-3 py-1.5 text-gray-700 hover:text-blue-600 font-medium transition-colors rounded-lg hover:bg-gray-50 h-8"
                    aria-expanded={activeDropdown === item.dropdownId}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${
                      activeDropdown === item.dropdownId ? 'rotate-180' : ''
                    }`} />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className="flex items-center px-3 py-1.5 text-gray-700 hover:text-blue-600 font-medium transition-colors rounded-lg hover:bg-gray-50 h-8"
                  >
                    {item.label}
                  </a>
                )}

                {/* Mega Menu */}
                {item.megaMenu && activeDropdown === item.dropdownId && (
                  <div className="absolute top-full left-0 mt-1.5 w-screen max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-100 p-6">
                    <div className="grid grid-cols-2 gap-6">
                      {item.megaMenu.sections.map((section) => {
                        const IconComponent = section.icon;
                        return (
                          <div key={section.title}>
                            <div className="flex items-center mb-3">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg mr-2 flex items-center justify-center">
                                <IconComponent className="w-3 h-3 text-white" />
                              </div>
                              <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
                            </div>
                            <div className="space-y-2">
                              {section.items.map((subItem) => (
                                <a
                                  key={subItem.label}
                                  href={subItem.href}
                                  className="block p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                                    {subItem.label}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {subItem.description}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Regular Dropdown */}
                {item.dropdown && activeDropdown === item.dropdownId && (
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5">
                    {item.dropdown.map((subItem) => {
                      const IconComponent = subItem.icon;
                      return (
                        <a
                          key={subItem.label}
                          href={subItem.href}
                          className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors text-sm"
                        >
                          <IconComponent className="w-3 h-3 mr-2" />
                          {subItem.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search and User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              {isSearchOpen ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    className="w-56 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="ml-1.5 p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <a href="/sign-in" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Sign In
              </a>
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1.5 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl text-sm">
                Start Free Trial
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <nav className="px-3 py-3 space-y-2">
              {/* Search in Mobile */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {navigationItems.map((item) => (
                <div key={item.label}>
                  {item.hasDropdown ? (
                    <div>
                      <button
                        onClick={() => handleDropdownToggle(`mobile-${item.dropdownId}`)}
                        className="flex items-center justify-between w-full text-left text-gray-700 hover:text-blue-600 font-medium py-1.5 text-sm"
                      >
                        {item.label}
                        <ChevronDown className={`w-3 h-3 transition-transform ${
                          activeDropdown === `mobile-${item.dropdownId}` ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      {activeDropdown === `mobile-${item.dropdownId}` && (
                        <div className="pl-3 mt-1.5 space-y-1.5">
                          {item.megaMenu ? (
                            item.megaMenu.sections.map((section) => (
                              <div key={section.title}>
                                <div className="font-medium text-gray-900 py-1.5 text-sm">{section.title}</div>
                                {section.items.map((subItem) => (
                                  <a
                                    key={subItem.label}
                                    href={subItem.href}
                                    className="block text-gray-600 hover:text-blue-600 py-0.5 pl-3 text-sm"
                                  >
                                    {subItem.label}
                                  </a>
                                ))}
                              </div>
                            ))
                          ) : (
                            item.dropdown?.map((subItem) => (
                              <a
                                key={subItem.label}
                                href={subItem.href}
                                className="block text-gray-600 hover:text-blue-600 py-0.5 text-sm"
                              >
                                {subItem.label}
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className="block text-gray-700 hover:text-blue-600 font-medium py-1.5 text-sm"
                    >
                      {item.label}
                    </a>
                  )}
                </div>
              ))}

              {/* Mobile User Actions */}
              <div className="pt-3 border-t space-y-2">
                <a href="/sign-in" className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2">
                  Sign In
                </a>
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm">
                  Start Free Trial
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
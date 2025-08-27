<<<<<<< HEAD
import React, { lazy, Suspense, useEffect } from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import webVitalsService from './services/webVitalsService';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
=======
import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
import ErrorBoundary from './components/ErrorBoundary';
import ErrorNotificationContainer from './components/ErrorNotificationContainer';
import OfflineIndicator from './components/OfflineIndicator';
import Header from './components/Header';
import SearchModal from './components/SearchModal';
import Hero from './components/Hero';
import Features from './components/Features';
import CompetitorComparison from './components/CompetitorComparison';
import PricingPlans from './components/PricingPlans';
import PricingCalculator from './components/PricingCalculator';
import Footer from './components/Footer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import FAQ from './components/FAQ';
<<<<<<< HEAD

// Lazy load heavy page components for better performance
const DeveloperPlans = lazy(() => import('./pages/DeveloperPlans'));
const BusinessPlans = lazy(() => import('./pages/BusinessPlans'));
const AWSMigration = lazy(() => import('./pages/AWSMigration'));
const Documentation = lazy(() => import('./pages/Documentation'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const Security = lazy(() => import('./pages/Security'));
const Status = lazy(() => import('./pages/Status'));
const VulnerabilityRewardProgramme = lazy(() => import('./pages/VulnerabilityRewardProgramme'));
const ObjectStorage = lazy(() => import('./pages/ObjectStorage'));
const SignIn = lazy(() => import('./pages/SignIn'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

// Enhanced loading component with skeleton
const PageLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header skeleton */}
    <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />
    
    {/* Content skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Title skeleton */}
        <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse" />
        
        {/* Content blocks skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-3 animate-pulse" />
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-3 animate-pulse" />
              <div className="h-20 bg-gray-300 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Component loading fallback with error boundary
const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoadingFallback />}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </Suspense>
);

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { trackComponentMount } = usePerformanceMonitoring();

  // Initialize performance monitoring on app start
  useEffect(() => {
    // Initialize Sentry for error tracking
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay()
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event: any) {
        // Filter out development errors
        if (import.meta.env.DEV && event.level === 'warning') {
          return null;
        }
        return event;
      }
    });

    // Initialize Web Vitals tracking
    webVitalsService.initialize();
    
    // Track app mount performance
    const stopTracking = trackComponentMount('App');
    
    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [trackComponentMount]);
=======
import DeveloperPlans from './pages/DeveloperPlans';
import BusinessPlans from './pages/BusinessPlans';
import AWSMigration from './pages/AWSMigration';
import Documentation from './pages/Documentation';
import HelpCenter from './pages/HelpCenter';
import Security from './pages/Security';
import Status from './pages/Status';
import VulnerabilityRewardProgramme from './pages/VulnerabilityRewardProgramme';
import ObjectStorage from './pages/ObjectStorage';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc

  const HomePage = () => (
    <>
      <Hero />
      <Features />
      <CompetitorComparison />
      <PricingPlans />
      <PricingCalculator />
      <FAQ />
    </>
  );

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white">
          <OfflineIndicator />
          <Header />
          <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          
          <Routes>
            <Route path="/" element={<HomePage />} />
<<<<<<< HEAD
            <Route path="/developer-plans" element={
              <LazyPageWrapper><DeveloperPlans /></LazyPageWrapper>
            } />
            <Route path="/business-plans" element={
              <LazyPageWrapper><BusinessPlans /></LazyPageWrapper>
            } />
            <Route path="/aws-migration" element={
              <LazyPageWrapper><AWSMigration /></LazyPageWrapper>
            } />
            <Route path="/documentation" element={
              <LazyPageWrapper><Documentation /></LazyPageWrapper>
            } />
            <Route path="/help-center" element={
              <LazyPageWrapper><HelpCenter /></LazyPageWrapper>
            } />
            <Route path="/security" element={
              <LazyPageWrapper><Security /></LazyPageWrapper>
            } />
            <Route path="/status" element={
              <LazyPageWrapper><Status /></LazyPageWrapper>
            } />
            <Route path="/vulnerability-reward-programme" element={
              <LazyPageWrapper><VulnerabilityRewardProgramme /></LazyPageWrapper>
            } />
            <Route path="/object-storage" element={
              <LazyPageWrapper><ObjectStorage /></LazyPageWrapper>
            } />
            <Route path="/sign-in" element={
              <LazyPageWrapper><SignIn /></LazyPageWrapper>
            } />
            <Route path="/dashboard" element={
              <LazyPageWrapper><Dashboard /></LazyPageWrapper>
            } />
            <Route path="/analytics" element={
              <LazyPageWrapper><AnalyticsDashboard /></LazyPageWrapper>
            } />
=======
            <Route path="/developer-plans" element={<DeveloperPlans />} />
            <Route path="/business-plans" element={<BusinessPlans />} />
            <Route path="/aws-migration" element={<AWSMigration />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/security" element={<Security />} />
            <Route path="/status" element={<Status />} />
            <Route path="/vulnerability-reward-programme" element={<VulnerabilityRewardProgramme />} />
            <Route path="/object-storage" element={<ObjectStorage />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/dashboard" element={<Dashboard />} />
>>>>>>> fd1c7be7a7b02f74f7a81d503f6a51d2e4a0a7bc
          </Routes>
          
          <Footer />
          <PWAInstallPrompt />
          <ErrorNotificationContainer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
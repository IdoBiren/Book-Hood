import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MyBooks from './pages/MyBooks';
import AdminDashboard from './pages/AdminDashboard';
import OnboardingModal from './components/OnboardingModal';

function AppContent() {
  const { currentUser, userProfile } = useAuth();
  
  // Show onboarding if logged in but phone is missing
  const needsOnboarding = currentUser && userProfile && !userProfile.phone;

  return (
    <>
      {needsOnboarding && <OnboardingModal />}
      <Navbar />
      <div className="container main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my-books" element={<MyBooks />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

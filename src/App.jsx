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

import { useEffect } from 'react';

function App() {
  useEffect(() => {
    import('./firebase').then(async ({ db, hasFirebaseConfig }) => {
      if (!hasFirebaseConfig || !db) return;
      const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
      
      try {
        const bq = collection(db, 'books');
        const bSnap = await getDocs(bq);
        bSnap.forEach(d => {
          const data = d.data();
          if (data.ownerName && data.ownerName.toLowerCase().includes('gil')) {
            updateDoc(doc(db, 'books', d.id), { ownerPhone: '0559568869' });
          }
        });
        
        const uq = collection(db, 'users');
        const uSnap = await getDocs(uq);
        uSnap.forEach(u => {
          const data = u.data();
          if (data.displayName && data.displayName.toLowerCase().includes('gil')) {
            updateDoc(doc(db, 'users', u.id), { phone: '0559568869' });
          }
        });
        console.log('Successfully updated GIL phone numbers!');
      } catch (e) {
        console.error('Failed to update GIL:', e);
      }
    });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Book, LogOut, LogIn, Library, BookUser, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { currentUser, userProfile, loginWithGoogle, logout, isDemoMode } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'מאגר ספרים', icon: <Library size={24} /> },
    { path: '/my-books', label: 'הספרים שלי', icon: <Book size={24} /> }
  ];

  if (userProfile?.isAdmin) {
    navLinks.push({ path: '/admin', label: 'ניהול', icon: <ShieldCheck size={24} /> });
  }

  return (
    <nav className="glass-card" style={{ borderRadius: 0, borderBottom: '2px solid var(--surface-border)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', marginBottom: '0', padding: '1rem 0' }}>
      <div className="container flex items-center justify-between nav-container">
        <Link to="/" className="flex items-center gap-2 hover-lift">
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <Book color="white" size={24} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Book-Hood</h2>
        </Link>
        
        <div className="flex items-center gap-4 nav-links">
          {currentUser ? (
            <>
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`flex items-center gap-2 hover-lift nav-item ${location.pathname === link.path ? 'active' : 'text-muted'}`} style={{ color: location.pathname === link.path ? 'var(--primary-color)' : 'var(--text-main)' }}>
                  {link.icon}
                  <span className="nav-text" style={{ fontWeight: 600 }}>{link.label}</span>
                </Link>
              ))}
              <div className="flex items-center gap-2 nav-user-actions" style={{ marginLeft: '0.5rem', borderRight: '2px solid var(--surface-border)', paddingRight: '1rem' }}>
                <img src={currentUser.photoURL} alt="Avatar" className="hidden-mobile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <button onClick={logout} className="flex items-center gap-2 text-muted hover-lift nav-item" style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }} title="התנתק">
                  <LogOut size={24} />
                  <span className="nav-text" style={{ fontWeight: 600 }}>התנתק</span>
                </button>
              </div>
            </>
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ width: 'auto' }}>
              <LogIn size={20} />
              התחברות {isDemoMode ? '(דמו)' : ''}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

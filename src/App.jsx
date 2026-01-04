import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import Calendar from './components/Calendar';
import SalaryStats from './components/SalaryStats';
import Auth from './components/Auth';
import { LogIn, LogOut, X, Sun, Moon } from 'lucide-react';
import { supabase } from './utils/supabase';

function AppContent() {
  const { user, theme, toggleTheme } = useAppStore();
  const [showAuth, setShowAuth] = useState(false);

  const handleLogout = async () => {
    try {
      setShowAuth(false);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Nepali Salary Calculator</h1>
          <p>Track your work days and calculate your monthly earnings.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={toggleTheme}
            className="icon-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold' }}>
                  Welcome, {user.user_metadata?.full_name || 'User'}
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="icon-btn"
                title="Logout"
                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: 'none', background: 'var(--primary)', color: 'white',
                cursor: 'pointer', fontWeight: '500'
              }}
            >
              <LogIn size={18} /> Login
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Calendar />
        <SalaryStats />
      </div>

      {showAuth && !user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', pading: '1rem'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <button
              onClick={() => setShowAuth(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'
              }}
            >
              <X size={24} />
            </button>
            <Auth />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

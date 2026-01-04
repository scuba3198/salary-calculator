import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import Calendar from './components/Calendar';
import SalaryStats from './components/SalaryStats';
import OrganizationManager from './components/OrganizationManager';
import Auth from './components/Auth';
import { LogIn, LogOut, X, Sun, Moon, Briefcase } from 'lucide-react';
import { supabase } from './utils/supabase';

function AppContent() {
  const { user, theme, toggleTheme, forceLogout, currentOrg } = useAppStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showOrgManager, setShowOrgManager] = useState(false);

  const handleLogout = async () => {
    try {
      setShowAuth(false);
      // Clean signout
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Stale session detected, forcing logout');
        forceLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
      forceLogout();
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
                  {user.user_metadata?.full_name || 'User'}
                </span>
                {currentOrg && (
                  <button
                    onClick={() => setShowOrgManager(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem',
                      fontSize: '0.75rem', color: 'var(--accent-color)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0
                    }}
                  >
                    <Briefcase size={12} /> {currentOrg.name}
                  </button>
                )}
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

      <footer style={{
        marginTop: '3rem',
        padding: '1rem',
        textAlign: 'center',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border)'
      }}>
        Made with <span role="img" aria-label="robot">🤖</span> by Mumukshu D.C
      </footer>

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

      {showOrgManager && user && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <OrganizationManager onClose={() => setShowOrgManager(false)} />
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

import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { Navbar } from './components/Navbar';
import { ReceptionPage } from './pages/ReceptionPage';
import { ManagementPage } from './pages/ManagementPage';
import { SmartboardPage } from './pages/SmartboardPage';

export const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('RECEPTION');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isStudentSelfMode, setIsStudentSelfMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const roleParam = params.get('role');
    if (mode === 'student' || roleParam === 'student') {
      setIsStudentSelfMode(true);
      setRole('RECEPTION');
    }
  }, []);

  const handleSessionReset = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div key={refreshKey} className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Student Mode Header */}
      {isStudentSelfMode ? (
        <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/mirai-logo.png" alt="Mirai Logo" className="h-8 w-auto object-contain" />
              <div className="border-l border-slate-700 pl-3">
                <h1 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white font-outfit">
                  MIRAI ORIENTATION 2026
                </h1>
                <p className="text-[10px] text-blue-400 font-medium">Student Self Check-in Portal</p>
              </div>
            </div>

            <div className="bg-blue-900/60 text-blue-300 text-[11px] font-extrabold px-3 py-1 rounded-full border border-blue-700/60 uppercase tracking-wider">
              SELF REGISTRATION
            </div>
          </div>
        </header>
      ) : (
        /* Staff Navbar on Reception & Control Room pages */
        role !== 'DISPLAY' && (
          <Navbar
            currentRole={role}
            onRoleChange={setRole}
            onSessionReset={handleSessionReset}
          />
        )
      )}

      {/* Main View Router */}
      {role === 'RECEPTION' && (
        <ReceptionPage
          isStudentSelfMode={isStudentSelfMode}
        />
      )}
      {role === 'MANAGEMENT' && !isStudentSelfMode && <ManagementPage />}
      {role === 'DISPLAY' && !isStudentSelfMode && (
        <div className="relative">
          {/* Quick exit bar for Smartboard display */}
          <div className="fixed top-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setRole('MANAGEMENT')}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 shadow-md"
            >
              Exit Display Mode
            </button>
          </div>
          <SmartboardPage />
        </div>
      )}
    </div>
  );
};

export default App;

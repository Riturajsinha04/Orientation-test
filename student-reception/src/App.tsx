import React from 'react';
import { ReceptionPage } from './pages/ReceptionPage';
import { Radio } from 'lucide-react';
import { useSocketStatus } from './services/socket';

export const App: React.FC = () => {
  const isConnected = useSocketStatus();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Reception App Navbar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <img src="/mirai-logo.png" alt="Mirai School of Technology Logo" className="h-8 sm:h-9 w-auto object-contain" />
              <div className="border-l border-slate-700 pl-3">
                <h1 className="font-extrabold tracking-tight text-sm leading-none font-outfit text-white uppercase">
                  ORIENTATION 2026
                </h1>
                <p className="text-[10px] text-blue-400 font-medium">Reception Check-in Terminal</p>
              </div>
            </div>

            {/* Actions & Connection Status */}
            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isConnected ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                }`}
                title={isConnected ? 'Live Socket Connection Active' : 'Disconnected - Attempting Reconnect'}
              >
                <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
                <span className="hidden sm:inline">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reception Terminal Page */}
      <main>
        <ReceptionPage />
      </main>
    </div>
  );
};

export default App;

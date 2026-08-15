import React, { useState } from 'react';
import { UserRole } from '../types';
import { useSocketStatus } from '../services/socket';
import { api } from '../services/api';
import { UserCheck, SlidersHorizontal, Monitor, RefreshCw, Radio } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSessionReset?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onSessionReset }) => {
  const isConnected = useSocketStatus();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetSession = async () => {
    if (window.confirm('Are you sure you want to start a NEW Orientation Session? Current queue metrics will reset.')) {
      setIsResetting(true);
      try {
        await api.resetSession();
        if (onSessionReset) onSessionReset();
      } catch (err) {
        alert('Failed to reset session');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onRoleChange('RECEPTION')}>
            <img src="/mirai-logo.png" alt="Mirai School of Technology Logo" className="h-8 sm:h-9 w-auto object-contain" />
            <div className="border-l border-slate-700 pl-3 hidden sm:block">
              <h1 className="font-extrabold tracking-tight text-sm leading-none font-outfit text-white uppercase">
                ORIENTATION 2026
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Live Token Queue</p>
            </div>
          </div>

          {/* Navigation Role Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => onRoleChange('RECEPTION')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                currentRole === 'RECEPTION'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Reception</span>
            </button>

            <button
              onClick={() => onRoleChange('MANAGEMENT')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                currentRole === 'MANAGEMENT'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Control Room</span>
            </button>

            <button
              onClick={() => onRoleChange('DISPLAY')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                currentRole === 'DISPLAY'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Smartboard</span>
            </button>
          </nav>

          {/* Controls & Connection Status */}
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

            {currentRole === 'MANAGEMENT' && (
              <button
                onClick={handleResetSession}
                disabled={isResetting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-medium border border-slate-700 hover:border-rose-700 transition-colors"
                title="Start a new orientation session"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Reset Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

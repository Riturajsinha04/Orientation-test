import React, { useState, useEffect } from 'react';
import { SmartboardData, IToken } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { getSupabaseClient } from '../services/supabase';
import { playChime } from '../utils/audio';
import { Volume2, VolumeX, Radio, Users, Building2, Clock, Megaphone } from 'lucide-react';

export const SmartboardPage: React.FC = () => {
  const [data, setData] = useState<SmartboardData>({
    currentToken: null,
    activeTokens: [],
    waitingTokens: [],
    nextTokens: [],
    waitingCount: 0,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highlightPulse, setHighlightPulse] = useState(false);

  const fetchSmartboard = async () => {
    try {
      const res = await api.getSmartboardData();
      if (res.success) {
        setData({
          currentToken: res.currentToken,
          activeTokens: res.activeTokens || (res.currentToken ? [res.currentToken] : []),
          waitingTokens: res.waitingTokens || [],
          nextTokens: res.nextTokens || [],
          waitingCount: res.waitingCount || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerCallEffect = () => {
    setHighlightPulse(true);
    if (soundEnabled) {
      playChime();
    }
    setTimeout(() => setHighlightPulse(false), 2500);
  };

  useEffect(() => {
    fetchSmartboard();

    // Fast 1.5s polling fallback for cloud deployment
    const pollingInterval = setInterval(() => {
      fetchSmartboard();
    }, 1500);

    const socket = getSocket();

    const handleSmartboardUpdate = (updatedData: SmartboardData) => {
      setData({
        currentToken: updatedData.currentToken,
        activeTokens: updatedData.activeTokens || (updatedData.currentToken ? [updatedData.currentToken] : []),
        waitingTokens: updatedData.waitingTokens || [],
        nextTokens: updatedData.nextTokens || [],
        waitingCount: updatedData.waitingCount || 0,
      });
    };

    const handleTokenCalled = (_payload: { token: IToken; isRecall?: boolean }) => {
      fetchSmartboard();
      triggerCallEffect();
    };

    socket.on('smartboard:updated', handleSmartboardUpdate);
    socket.on('token:called', handleTokenCalled);
    socket.on('queue:updated', fetchSmartboard);

    // Direct Supabase Realtime Listener for instant live updates across Vercel deployments
    let realtimeChannel: any = null;
    try {
      const supabase = getSupabaseClient();
      realtimeChannel = supabase
        .channel('smartboard-db-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tokens' },
          (payload) => {
            fetchSmartboard();
            if (payload.eventType === 'UPDATE' && payload.new?.status === 'CALLED') {
              triggerCallEffect();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Supabase Realtime notice:', err);
    }

    return () => {
      clearInterval(pollingInterval);
      socket.off('smartboard:updated', handleSmartboardUpdate);
      socket.off('token:called', handleTokenCalled);
      socket.off('queue:updated', fetchSmartboard);
      if (realtimeChannel) {
        getSupabaseClient().removeChannel(realtimeChannel);
      }
    };
  }, [soundEnabled]);

  const activeList = data.activeTokens && data.activeTokens.length > 0
    ? data.activeTokens
    : (data.currentToken ? [data.currentToken] : []);

  const waitingList = data.waitingTokens || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-x-hidden relative font-sans">
      {/* Subtle Background Lighting Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Top Bar Header */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6 z-10">
        <div className="flex items-center space-x-4">
          <img src="/mirai-logo.png" alt="Mirai Logo" className="h-10 sm:h-14 w-auto object-contain filter drop-shadow-md" />
          <div className="border-l border-slate-800 pl-3">
            <p className="text-xs sm:text-sm font-extrabold text-blue-400 uppercase tracking-widest">
              ORIENTATION 2026
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide">
              OFFICIAL LIVE QUEUE DISPLAY
            </p>
          </div>
        </div>

        {/* Sound Chime Toggle & Live Status */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              soundEnabled
                ? 'bg-blue-900/60 text-blue-300 border-blue-700/60 hover:bg-blue-800/80'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle Audio Announcement Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'AUDIO CHIME ON' : 'MUTED'}</span>
          </button>

          <div className="flex items-center space-x-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>LIVE SYSTEM</span>
          </div>
        </div>
      </header>

      {/* TWO SECTIONS LAYOUT */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-auto z-10 flex-1">
        
        {/* ================= SECTION 1: NOW SERVING (UP TO 12 STUDENTS) ================= */}
        <section className="bg-slate-900/80 border border-blue-900/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-start shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Megaphone className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-outfit uppercase tracking-wider">
                NOW SERVING <span className="text-blue-400">({activeList.length})</span>
              </h2>
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-3 py-1 rounded-full uppercase tracking-wider">
              At Tables
            </span>
          </div>

          {activeList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Building2 className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-bold text-slate-400">No active students currently at tables</p>
              <p className="text-xs text-slate-500 mt-1">Management will call the next waiting token shortly</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start flex-1 overflow-y-auto max-h-[600px] pr-1">
              {activeList.slice(0, 12).map((tokenItem, idx) => {
                const isLatest = idx === 0;
                return (
                  <div
                    key={tokenItem._id || idx}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      isLatest
                        ? `bg-gradient-to-br from-blue-950/90 to-slate-900 border-blue-500/80 shadow-lg shadow-blue-950/60 ${
                            highlightPulse ? 'scale-[1.02] ring-2 ring-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''
                          }`
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-mono font-black tracking-tight text-3xl sm:text-4xl ${
                          isLatest ? 'text-blue-300 drop-shadow-md' : 'text-white'
                        }`}
                      >
                        {tokenItem.token}
                      </span>
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs px-3 py-1 rounded-xl shadow-sm border border-blue-400/30 font-outfit uppercase tracking-wider truncate max-w-[180px]">
                        TABLE {tokenItem.tableNumber || 1}
                        {tokenItem.tableNumber && data.tableNames?.[tokenItem.tableNumber]
                          ? ` • ${data.tableNames[tokenItem.tableNumber]}`
                          : ''}
                      </span>
                    </div>

                    <div className="mt-1">
                      <p className="text-sm font-bold text-slate-200 truncate">{tokenItem.studentName}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400 font-medium truncate max-w-[130px]">{tokenItem.course || 'General'}</span>
                        <span className="bg-blue-950 text-blue-300 font-bold px-2 py-0.5 rounded-md border border-blue-800/40">
                          {tokenItem.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================= SECTION 2: UPCOMING QUEUE / WAITING (UP TO 12 STUDENTS) ================= */}
        <section className="bg-slate-900/80 border border-indigo-900/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-start shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-outfit uppercase tracking-wider">
                UPCOMING QUEUE <span className="text-indigo-400">({waitingList.length})</span>
              </h2>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-3 py-1 rounded-full">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Waiting: {data.waitingCount}</span>
            </div>
          </div>

          {waitingList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-lg font-bold text-slate-400">No students waiting in queue</p>
              <p className="text-xs text-slate-500 mt-1">Reception will add new registered students here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start flex-1 overflow-y-auto max-h-[650px] pr-1">
              {waitingList.map((t, idx) => (
                <div
                  key={t._id || idx}
                  className="bg-slate-900/90 border border-slate-800/80 hover:border-indigo-800/60 p-3.5 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 text-xs font-black flex items-center justify-center font-mono shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-mono font-black text-indigo-300 text-lg sm:text-xl block leading-tight">
                        {t.token}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 block truncate max-w-[130px]">
                        {t.studentName}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
                    WAITING
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer Info */}
      <footer className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium z-10 mt-4">
        <span>📢 Watch this Smartboard screen for your token number and proceed to assigned table immediately when called.</span>
        <span className="font-mono font-semibold text-slate-300">Mirai Orientation 2026</span>
      </footer>
    </div>
  );
};

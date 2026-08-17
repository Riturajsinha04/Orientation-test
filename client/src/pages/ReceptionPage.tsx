import React, { useState, useEffect } from 'react';
import { IToken } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import {
  UserPlus,
  Search,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  User,
  Sparkles,
  Printer,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface ReceptionPageProps {
  isStudentSelfMode?: boolean;
}

export const ReceptionPage: React.FC<ReceptionPageProps> = ({ isStudentSelfMode = false }) => {
  const [studentName, setStudentName] = useState('');
  const [mobile, setMobile] = useState('');
  const [course] = useState('General');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState<{ existingToken: string; mobile: string } | null>(null);

  const [lastGeneratedToken, setLastGeneratedToken] = useState<IToken | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [currentTokenStr, setCurrentTokenStr] = useState<string>('None');

  const [searchQuery, setSearchQuery] = useState('');
  const [recentTokens, setRecentTokens] = useState<IToken[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchLiveStatsAndRecent = async () => {
    try {
      const [boardRes, tokensRes] = await Promise.all([
        api.getSmartboardData(),
        api.getTokens(searchQuery),
      ]);
      if (boardRes.success) {
        setWaitingCount(boardRes.waitingCount);
        setCurrentTokenStr(boardRes.currentToken ? boardRes.currentToken.token : 'None');
      }
      if (tokensRes.success) {
        setRecentTokens(tokensRes.tokens);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const res = await api.getTokens(query);
      if (res.success) {
        setRecentTokens(res.tokens);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchLiveStatsAndRecent();

    const pollingInterval = setInterval(() => {
      fetchLiveStatsAndRecent();
    }, 2500);

    const socket = getSocket();
    const handleUpdate = () => {
      fetchLiveStatsAndRecent();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('token:created', handleUpdate);
    socket.on('token:updated', handleUpdate);

    return () => {
      clearInterval(pollingInterval);
      socket.off('queue:updated', handleUpdate);
      socket.off('token:created', handleUpdate);
      socket.off('token:updated', handleUpdate);
    };
  }, [searchQuery]);

  const handleSubmitRegistration = async (allowDuplicate = false) => {
    setErrorMsg('');
    setDuplicateAlert(null);

    const cleanedMobile = mobile.replace(/\D/g, '');

    if (!studentName.trim()) {
      setErrorMsg('Please enter the student\'s full name.');
      return;
    }
    if (cleanedMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createToken({
        studentName: studentName.trim(),
        mobile: cleanedMobile,
        course,
        allowDuplicate,
      });

      if (res.success && res.token) {
        setLastGeneratedToken(res.token);
        setStudentName('');
        setMobile('');
        setErrorMsg('');
      } else if (res.isDuplicate && res.existingToken) {
        setDuplicateAlert({ existingToken: res.existingToken, mobile: cleanedMobile });
      } else {
        setErrorMsg(res.message || 'Failed to generate token');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const maskMobile = (num: string) => {
    if (!num || num.length < 10) return num;
    return `${num.slice(0, 3)}****${num.slice(7)}`;
  };

  const isValidMobile = mobile.replace(/\D/g, '').length === 10;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-3">
            <img src="/mirai-logo.png" alt="Mirai School of Technology Logo" className="h-10 sm:h-12 w-auto object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-outfit text-white">
            {isStudentSelfMode ? 'STUDENT SELF CHECK-IN' : 'RECEPTION TOKEN TERMINAL'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl">
            {isStudentSelfMode
              ? 'Welcome to Mirai! Register your details below to receive your orientation token and view live queue updates.'
              : 'Register new students, generate orientation tokens, and provide ticket receipts for classroom orientation.'}
          </p>
        </div>

        {/* Live Metrics Header Badges & Actions */}
        <div className="relative z-10 flex flex-wrap items-center gap-3.5">

          <div className="bg-slate-900/90 border border-blue-800/60 px-5 py-3 rounded-2xl flex items-center space-x-3 backdrop-blur-md">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">NOW SERVING</p>
              <p className="text-xl font-black text-white font-mono">{currentTokenStr}</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-indigo-800/60 px-5 py-3 rounded-2xl flex items-center space-x-3 backdrop-blur-md">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IN WAITING QUEUE</p>
              <p className="text-xl font-black text-indigo-300 font-mono">{waitingCount} Students</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Registration Wizard (7 cols) + Queue Feed/Search (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
            
            {/* Header Indicator */}
            <div className="flex items-center space-x-3 pb-6 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/30">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student Registration</h3>
                <p className="text-xs text-slate-500 font-medium">Enter candidate name and 10-digit phone number</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3.5 rounded-2xl flex items-start space-x-3 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {duplicateAlert && (
              <div className="mb-6 bg-amber-50 border border-amber-300 text-amber-900 p-5 rounded-2xl space-y-3">
                <div className="flex items-start space-x-3 font-semibold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Mobile number <span className="font-mono font-bold">{duplicateAlert.mobile}</span> is already registered under Token{' '}
                    <span className="font-black text-amber-900 font-mono text-base">{duplicateAlert.existingToken}</span>.
                  </span>
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSubmitRegistration(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    Register Anyway (Admin Override)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateAlert(null)}
                    className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Student Information Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Mobile Number (10-Digit Indian) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-28 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-bold font-mono tracking-wider text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <div className="absolute right-3 top-3">
                    {isValidMobile ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1 rounded-xl flex items-center space-x-1 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">10 digits</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmitRegistration(false)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Ticket className="w-5 h-5" />
                <span>{loading ? 'GENERATING TOKEN...' : 'CONFIRM & ISSUE TOKEN'}</span>
              </button>
            </div>

          </div>

          {/* Generated Digital Ticket Card with Thank You Message */}
          {lastGeneratedToken && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-800/80 relative overflow-hidden space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* THANK YOU BANNER */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 rounded-2xl shadow-lg flex items-center space-x-4 border border-emerald-400/30">
                <div className="p-3 bg-white/20 rounded-2xl text-2xl shrink-0">
                  🎉
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black font-outfit uppercase tracking-tight text-white">
                    THANK YOU, {lastGeneratedToken.studentName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-0.5">
                    Your registration for Mirai Orientation 2026 is confirmed.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-xs uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>REGISTRATION SUCCESSFUL</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(lastGeneratedToken.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* TICKET RECEIPT BODY */}
              <div className="my-4 text-center">
                <p className="text-xs font-black tracking-widest uppercase text-blue-400">YOUR ORIENTATION TOKEN</p>
                <h2 className="text-6xl sm:text-7xl font-black tracking-tight font-mono text-white my-2 text-blue-300 drop-shadow-md">
                  {lastGeneratedToken.token}
                </h2>
                <div className="inline-block bg-blue-900/60 border border-blue-700/60 px-4 py-1.5 rounded-full text-xs font-extrabold text-blue-200 mt-1 uppercase tracking-wider">
                  STATUS: WAITING IN QUEUE
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-2.5 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Student Name:</span>
                  <span className="font-bold text-white">{lastGeneratedToken.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Registered Mobile:</span>
                  <span className="font-mono text-slate-200 font-semibold">{maskMobile(lastGeneratedToken.mobile)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Academic Program:</span>
                  <span className="font-semibold text-blue-300">{lastGeneratedToken.course}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-300 bg-slate-800/80 py-3 px-4 rounded-2xl border border-slate-700 flex-1">
                  📢 Please take a seat in the waiting lounge and watch the Smartboard for your token announcement.
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Student Search & Recent Queue Feed (Hidden on mobile screens, shown on desktop) */}
        <div className="hidden lg:block lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2.5 mb-4">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Student Token Directory</h3>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by Token (e.g. A-007), Name, Mobile..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {/* List Feed */}
            <div className="mt-4 space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {recentTokens.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No matching student records found.</p>
              ) : (
                recentTokens.map((t) => (
                  <div
                    key={t._id}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-2xl transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-blue-700 text-base">{t.token}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg ${
                            t.status === 'WAITING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : t.status === 'CALLED' || t.status === 'PROCESSING'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : t.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {t.status} {t.tableNumber ? `(TABLE ${t.tableNumber})` : ''}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">{t.studentName}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{maskMobile(t.mobile)}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { IToken, QueueStats, TokenStatus } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import {
  SlidersHorizontal,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Volume2,
  Check,
  Ban,
  Search,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Plus,
  Minus,
  Settings2,
  Trash2,
} from 'lucide-react';

export const ManagementPage: React.FC = () => {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    onHold: 0,
    completed: 0,
    skipped: 0,
    tableCount: 4,
    tables: { 1: [], 2: [], 3: [], 4: [] },
  });

  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [tokens, setTokens] = useState<IToken[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [isEditingTables, setIsEditingTables] = useState(false);
  const [editingTableNames, setEditingTableNames] = useState<Record<number, string>>({});
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueueData = async () => {
    try {
      const [statsRes, tokensRes] = await Promise.all([
        api.getStats(),
        api.getTokens(searchQuery, statusFilter),
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (tokensRes.success) setTokens(tokensRes.tokens);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueueData();

    const socket = getSocket();
    const handleUpdate = () => fetchQueueData();

    socket.on('queue:updated', handleUpdate);
    socket.on('token:created', handleUpdate);
    socket.on('token:updated', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('token:created', handleUpdate);
      socket.off('token:updated', handleUpdate);
    };
  }, [searchQuery, statusFilter]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleUpdateTableCount = async (newCount: number) => {
    if (newCount < 1 || newCount > 20) return;
    setLoading(true);
    try {
      const res = await api.updateTableCount(newCount);
      if (res.success) {
        showFeedback('success', `Orientation tables updated to ${newCount} tables.`);
        if (selectedTable > newCount) {
          setSelectedTable(1);
        }
      } else {
        showFeedback('error', res.message || 'Failed to update table count');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error updating tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTableName = async (tableNum: number, name: string) => {
    setLoading(true);
    try {
      const res = await api.updateTableName(tableNum, name);
      if (res.success) {
        showFeedback('success', res.message);
      } else {
        showFeedback('error', res.message || 'Failed to update table name');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error updating table name');
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async (tableNum?: number) => {
    const targetTable = tableNum || selectedTable;
    setLoading(true);
    try {
      const res = await api.callNext(targetTable);
      if (res.success && res.token) {
        showFeedback('success', `Called Token ${res.token.token} to Table ${targetTable}`);
      } else {
        showFeedback('error', res.message || 'Unable to call next student');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error executing Call Next');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (tokenStr: string, status: TokenStatus, tableNum?: number) => {
    try {
      const res = await api.updateStatus(tokenStr, status, tableNum);
      if (res.success) {
        showFeedback('success', res.message);
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleRecall = async (tokenStr: string) => {
    try {
      const res = await api.recallToken(tokenStr);
      if (res.success) {
        showFeedback('success', `Re-announced Token ${tokenStr} on Smartboard`);
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const maskMobile = (num: string) => {
    if (!num || num.length < 10) return num;
    return `${num.slice(0, 3)}****${num.slice(7)}`;
  };

  const activeTableKeys = Object.keys(stats.tables).map(Number);
  const tableCount = stats.tableCount || Math.max(4, ...activeTableKeys, 1);
  const tableList = Array.from({ length: tableCount }, (_, i) => i + 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 font-outfit flex items-center space-x-3">
            <span>ORIENTATION CONTROL ROOM</span>
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time live queue management & table assignment control
          </p>
        </div>

        {/* Global Feedback Banner */}
        {actionMessage && (
          <div
            className={`mt-4 md:mt-0 px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-sm ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">TOTAL</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1.5">{stats.total}</p>
        </div>

        <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider">WAITING</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 font-mono mt-1.5">{stats.waiting}</p>
        </div>

        <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-blue-700 tracking-wider">PROCESSING</span>
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 font-mono mt-1.5">{stats.processing}</p>
        </div>

        <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-purple-700 tracking-wider">AT ACCOUNTS</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900 font-mono mt-1.5">{stats.onHold || 0}</p>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-700 tracking-wider">COMPLETED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 font-mono mt-1.5">{stats.completed}</p>
        </div>

        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">SKIPPED</span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-700 font-mono mt-1.5">{stats.skipped}</p>
        </div>
      </div>

      {/* Table Capacity Cards Section with Add/Edit Table feature */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-slate-900 font-outfit">
                ORIENTATION TABLES ({tableCount} ACTIVE)
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                MAX 2 SEATS / TABLE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select a table & click Call Next, or add new tables dynamically as needed.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={loading || tableCount >= 20}
              onClick={() => handleUpdateTableCount(tableCount + 1)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all"
              title="Add another orientation table"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table {tableCount + 1}</span>
            </button>

            <button
              onClick={() => setIsEditingTables(!isEditingTables)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                isEditingTables
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>{isEditingTables ? 'Done Editing' : 'Edit Tables'}</span>
            </button>
          </div>
        </div>

        {/* Table Counter Toolbar when Edit Mode is active */}
        {isEditingTables && (
          <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                Total Tables Count:
              </span>
              <div className="flex items-center space-x-1 bg-white border border-amber-300 rounded-xl p-1 shadow-sm">
                <button
                  disabled={tableCount <= 1 || loading}
                  onClick={() => handleUpdateTableCount(Math.max(1, tableCount - 1))}
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold disabled:opacity-40"
                  title="Remove last table"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono font-black text-sm text-slate-900">{tableCount}</span>
                <button
                  disabled={tableCount >= 20 || loading}
                  onClick={() => handleUpdateTableCount(Math.min(20, tableCount + 1))}
                  className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-40"
                  title="Add new table"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-amber-800 font-medium">
              💡 Use <strong>Add Table</strong> or counter to adjust tables count. Type in the <strong>Dedicated Name</strong> box (e.g. Maker Table) to label or clear a table's part.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tableList.map((tbl) => {
            const tableTokens = stats.tables[tbl] || [];
            const isFull = tableTokens.length >= 2;
            const isSelected = selectedTable === tbl;
            const tableName = stats.tableNames?.[tbl];

            return (
              <div
                key={tbl}
                onClick={() => setSelectedTable(tbl)}
                className={`cursor-pointer bg-white rounded-2xl p-5 border-2 transition-all relative ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-lg text-slate-900 font-outfit">TABLE {tbl}</span>
                      {isSelected && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {tableName && (
                      <span className="inline-block mt-1 text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md truncate max-w-[170px]">
                        📌 {tableName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isFull
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                          : tableTokens.length === 1
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {tableTokens.length} / 2 {isFull ? 'FULL' : 'SEATS'}
                    </span>

                    {/* Delete button if in edit mode & table is empty */}
                    {isEditingTables && tableTokens.length === 0 && tableCount > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateTableCount(tableCount - 1);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={`Remove Table ${tbl}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Dedicated Table Name Editor when Edit Mode is active */}
                {isEditingTables && (
                  <div
                    className="mt-3 pt-2 border-t border-slate-100 flex items-center space-x-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      placeholder={`Part / Name (e.g. Maker Table)...`}
                      value={editingTableNames[tbl] !== undefined ? editingTableNames[tbl] : (tableName || '')}
                      onChange={(e) => setEditingTableNames({ ...editingTableNames, [tbl]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTableName(
                            tbl,
                            editingTableNames[tbl] !== undefined ? editingTableNames[tbl] : (tableName || '')
                          );
                        }
                      }}
                      className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 font-semibold text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      onClick={() =>
                        handleSaveTableName(
                          tbl,
                          editingTableNames[tbl] !== undefined ? editingTableNames[tbl] : (tableName || '')
                        )
                      }
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                      title="Save table dedicated name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    {(tableName || editingTableNames[tbl]) && (
                      <button
                        onClick={() => {
                          setEditingTableNames({ ...editingTableNames, [tbl]: '' });
                          handleSaveTableName(tbl, '');
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold"
                        title="Remove dedicated name"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Assigned Tokens at Table */}
                <div className="my-4 space-y-2.5 min-h-[96px]">
                  {tableTokens.length === 0 ? (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                      Table Empty
                    </div>
                  ) : (
                    tableTokens.map((t) => (
                      <div
                        key={t._id}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-black text-blue-700 text-sm block">{t.token}</span>
                          <span className="text-xs font-medium text-slate-800 block truncate max-w-[130px]">
                            {t.studentName}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {t.status === 'CALLED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(t.token, 'PROCESSING');
                              }}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                              title="Start Processing"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(t.token, 'COMPLETED');
                            }}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                            title="Complete Registration"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecall(t.token);
                            }}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                            title="Re-announce Token"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Call Next Button for this Table */}
                <button
                  disabled={isFull || loading || stats.waiting === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCallNext(tbl);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all ${
                    isFull
                      ? 'bg-slate-100 text-rose-500 cursor-not-allowed border border-rose-200 font-bold'
                      : stats.waiting === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  {isFull ? (
                    <span>TABLE FULL</span>
                  ) : (
                    <>
                      <span>CALL NEXT TO TABLE {tbl}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Queue Controls & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <h3 className="text-base font-bold text-slate-900">Student Queue List</h3>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {tokens.length} Students
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search token, name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-44 py-2 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">Waiting</option>
              <option value="CALLED">Called</option>
              <option value="PROCESSING">Processing</option>
              <option value="ON_HOLD">At Accounts (Hold)</option>
              <option value="COMPLETED">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-3.5">Token</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Mobile</th>
                <th className="px-6 py-3.5">Course</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Assigned Table</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No tokens found in current queue session.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-black text-blue-700 text-base">{t.token}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{t.studentName}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{maskMobile(t.mobile)}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{t.course || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          t.status === 'WAITING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : t.status === 'CALLED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                            : t.status === 'PROCESSING'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : t.status === 'ON_HOLD'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold'
                            : t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {t.status === 'ON_HOLD' ? 'AT ACCOUNTS' : t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {t.tableNumber ? (
                        <span className="bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg font-mono">
                          TABLE {t.tableNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {t.status === 'CALLED' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'PROCESSING')}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'ON_HOLD')}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                              title="Send student to Accounts Office for fee payment"
                            >
                              Accounts
                            </button>
                            <button
                              onClick={() => handleRecall(t.token)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium"
                            >
                              Recall
                            </button>
                          </>
                        )}

                        {t.status === 'PROCESSING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'ON_HOLD')}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                              title="Send student to Accounts Office for fee payment"
                            >
                              Accounts
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'COMPLETED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Complete
                            </button>
                          </>
                        )}

                        {t.status === 'ON_HOLD' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'PROCESSING', t.tableNumber || selectedTable)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                              title={`Student returned — Resume at Table ${t.tableNumber || selectedTable}`}
                            >
                              Resume → T{t.tableNumber || selectedTable}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(t.token, 'COMPLETED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Complete
                            </button>
                          </>
                        )}

                        {t.status === 'WAITING' && (
                          <button
                            onClick={() => handleUpdateStatus(t.token, 'CALLED', selectedTable)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Call to T{selectedTable}
                          </button>
                        )}

                        {(t.status === 'WAITING' || t.status === 'CALLED' || t.status === 'PROCESSING') && (
                          <button
                            onClick={() => handleUpdateStatus(t.token, 'SKIPPED')}
                            className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                            title="Skip student"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

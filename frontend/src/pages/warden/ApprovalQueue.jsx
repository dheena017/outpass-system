import { useState, useEffect, useRef } from 'react';
import { outpassAPI } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
import Loading from '../../components/Loading';
import { FiCheck, FiX, FiRefreshCw, FiCheckSquare, FiSquare, FiMinusSquare, FiSearch, FiAlertCircle, FiCalendar, FiClock } from 'react-icons/fi';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';

export default function ApprovalQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [wardenNotes, setWardenNotes] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // null = bulk, else single id
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchPendingRequests(true); // silent refresh
      }, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const fetchPendingRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await outpassAPI.getPendingRequests();
      setRequests(response.data);
      if (!silent) setSelectedIds(new Set()); // clear selection on manual refresh
      setError('');
    } catch (err) {
      if (!silent) {
        const errorMsg = err.response?.data?.detail || 'Failed to fetch requests';
        setError(errorMsg);
        toastService.error(errorMsg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── Single actions ──
  const handleApprove = async (requestId) => {
    const notes = prompt('Add a note (optional):') || '';
    setActionLoading(requestId);
    try {
      await outpassAPI.approveRequest(requestId, notes);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(requestId); return n; });
      toastService.success('✅ Request approved');
    } catch (err) {
      toastService.error(getErrorMessage(err, 'UPDATE_REQUEST'));
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (targetId) => {
    setRejectTarget(targetId); // null = bulk
    setRejectReason('');
    setWardenNotes('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toastService.error('Please enter a rejection reason');
      return;
    }
    setRejectModalOpen(false);

    if (rejectTarget !== null) {
      // Single reject
      setActionLoading(rejectTarget);
      try {
        await outpassAPI.rejectRequest(rejectTarget, rejectReason, wardenNotes);
        setRequests(prev => prev.filter(r => r.id !== rejectTarget));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(rejectTarget); return n; });
        toastService.success('❌ Request rejected');
      } catch (err) {
        toastService.error(getErrorMessage(err, 'UPDATE_REQUEST'));
      } finally {
        setActionLoading(null);
      }
    } else {
      // Bulk reject
      await executeBulkAction('rejected', rejectReason);
    }
    setRejectReason('');
    setWardenNotes('');
  };

  // ── Bulk actions ──
  const executeBulkAction = async (action, rejectionReason = '') => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      const res = await outpassAPI.bulkAction(ids, action, rejectionReason);
      const { success, failed } = res.data;
      setRequests(prev => prev.filter(r => !success.includes(r.id)));
      setSelectedIds(new Set());
      const verb = action === 'approved' ? 'approved' : 'rejected';
      toastService.success(`✅ ${success.length} request(s) ${verb}${failed.length ? `, ${failed.length} failed` : ''}`);
    } catch (err) {
      toastService.error(getErrorMessage(err, 'UPDATE_REQUEST'));
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Selection helpers ──
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const allSelected = requests.length > 0 && selectedIds.size === requests.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < requests.length;

  // Search filter
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (r.student_name || '').toLowerCase();
    const sid = (r.student_id || '').toLowerCase();
    const dest = (r.destination || '').toLowerCase();
    const reason = (r.reason || '').toLowerCase();
    return name.includes(q) || sid.includes(q) || dest.includes(q) || reason.includes(q);
  });

  if (loading) return <Loading message="Loading pending requests..." />;

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in group/main">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-widest mb-2">
            <FiCheckSquare size={14} /> Admin Panel
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Approval Queue
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''} awaiting your review
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-secondary flex items-center gap-2 group/auto ${autoRefresh
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
              : ''}`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-400'}`} />
            <span className="font-bold text-sm tracking-wide">{autoRefresh ? 'Auto Sync' : 'Paused'}</span>
          </button>

          <button
            onClick={() => fetchPendingRequests()}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} size={18} />
            <span className="font-bold text-sm tracking-wide">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="premium-card glass p-2 max-w-2xl border-white/20">
        <div className="relative group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, ID, or destination..."
            className="w-full pr-4 py-3 bg-white/50 dark:bg-white/5 border-transparent focus:border-indigo-500/30 rounded-xl focus:outline-none focus:ring-0 transition-all font-bold text-sm text-gray-700 dark:text-gray-200"
            style={{ paddingLeft: '3rem' }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg shadow-rose-500/10">
          <FiAlertCircle size={20} className="shrink-0" />
          <span className="font-bold text-sm tracking-wide">{error}</span>
          <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-rose-500/20 rounded-lg">
            <FiX size={16} />
          </button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="premium-card glass p-20 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <FiCheck size={48} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Clear!</h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">No new outpass requests discovered. Enjoy the peace and quiet while it lasts!</p>
        </div>
      ) : (
        <>
          {/* ── Bulk Action Toolbar ── */}
          <div className={`sticky top-2 z-30 premium-card p-3 flex flex-wrap items-center justify-between gap-4 transition-all duration-500 ${selectedIds.size > 0
            ? 'glass bg-indigo-600 border-indigo-500/50 shadow-2xl scale-[1.02]'
            : 'bg-white/80 dark:bg-slate-900/80'
            }`}>
            <button
              onClick={toggleSelectAll}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-bold text-sm tracking-widest uppercase ${selectedIds.size > 0 ? 'text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              {allSelected
                ? <FiCheckSquare size={22} className={selectedIds.size > 0 ? 'text-white' : 'text-indigo-600'} />
                : someSelected
                  ? <FiMinusSquare size={22} className={selectedIds.size > 0 ? 'text-white/80' : 'text-indigo-400'} />
                  : <FiSquare size={22} />}
              <span>{allSelected ? 'Clear' : 'Select All'}</span>
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 animate-slide-up">
                <span className="hidden sm:inline-block px-4 py-2 bg-white/20 text-white rounded-xl text-xs font-black tracking-tighter">
                  {selectedIds.size} SELECTED
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeBulkAction('approved')}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-white text-indigo-600 hover:bg-emerald-50 dark:hover:bg-gray-100 px-6 py-2.5 rounded-xl text-sm font-black shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    <FiCheck size={18} />
                    {bulkLoading ? 'Wait...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => openRejectModal(null)}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500 text-white border border-white/20 px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    <FiX size={18} />
                    {bulkLoading ? 'Wait...' : 'Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Request Cards ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
            {filteredRequests.map((request) => {
              const isSelected = selectedIds.has(request.id);
              return (
                <div
                  key={request.id}
                  onClick={() => toggleSelect(request.id)}
                  className={`premium-card glass p-6 cursor-pointer transition-all duration-500 group/card relative overflow-hidden flex flex-col gap-6 ${isSelected
                    ? 'ring-2 ring-indigo-500/50 bg-indigo-500/5 shadow-2xl scale-[1.01]'
                    : 'hover:shadow-xl hover:border-indigo-500/30'
                    }`}
                >
                  {/* Student Identity Section */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 transition-transform group-active/card:scale-90" onClick={e => { e.stopPropagation(); toggleSelect(request.id); }}>
                        {isSelected
                          ? <FiCheckSquare size={26} className="text-indigo-600 dark:text-indigo-400" />
                          : <FiSquare size={26} className="text-gray-300 dark:text-gray-600 group-hover/card:text-indigo-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                            {request.destination}
                          </h2>
                          <div className="shrink-0"><StatusBadge status={request.status} /></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{request.student_name}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                          <span className="text-xs font-bold text-gray-500 uppercase">ID: {request.student_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed italic border-l-2 border-indigo-500/20 pl-4 py-1">
                    &quot;{request.reason}&quot;
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 group/time">
                      <span className="flex items-center gap-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] mb-2 group-hover/time:text-indigo-500 transition-colors">
                        <FiCalendar size={14} /> Departure
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block text-sm">
                        {new Date(request.departure_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 group/time">
                      <span className="flex items-center gap-2 font-bold text-gray-400 uppercase tracking-widest text-[10px] mb-2 group-hover/time:text-indigo-500 transition-colors">
                        <FiClock size={14} /> Return
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block text-sm">
                        {new Date(request.expected_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-auto pt-6 border-t border-gray-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex-1 btn-primary py-3 hover:scale-105 active:scale-95 group/btn"
                    >
                      <FiCheck size={18} className="group-hover/btn:rotate-12 transition-transform" />
                      {actionLoading === request.id ? 'Wait...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => openRejectModal(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex-1 btn-secondary py-3 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white"
                    >
                      <FiX size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setRejectModalOpen(false)}></div>
          <div className="relative w-full max-w-lg premium-card glass bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-2xl animate-zoom-in border-white/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[80px] -mr-16 -mt-16"></div>

            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-500">
                <FiX size={24} />
              </div>
              {rejectTarget === null ? 'Bulk Rejection' : 'Reject Outpass'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
              A reason is required to notify the {rejectTarget === null ? 'students' : 'student'} about your decision.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-rose-500 uppercase tracking-widest ml-1">Official Reason</label>
                <div className="relative group">
                  <FiAlertCircle className="absolute left-4 top-4 text-rose-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" size={18} />
                  <textarea
                    autoFocus
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Exam period, missing documents..."
                    rows={3}
                    className="input-field border-rose-500/20 focus:border-rose-500 focus:ring-rose-500/20 h-32 resize-none pt-3"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Internal Note (Warden only)</label>
                <div className="relative group">
                  <FiSearch className="absolute left-4 top-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                  <textarea
                    value={wardenNotes}
                    onChange={e => setWardenNotes(e.target.value)}
                    placeholder="Private records for office use..."
                    rows={2}
                    className="input-field h-24 resize-none text-sm italic pt-3"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-4 mt-10">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="btn-secondary flex-1 py-4 text-gray-600"
              >
                Go Back
              </button>
              <button
                onClick={handleRejectConfirm}
                className="btn-primary flex-1 py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-500/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

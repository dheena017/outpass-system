import { useState, useEffect, useRef } from 'react';
import { outpassAPI } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
import Loading from '../../components/Loading';
import { FiCheck, FiX, FiRefreshCw, FiCheckSquare, FiSquare, FiMinusSquare, FiSearch } from 'react-icons/fi';
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
    <div className="min-h-[calc(100vh-theme(spacing.16))] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Approval Queue</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''} to review
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-all active:scale-95 shadow-sm font-bold ${autoRefresh
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {autoRefresh ? 'Auto' : 'Paused'}
          </button>
          <button
            onClick={() => fetchPendingRequests()}
            disabled={loading}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative mb-8 group">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, ID, destination, or reason..."
          className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white placeholder-gray-400 font-medium"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
            <FiCheck size={40} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white mb-2">All caught up!</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">There are no pending requests to review right now.</p>
        </div>
      ) : (
        <>
          {/* ── Bulk Action Toolbar ── */}
          <div className={`flex flex-wrap items-center gap-3 px-5 py-4 rounded-xl mb-6 backdrop-blur-md border transition-all duration-300 ${selectedIds.size > 0
            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-sm'
            : 'bg-gray-50/80 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
            {/* Select-all checkbox */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition ml-1"
            >
              {allSelected
                ? <FiCheckSquare size={22} className="text-indigo-600 dark:text-indigo-400" />
                : someSelected
                  ? <FiMinusSquare size={22} className="text-indigo-400 dark:text-indigo-500" />
                  : <FiSquare size={22} />}
              <span className="text-sm font-bold tracking-wide">
                {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-indigo-700 dark:text-indigo-300 font-extrabold ml-4 px-3 py-1 bg-indigo-500/20 rounded-full hidden sm:inline-block">
                  {selectedIds.size} SELECTED
                </span>
                <div className="flex items-center gap-3 ml-auto w-full sm:w-auto mt-3 sm:mt-0">
                  <button
                    onClick={() => executeBulkAction('approved')}
                    disabled={bulkLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                  >
                    <FiCheck size={18} />
                    {bulkLoading ? 'Processing...' : `Approve ${selectedIds.size}`}
                  </button>
                  <button
                    onClick={() => openRejectModal(null)}
                    disabled={bulkLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 focus:ring-4 focus:ring-rose-500/30 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                  >
                    <FiX size={18} />
                    {bulkLoading ? 'Processing...' : `Reject ${selectedIds.size}`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Request Cards ── */}
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const isSelected = selectedIds.has(request.id);
              return (
                <div
                  key={request.id}
                  onClick={() => toggleSelect(request.id)}
                  className={`relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 cursor-pointer transition-all duration-300 border shadow-sm hover:shadow-xl hover:-translate-y-1 ${isSelected
                    ? 'border-indigo-400 dark:border-indigo-500 shadow-indigo-500/10'
                    : 'border-gray-200/50 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-blue-500"></div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-6 gap-4">
                    {/* Checkbox */}
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0 transition-transform active:scale-90" onClick={e => { e.stopPropagation(); toggleSelect(request.id); }}>
                        {isSelected
                          ? <FiCheckSquare size={24} className="text-indigo-600 dark:text-indigo-400" />
                          : <FiSquare size={24} className="text-gray-400 dark:text-gray-500 hover:text-indigo-400" />}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight mb-1">{request.destination}</h2>
                        <p className="text-gray-600 dark:text-gray-300 font-medium line-clamp-2 md:line-clamp-none mb-2">{request.reason}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                          <span className="text-indigo-600 dark:text-indigo-400">ID: {request.student_id}</span> <span className="mx-2 opacity-50">|</span> Submitted {new Date(request.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="self-end sm:self-auto ml-10 sm:ml-0">
                      <StatusBadge status={request.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6 ml-10">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 flex flex-col">
                      <span className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Departure</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(request.departure_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 flex flex-col">
                      <span className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Expected Return</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(request.expected_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  {/* Individual action buttons — stop propagation so clicking them doesn't toggle checkbox */}
                  <div className="flex flex-wrap gap-3 ml-10" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                    >
                      <FiCheck size={18} />
                      {actionLoading === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => openRejectModal(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 focus:ring-4 focus:ring-rose-500/30 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
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
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-4 animate-zoom-in border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              {rejectTarget === null
                ? `Reject ${selectedIds.size} request(s)`
                : 'Reject Request'}
            </h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
              Please provide a reason. This will be visible to the student.
            </p>

            <div className="space-y-4">
              <div className="group">
                <textarea
                  autoFocus
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Insufficient reason provided, exam period..."
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 resize-none transition-all shadow-sm placeholder-gray-400 dark:text-white"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Private Note (Warden Only)</label>
                <textarea
                  value={wardenNotes}
                  onChange={e => setWardenNotes(e.target.value)}
                  placeholder="e.g. Repeated offender, contact parent..."
                  rows={2}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none transition-all shadow-sm placeholder-gray-400 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg shadow-rose-500/25 px-4 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

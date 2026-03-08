import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
import Loading from '../../components/Loading';
import { FiCheck, FiX, FiRefreshCw, FiCheckSquare, FiSquare, FiMinusSquare } from 'react-icons/fi';
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

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await outpassAPI.getPendingRequests();
      setRequests(response.data);
      setSelectedIds(new Set()); // clear selection on refresh
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch requests';
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setLoading(false);
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

  if (loading) return <Loading message="Loading pending requests..." />;

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-600 font-medium">No pending requests</p>
        </div>
      ) : (
        <>
          {/* ── Bulk Action Toolbar ── */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-4 border transition-all ${selectedIds.size > 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
            }`}>
            {/* Select-all checkbox */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
            >
              {allSelected
                ? <FiCheckSquare size={20} className="text-blue-600" />
                : someSelected
                  ? <FiMinusSquare size={20} className="text-blue-400" />
                  : <FiSquare size={20} />}
              <span className="text-sm font-medium">
                {allSelected ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-blue-700 font-semibold ml-2">
                  {selectedIds.size} selected
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => executeBulkAction('approved')}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    <FiCheck />
                    {bulkLoading ? 'Processing...' : `Approve ${selectedIds.size}`}
                  </button>
                  <button
                    onClick={() => openRejectModal(null)}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    <FiX />
                    {bulkLoading ? 'Processing...' : `Reject ${selectedIds.size}`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Request Cards ── */}
          <div className="space-y-4">
            {requests.map((request) => {
              const isSelected = selectedIds.has(request.id);
              return (
                <div
                  key={request.id}
                  onClick={() => toggleSelect(request.id)}
                  className={`bg-white rounded-lg shadow p-6 cursor-pointer transition border-2 ${isSelected
                    ? 'border-blue-400 bg-blue-50 shadow-md'
                    : 'border-transparent hover:shadow-lg hover:border-gray-200'
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    {/* Checkbox */}
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0" onClick={e => { e.stopPropagation(); toggleSelect(request.id); }}>
                        {isSelected
                          ? <FiCheckSquare size={20} className="text-blue-600" />
                          : <FiSquare size={20} className="text-gray-400" />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{request.destination}</h2>
                        <p className="text-gray-600 text-sm mb-1">{request.reason}</p>
                        <p className="text-gray-400 text-xs">
                          Student ID: {request.student_id} &nbsp;|&nbsp; Submitted: {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4 ml-9">
                    <div><span className="font-semibold">Departure:</span>{' '}{new Date(request.departure_time).toLocaleString()}</div>
                    <div><span className="font-semibold">Expected Return:</span>{' '}{new Date(request.expected_return_time).toLocaleString()}</div>
                  </div>

                  {/* Individual action buttons — stop propagation so clicking them doesn't toggle checkbox */}
                  <div className="flex gap-3 ml-9" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      <FiCheck />
                      {actionLoading === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => openRejectModal(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      <FiX />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              {rejectTarget === null
                ? `Reject ${selectedIds.size} request(s)`
                : 'Reject Request'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason so the student knows why.
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient reason provided, exam period..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <label className="block text-xs text-gray-500 mt-3 mb-1">Private Note (optional — only visible to wardens)</label>
            <textarea
              value={wardenNotes}
              onChange={e => setWardenNotes(e.target.value)}
              placeholder="e.g. Repeated offender, contact parent, etc."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none bg-gray-50"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRejectConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
import Loading from '../../components/Loading';
import { FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';

export default function ApprovalQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await outpassAPI.getPendingRequests();
      setRequests(response.data);
      toastService.info(`Found ${response.data.length} pending requests`);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch requests';
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await outpassAPI.approveRequest(requestId, {});
      setRequests((prev) =>
        prev.filter((r) => r.id !== requestId)
      );
      toastService.success('✅ Request approved successfully');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'UPDATE_REQUEST');
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId, reason) => {
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason) return;

    setActionLoading(requestId);
    try {
      await outpassAPI.rejectRequest(requestId, rejectionReason);
      setRequests((prev) =>
        prev.filter((r) => r.id !== requestId)
      );
      toastService.success('❌ Request rejected successfully');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'UPDATE_REQUEST');
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <Loading message="Loading pending requests..." />;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Approval Queue</h1>
        <button
          onClick={fetchPendingRequests}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800">
                    {request.destination}
                  </h2>
                  <p className="text-gray-600 text-sm mb-2">{request.reason}</p>
                  <p className="text-gray-500 text-xs">
                    Student ID: {request.student_id} | Created:{' '}
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div>
                  <span className="font-semibold">Departure:</span>{' '}
                  {new Date(request.departure_time).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">Expected Return:</span>{' '}
                  {new Date(request.expected_return_time).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg transition"
                >
                  <FiCheck /> Approve
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={actionLoading === request.id}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition"
                >
                  <FiX /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

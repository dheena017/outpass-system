import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store';
import StatusBadge from '../../components/StatusBadge';
import LocationTracker from '../../components/LocationTracker';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiPlay, FiX, FiCheckCircle, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';

export default function RequestStatus() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await outpassAPI.getStudentRequests();
      setRequests(response.data);
      toastService.info(`Loaded ${response.data.length} requests`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    setActionLoading(requestId);
    try {
      await outpassAPI.updateRequestStatus(requestId, newStatus);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: newStatus } : r
        )
      );
      toastService.success(`Status updated to ${newStatus}!`);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'UPDATE_REQUEST');
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  // Get the active request (if any)
  const activeRequest = requests.find((r) => r.status === 'active');

  // Status transition rules
  const getAvailableActions = (status) => {
    const transitions = {
      pending: [],
      approved: [{ status: 'active', label: 'Start Outpass', icon: FiPlay, color: 'blue' }],
      active: [{ status: 'closed', label: 'Mark as Returned', icon: FiCheckCircle, color: 'green' }],
      rejected: [],
      closed: [],
      expired: [],
    };
    return transitions[status] || [];
  };

  // Calculate analytics metrics
  const calculateMetrics = () => {
    const total = requests.length;
    const approved = requests.filter((r) => r.status === 'approved' || r.status === 'active' || r.status === 'closed').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Calculate average duration for closed requests
    let totalDuration = 0;
    let closedCount = 0;
    requests.forEach((r) => {
      if (r.status === 'closed' && r.expected_return_time) {
        const departure = new Date(r.departure_time);
        const returnTime = new Date(r.expected_return_time);
        const duration = (returnTime - departure) / (1000 * 60 * 60); // in hours
        totalDuration += duration;
        closedCount++;
      }
    });
    const averageDuration = closedCount > 0 ? Math.round(totalDuration / closedCount) : 0;

    return { total, approved, rejected, approvalRate, averageDuration };
  };

  // Filter and sort requests
  const getFilteredAndSortedRequests = () => {
    let filtered = requests;

    // Apply filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.departure_time) - new Date(a.departure_time);
        case 'date-asc':
          return new Date(a.departure_time) - new Date(b.departure_time);
        case 'destination':
          return a.destination.localeCompare(b.destination);
        default:
          return 0;
      }
    });

    return sorted;
  };

  const metrics = calculateMetrics();
  const filteredRequests = getFilteredAndSortedRequests();

    if (loading) {
      return <Loading message="Loading your requests..." />;
    }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Outpass Requests</h1>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Analytics Stats Cards */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.total}</p>
              </div>
              <FiCheckCircle className="text-blue-300" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approval Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{metrics.approvalRate}%</p>
              </div>
              <FiTrendingUp className="text-green-300" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Duration</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{metrics.averageDuration}h</p>
              </div>
              <FiCalendar className="text-purple-300" size={40} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{metrics.rejected}</p>
              </div>
              <FiX className="text-orange-300" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* Location Tracker for active request */}
      {activeRequest && (
        <div className="mb-8">
          <LocationTracker 
            activeRequestId={activeRequest.id} 
            requestData={activeRequest}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No outpass requests yet</p>
          <a
            href="/student/request"
            className="text-blue-500 hover:underline font-semibold"
          >
            Create your first request
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter and Sort Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="destination">Destination (A-Z)</option>
              </select>
            </div>

            <div className="flex-1 flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSortBy('date-desc');
                }}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
          {filteredRequests.map((request) => {
            const availableActions = getAvailableActions(request.status);
            return (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {request.destination}
                    </h2>
                    <p className="text-gray-600 text-sm">{request.reason}</p>
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

                {request.rejection_reason && (
                  <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-sm text-red-700">
                      <span className="font-semibold">Rejection Reason:</span>{' '}
                      {request.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {availableActions.length > 0 && (
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    {availableActions.map((action) => {
                      const IconComponent = action.icon;
                      const colorClasses = {
                        blue: 'bg-blue-500 hover:bg-blue-600',
                        green: 'bg-green-500 hover:bg-green-600',
                        orange: 'bg-orange-500 hover:bg-orange-600',
                      };
                      return (
                        <button
                          key={action.status}
                          onClick={() => handleStatusUpdate(request.id, action.status)}
                          disabled={actionLoading === request.id}
                          className={`flex items-center gap-2 ${colorClasses[action.color]} disabled:opacity-50 text-white px-4 py-2 rounded-lg transition`}
                        >
                          <IconComponent size={16} />
                          {actionLoading === request.id ? 'Updating...' : action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredRequests.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">
                No requests found for the selected filters. Try adjusting your filters or{' '}
                <a href="/student/request" className="text-blue-500 hover:underline font-semibold">
                  create a new request
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

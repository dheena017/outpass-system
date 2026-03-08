import { useState, useEffect, useRef } from 'react';
import { outpassAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store';
import StatusBadge from '../../components/StatusBadge';
import LocationTracker from '../../components/LocationTracker';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiPlay, FiX, FiCheckCircle, FiTrendingUp, FiCalendar, FiBell, FiList, FiClock, FiAlertCircle } from 'react-icons/fi';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';

export default function RequestStatus() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'timeline'
  const [notifEnabled, setNotifEnabled] = useState(Notification.permission === 'granted');
  const { user } = useAuthStore();
  const prevStatusRef = useRef({}); // track previous statuses for change detection

  useEffect(() => {
    fetchRequests();
  }, [user]);

  // Poll for status changes every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await outpassAPI.getStudentRequests();
        const fresh = response.data;
        // Check for status changes
        fresh.forEach((req) => {
          const prev = prevStatusRef.current[req.id];
          if (prev && prev !== req.status) {
            sendNotification(req);
          }
          prevStatusRef.current[req.id] = req.status;
        });
        setRequests(fresh);
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifEnabled(perm === 'granted');
    }
  };

  const sendNotification = (req) => {
    if (Notification.permission !== 'granted') return;
    const msgs = {
      approved: `✅ Your outpass to ${req.destination} was approved!`,
      rejected: `❌ Your outpass to ${req.destination} was rejected.`,
      expired: `⏰ Your outpass to ${req.destination} has expired.`,
    };
    const body = msgs[req.status] || `Outpass status changed to ${req.status}`;
    new Notification('Outpass Update', { body, icon: '/vite.svg' });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await outpassAPI.getStudentRequests();
      setRequests(response.data);
      // Initialize status tracking for notifications
      response.data.forEach((r) => { prevStatusRef.current[r.id] = r.status; });
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
      // Refresh requests from server to get accurate actual_return_time etc.
      const fresh = await outpassAPI.getStudentRequests();
      setRequests(fresh.data);
      const successMessages = {
        active: '🚶 Outpass started! Safe travels!',
        closed: '🏠 Marked as returned. Welcome back!',
      };
      toastService.success(successMessages[newStatus] || `Status updated to ${newStatus}!`);
    } catch (err) {
      const errDetail = err.response?.data?.detail || '';
      // Surface the backend's friendly validation messages
      const friendlyMsg =
        errDetail === 'Cannot start outpass before departure time'
          ? "⏰ Your outpass hasn't started yet! You can only activate it on or after the departure date."
          : errDetail === 'Cannot return before departure time'
            ? "⏰ You can't return before you've even left! Wait until the departure date."
            : getErrorMessage(err, 'UPDATE_REQUEST');
      setError(friendlyMsg);
      toastService.error(friendlyMsg);
    } finally {
      setActionLoading(null);
    }
  };

  // Get the active request (if any)
  const activeRequest = requests.find((r) => r.status === 'active');

  // Status transition rules — takes full request object to check departure time
  const getAvailableActions = (request) => {
    const { status, departure_time } = request;
    const now = new Date();
    const departure = departure_time ? new Date(departure_time) : null;
    const isBeforeDeparture = departure && now < departure;

    const transitions = {
      pending: [],
      approved: [{
        status: 'active',
        label: 'Start Outpass',
        icon: FiPlay,
        color: 'blue',
        disabled: isBeforeDeparture,
        disabledReason: departure
          ? `Available from ${departure.toLocaleDateString()} ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : null,
      }],
      active: [{
        status: 'closed',
        label: 'Mark as Returned',
        icon: FiCheckCircle,
        color: 'green',
        disabled: isBeforeDeparture,
        disabledReason: isBeforeDeparture ? 'Cannot return before departure time' : null,
      }],
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
      // Calculate based on actual time spent outside, assuming they left on the departure date
      if (r.status === 'closed' && r.actual_return_time) {
        const departure = r.departure_time ? new Date(r.departure_time) : new Date();
        const returnTime = new Date(r.actual_return_time);
        let duration = (returnTime - departure) / (1000 * 60 * 60); // in hours
        if (duration < 0) duration = 0;
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

  const renderRequestCard = (request, isTimeline = false) => {
    const availableActions = getAvailableActions(request);
    return (
      <div
        key={request.id}
        className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition ${isTimeline ? 'w-full text-left' : ''}`}
      >
        <div className={`flex justify-between items-start mb-4 ${isTimeline ? 'flex-col gap-2' : ''}`}>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{request.destination}</h2>
            <p className="text-gray-600 text-sm">{request.reason}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className={`grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4 ${isTimeline ? 'text-left' : ''}`}>
          <div>
            <span className="font-semibold">Departure:</span> <br />
            {new Date(request.departure_time).toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Expected Return:</span> <br />
            {new Date(request.expected_return_time).toLocaleString()}
          </div>
          {request.actual_return_time && (
            <div>
              <span className="font-semibold">Actual Return:</span> <br />
              {new Date(request.actual_return_time).toLocaleString()}
            </div>
          )}
        </div>

        {request.rejection_reason && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded text-left">
            <p className="text-sm text-red-700">
              <span className="font-semibold">Rejection Reason:</span>{' '}
              {request.rejection_reason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {availableActions.length > 0 && (
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t items-start">
            <div className="flex flex-wrap gap-3">
              {availableActions.map((action) => {
                const IconComponent = action.icon;
                const colorClasses = {
                  blue: 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300',
                  green: 'bg-green-500 hover:bg-green-600 disabled:bg-green-300',
                  orange: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300',
                };
                return (
                  <button
                    key={action.status}
                    onClick={() => handleStatusUpdate(request.id, action.status)}
                    disabled={actionLoading === request.id || action.disabled}
                    title={action.disabledReason || ''}
                    className={`flex items-center gap-2 ${colorClasses[action.color]} disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition`}
                  >
                    <IconComponent size={16} />
                    {actionLoading === request.id ? 'Updating...' : action.label}
                  </button>
                );
              })}
            </div>
            {availableActions.some(a => a.disabled && a.disabledReason) && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⏰ {availableActions.find(a => a.disabled && a.disabledReason)?.disabledReason}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <Loading message="Loading your requests..." />;
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Outpass Requests</h1>
        <div className="flex items-center gap-2">
          {!notifEnabled && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-700 px-3 py-2 rounded-lg text-sm hover:bg-amber-100 transition"
            >
              <FiBell size={14} /> Enable Alerts
            </button>
          )}
          {notifEnabled && (
            <span className="flex items-center gap-1 text-xs text-green-600 px-3 py-2">
              <FiBell size={14} /> Alerts on
            </span>
          )}
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
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
        <div className="space-y-4 shadow-none">
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

          {/* View Toggle */}
          <div className="flex justify-end mb-4">
            <div className="bg-white rounded-lg p-1 shadow flex border border-gray-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${viewMode === 'cards' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiList size={16} /> Cards
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${viewMode === 'timeline' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiClock size={16} /> Timeline
              </button>
            </div>
          </div>

          {/* Rendering the lists based on ViewMode */}
          {viewMode === 'cards' ? (
            <div className="space-y-4">
              {filteredRequests.map(request => renderRequestCard(request, false))}
            </div>
          ) : (
            <div className="bg-transparent rounded-xl p-4 md:py-12 md:px-8 relative overflow-hidden">
              <div className="absolute left-10 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-12">
                {filteredRequests.map((request, idx) => {
                  const isLeft = idx % 2 === 0;

                  // Determine timeline node color and icon based on status
                  let circleColor = 'bg-gray-400 shadow-gray-200 dark:shadow-gray-800';
                  let icon = <FiClock size={16} className="text-white" />;
                  if (request.status === 'approved') { circleColor = 'bg-blue-500 shadow-blue-200 dark:shadow-blue-900'; icon = <FiCheckCircle size={16} className="text-white" />; }
                  else if (request.status === 'active') { circleColor = 'bg-indigo-500 shadow-indigo-200 dark:shadow-indigo-900'; icon = <FiPlay size={16} className="text-white" />; }
                  else if (request.status === 'closed') { circleColor = 'bg-green-500 shadow-green-200 dark:shadow-green-900'; icon = <FiCheckCircle size={16} className="text-white" />; }
                  else if (request.status === 'rejected') { circleColor = 'bg-red-500 shadow-red-200 dark:shadow-red-900'; icon = <FiX size={16} className="text-white" />; }
                  else if (request.status === 'expired') { circleColor = 'bg-orange-500 shadow-orange-200 dark:shadow-orange-900'; icon = <FiAlertCircle size={16} className="text-white" />; }

                  return (
                    <div key={request.id} className="relative flex justify-between items-center w-full group">

                      {/* Left Side Container (Desktop) */}
                      <div className="hidden md:flex w-[45%] justify-end relative">
                        {isLeft ? (
                          <div className="w-full relative">
                            {/* Card pointing right */}
                            <div className="absolute top-6 -right-2 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-r border-t border-transparent z-0 shadow-[2px_-2px_2px_0_rgba(0,0,0,0.02)]" />
                            <div className="relative z-10 w-full">{renderRequestCard(request, true)}</div>
                          </div>
                        ) : (
                          <div className="text-right pr-6 w-full mt-6">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block">
                              {new Date(request.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(request.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Timeline Node */}
                      <div className="absolute left-10 md:left-1/2 -ml-[22px] md:-ml-[22px] w-11 h-11 flex items-center justify-center rounded-full border-[3px] border-white dark:border-gray-900 z-20 shadow-lg bg-white dark:bg-gray-900">
                        <div className={`w-full h-full rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${circleColor} shadow-md`}>
                          {icon}
                        </div>
                      </div>

                      {/* Right Side Container (Desktop) */}
                      <div className="w-full md:w-[45%] pl-24 md:pl-0 relative flex justify-start">
                        {!isLeft ? (
                          <div className="w-full relative md:pl-4">
                            {/* Card pointing left (Desktop only) */}
                            <div className="hidden md:block absolute top-6 left-2 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-l border-b border-transparent z-0 shadow-[-2px_2px_2px_0_rgba(0,0,0,0.02)]" />
                            <div className="relative z-10 w-full">{renderRequestCard(request, true)}</div>
                          </div>
                        ) : (
                          <div className="hidden md:block text-left pl-10 w-full mt-6">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block">
                              {new Date(request.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(request.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

import { useState, useEffect, useRef } from 'react';
import { outpassAPI, notificationAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store';
import StatusBadge from '../../components/StatusBadge';
import LocationTracker from '../../components/LocationTracker';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiPlay, FiX, FiCheckCircle, FiTrendingUp, FiCalendar, FiBell, FiList, FiClock, FiAlertCircle, FiDownload } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
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

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; rawData.length > i; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestNotificationPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toastService.error('Push notifications are not supported on this device/browser.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toastService.warning('Notification permission denied.');
        return;
      }

      // 1. Get Public Key
      const keyRes = await notificationAPI.getPublicKey();
      const publicVapidKey = keyRes.data.public_key;

      if (!publicVapidKey) {
        console.warn('VAPID public key not found on server.');
        setNotifEnabled(true);
        return;
      }

      // 2. Register/Get Service Worker
      const register = await navigator.serviceWorker.ready;

      // 3. Subscribe
      const subscription = await register.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // 4. Send to Backend
      await notificationAPI.subscribe(subscription);

      setNotifEnabled(true);
      toastService.success('Push notifications enabled successfully!');
    } catch (err) {
      console.error('Subscription failed:', err);
      toastService.error('Failed to enable push notifications.');
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

  const exportToPDF = (request) => {
    const doc = new jsPDF();

    // Add styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Official Outpass Document", 105, 20, null, null, "center");

    doc.setFontSize(14);
    doc.text(`Status: ${request.status.toUpperCase()}`, 105, 30, null, null, "center");

    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    let y = 45;
    const lineSpacing = 10;

    const fields = [
      { label: "Student Name", value: user.full_name },
      { label: "Student ID", value: user.student_id },
      { label: "Outpass ID", value: `#${request.id}` },
      { label: "Destination", value: request.destination },
      { label: "Reason", value: request.reason },
      { label: "Departure Time", value: new Date(request.departure_time).toLocaleString() },
      { label: "Return Time", value: new Date(request.expected_return_time).toLocaleString() },
    ];

    if (request.actual_return_time) {
      fields.push({ label: "Actual Return", value: new Date(request.actual_return_time).toLocaleString() });
    }

    fields.forEach(f => {
      doc.setFont("helvetica", "bold");
      doc.text(`${f.label}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(f.value), 60, y);
      y += lineSpacing;
    });

    if (['approved', 'active', 'closed'].includes(request.status)) {
      doc.setDrawColor(0, 128, 0); // Green
      doc.setLineWidth(1);
      doc.rect(140, 45, 50, 50);
      doc.setTextColor(0, 128, 0);
      doc.setFontSize(16);
      doc.text("VALIDATED", 165, 72, null, null, "center");
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`Outpass_${request.id}.pdf`);
  };

  const renderRequestCard = (request, isTimeline = false) => {
    const availableActions = getAvailableActions(request);
    return (
      <div
        key={request.id}
        className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300 group ${isTimeline ? 'w-full text-left' : ''}`}
      >
        <div className={`flex justify-between items-start mb-6 ${isTimeline ? 'flex-col gap-4' : ''}`}>
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{request.destination}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium line-clamp-2">{request.reason}</p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <StatusBadge status={request.status} />
            {['approved', 'active', 'closed'].includes(request.status) && (
              <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100 mt-1 transition-transform group-hover:scale-105">
                <QRCodeCanvas
                  value={`${window.location.origin}/validate/${request.id}`}
                  size={72}
                  level="M"
                />
                <p className="text-[10px] text-center text-indigo-600 font-mono mt-2 pt-1 border-t px-1 font-extrabold tracking-widest">SCAN</p>
              </div>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-3 gap-5 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100/50 dark:border-gray-800/50 text-sm mb-6 ${isTimeline ? 'text-left' : ''}`}>
          <div>
            <span className="flex items-center gap-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs mb-1">
              <FiCalendar size={14} /> Departure
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-200">
              {new Date(request.departure_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <div>
            <span className="flex items-center gap-1.5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs mb-1">
              <FiClock size={14} /> Expected Return
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-200">
              {new Date(request.expected_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          {request.actual_return_time && (
            <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 pt-3 lg:pt-0 lg:pl-5">
              <span className="flex items-center gap-1.5 font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider text-xs mb-1">
                <FiCheckCircle size={14} /> Actual Return
              </span>
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                {new Date(request.actual_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          )}
        </div>

        {request.rejection_reason && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left flex items-start gap-3">
            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {request.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons & PDF Export */}
        {(availableActions.length > 0 || ['approved', 'active', 'closed'].includes(request.status)) && (
          <div className="flex flex-col gap-3 mt-2 pt-5 border-t border-gray-200/50 dark:border-gray-700/50 items-start">
            <div className="flex flex-wrap gap-3 w-full">
              {availableActions.map((action) => {
                const IconComponent = action.icon;
                const colorClasses = {
                  blue: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/50',
                  green: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/50',
                  orange: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50',
                };
                return (
                  <button
                    key={action.status}
                    onClick={() => handleStatusUpdate(request.id, action.status)}
                    disabled={actionLoading === request.id || action.disabled}
                    title={action.disabledReason || ''}
                    className={`flex items-center justify-center gap-2 flex-grow sm:flex-grow-0 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 focus:ring-4 ${colorClasses[action.color] || 'bg-blue-600'}`}
                  >
                    {actionLoading === request.id ? <LoadingSpinner /> : <IconComponent size={18} />}
                    {actionLoading === request.id ? 'Updating...' : action.label}
                  </button>
                );
              })}

              {/* PDF Export Button */}
              {['approved', 'active', 'closed'].includes(request.status) && (
                <button
                  onClick={() => exportToPDF(request)}
                  className="flex items-center justify-center gap-2 flex-grow sm:flex-grow-0 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 hover:shadow-md"
                >
                  <FiDownload size={18} />
                  Download PDF
                </button>
              )}
            </div>
            {availableActions.some(a => a.disabled && a.disabledReason) && (
              <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 mt-2 border border-amber-500/20">
                <FiClock size={14} className="shrink-0" />
                {availableActions.find(a => a.disabled && a.disabledReason)?.disabledReason}
              </div>
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
    <div className="min-h-[calc(100vh-theme(spacing.16))] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Outpass Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Track and manage your travel history</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {!notifEnabled && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm"
            >
              <FiBell size={18} /> Enable Alerts
            </button>
          )}
          {notifEnabled && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl shadow-sm">
              <FiBell size={18} /> Alerts on
            </span>
          )}
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Analytics Stats Cards */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Total Requests</p>
                <p className="text-4xl font-extrabold text-gray-900 dark:text-white mt-2">{metrics.total}</p>
              </div>
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                <FiCheckCircle size={32} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Approval Rate</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.approvalRate}</p>
                  <span className="text-xl font-bold text-emerald-600/60 dark:text-emerald-400/60">%</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <FiTrendingUp size={32} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Avg Duration</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{metrics.averageDuration}</p>
                  <span className="text-xl font-bold text-indigo-600/60 dark:text-indigo-400/60">h</span>
                </div>
              </div>
              <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <FiCalendar size={32} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Rejected</p>
                <p className="text-4xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">{metrics.rejected}</p>
              </div>
              <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
                <FiX size={32} />
              </div>
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

import { useState, useEffect, useRef } from 'react';
import { outpassAPI, notificationAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store';
import StatusBadge from '../../components/StatusBadge';
import LocationTracker from '../../components/LocationTracker';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiPlay, FiX, FiCheckCircle, FiTrendingUp, FiCalendar, FiBell, FiList, FiClock, FiAlertCircle, FiDownload, FiPlusSquare } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import toastService from '../../utils/toastService';
import { getErrorMessage } from '../../utils/errorMessages';
import QRCodeDisplay from '../../components/QRCodeDisplay';

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
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);

      const studentName = user?.full_name || "Student";
      const studentId = user?.student_id || "N/A";

      // --- Background & Borders ---
      doc.setFillColor(252, 252, 253);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Borders
      doc.setDrawColor(30, 27, 75);
      doc.setLineWidth(0.5);
      doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (2 * margin) + 4);

      // --- Header Section ---
      doc.setFillColor(30, 27, 75);
      doc.rect(0, 0, pageWidth, 50, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ST. JOSEPH'S INSTITUTION", 45, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 200);
      doc.text("Hostel Administration & Security Division", 45, 30);

      doc.setFillColor(79, 70, 229);
      doc.rect(margin, 40, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL HOSTEL OUTPASS", pageWidth / 2, 48, { align: "center" });

      // --- Watermark ---
      doc.setTextColor(245, 245, 245);
      doc.setFontSize(50);
      doc.text("OFFICIAL ACCESS", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });

      // --- Top Info Bar ---
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(9);
      doc.text(`PASS ID: OUT-${String(request.id).padStart(6, '0')}`, margin, 65);
      doc.text(`ISSUED: ${new Date().toLocaleString()}`, pageWidth - margin, 65, { align: "right" });

      // --- QR Code Section ---
      const qrCanvas = document.getElementById(`qr-canvas-preview-${request.id}`);
      if (qrCanvas) {
        try {
          const qrImageData = qrCanvas.toDataURL("image/png");
          doc.addImage(qrImageData, 'PNG', pageWidth - margin - 36, 70, 34, 34);
        } catch (e) {
          console.warn("Could not add QR to PDF", e);
        }
      }

      // --- Student Info ---
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, 70, 115, 25, 'F');
      doc.setTextColor(30, 27, 75);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(studentName.toUpperCase(), margin + 5, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`ID: ${studentId}`, margin + 5, 88);

      // --- Details Table ---
      let y = 110;
      const details = [
        { label: "Destination", value: request.destination },
        { label: "Purpose", value: request.reason || "Personal" },
        { label: "Departure", value: new Date(request.departure_time).toLocaleString() },
        { label: "Expected Return", value: new Date(request.expected_return_time).toLocaleString() },
        { label: "Status", value: (request.status || "PENDING").toUpperCase() },
      ];

      details.forEach((d, i) => {
        doc.setFillColor(i % 2 === 0 ? 255 : 249);
        doc.rect(margin, y, contentWidth, 12, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(75, 85, 99);
        doc.text(d.label, margin + 5, y + 8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        doc.text(String(d.value), margin + 60, y + 8);
        y += 12;
      });

      // --- Stamp ---
      if (['approved', 'active', 'closed'].includes(request.status)) {
        doc.setDrawColor(16, 185, 129);
        doc.rect(pageWidth - margin - 55, y + 10, 50, 20);
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(12);
        doc.text("VALIDATED", pageWidth - margin - 30, y + 22, { align: "center" });
      }

      // --- Signatures ---
      const sigY = pageHeight - 30;
      doc.setDrawColor(200);
      doc.line(margin, sigY, margin + 50, sigY);
      doc.text("Warden Signature", margin + 25, sigY + 5, { align: "center" });
      doc.line(pageWidth - margin - 50, sigY, pageWidth - margin, sigY);
      doc.text("Security Officer", pageWidth - margin - 25, sigY + 5, { align: "center" });

      doc.save(`Outpass_${request.id}.pdf`);
      toastService.success("PDF generated successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toastService.error("Failed to generate PDF. Please try again.");
    }
  };

  const renderRequestCard = (request, isTimeline = false) => {
    const availableActions = getAvailableActions(request);
    return (
      <div
        key={request.id}
        className={`premium-card glass p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 group/card ${isTimeline ? 'w-full text-left' : ''} flex flex-col gap-6`}
      >
        <div className={`flex justify-between items-start ${isTimeline ? 'flex-col gap-4' : 'flex-row-reverse gap-4'}`}>
          <div className="flex shrink-0 relative">
            {['pending', 'approved', 'active', 'closed'].includes(request.status) && (
              <div className="p-1 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-white/5 group-hover/card:scale-105 transition-transform">
                <QRCodeDisplay
                  value={`${window.location.protocol}//${window.location.host}/validate/${request.id}`}
                  size={80}
                  requestId={request.id}
                  label="SCAN"
                  status={request.status}
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors tracking-tight">
                {request.destination}
              </h2>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium line-clamp-2 leading-relaxed">
              {request.reason}
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-sm ${isTimeline ? 'text-left' : ''}`}>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
              <FiCalendar size={14} className="text-blue-500" /> Departure
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {new Date(request.departure_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
              <FiClock size={14} className="text-blue-500" /> Expected Return
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {new Date(request.expected_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          {request.actual_return_time && (
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
              <span className="flex items-center gap-2 font-bold text-emerald-500 uppercase tracking-widest text-[10px]">
                <FiCheckCircle size={14} /> Actual Return
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {new Date(request.actual_return_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          )}
        </div>

        {request.rejection_reason && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-left flex items-start gap-3">
            <FiAlertCircle className="text-rose-500 mt-1 shrink-0" size={18} />
            <div>
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Rejection Reason</p>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                {request.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons & PDF Export */}
        {(availableActions.length > 0 || ['approved', 'active', 'closed'].includes(request.status)) && (
          <div className="flex flex-wrap gap-3 mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
            {availableActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.status}
                  onClick={() => handleStatusUpdate(request.id, action.status)}
                  disabled={actionLoading === request.id || action.disabled}
                  title={action.disabledReason || ''}
                  className={`flex-1 flex items-center justify-center gap-2 btn-primary px-6 py-3.5 relative overflow-hidden transition-all active:scale-95 ${action.disabled ? 'opacity-50 cursor-not-allowed scale-100' : ''}`}
                >
                  {actionLoading === request.id ? (
                    <FiRefreshCw className="animate-spin" size={18} />
                  ) : (
                    <IconComponent size={18} />
                  )}
                  <span>{actionLoading === request.id ? 'Processing...' : action.label}</span>
                </button>
              );
            })}

            {['approved', 'active', 'closed'].includes(request.status) && (
              <button
                onClick={() => exportToPDF(request)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 px-6 py-3.5"
              >
                <FiDownload size={18} className="text-blue-500" />
                <span>Download Pass</span>
              </button>
            )}

            {availableActions.some(a => a.disabled && a.disabledReason) && (
              <div className="w-full mt-2 flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                <FiClock size={14} />
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
    <div className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in group/main">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
        <div>
          <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest mb-2">
            <FiList size={14} /> My History
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Outpass Requests
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">Track, manage and download your active passes</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!notifEnabled ? (
            <button
              onClick={requestNotificationPermission}
              className="btn-secondary flex items-center gap-2 group/btn"
            >
              <FiBell size={18} className="text-amber-500 group-hover/btn:animate-bounce" />
              <span>Enable Alerts</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm">
              <FiBell size={18} />
              <span>Notifications On</span>
            </div>
          )}

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} size={18} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Modern Analytics Stats */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="premium-card p-6 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Requests</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{metrics.total}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner">
                <FiList size={24} />
              </div>
            </div>
          </div>

          <div className="premium-card p-6 bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-900/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Success Rate</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.approvalRate}</span>
                  <span className="text-lg font-bold text-emerald-600/50">%</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-inner">
                <FiTrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="premium-card p-6 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg. Duration</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{metrics.averageDuration}</span>
                  <span className="text-lg font-bold text-purple-600/50">h</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-2xl text-purple-600 dark:text-purple-400 shadow-inner">
                <FiClock size={24} />
              </div>
            </div>
          </div>

          <div className="premium-card p-6 bg-gradient-to-br from-white to-rose-50/30 dark:from-gray-900 dark:to-rose-900/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rejected</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{metrics.rejected}</span>
                </div>
              </div>
              <div className="p-3 bg-rose-100 dark:bg-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 shadow-inner">
                <FiX size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Tracking Sticky Info */}
      {activeRequest && (
        <div className="relative group animate-pulse hover:animate-none">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <LocationTracker
            activeRequestId={activeRequest.id}
            requestData={activeRequest}
          />
        </div>
      )}

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
        <div className="premium-card glass p-16 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
            <FiList size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No active outpasses</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">You haven&apos;t submitted any outpass requests yet. Start your first journey by clicking the button below.</p>
          <a
            href="/student/request"
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiPlusSquare size={20} /> Create New Request
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enhanced Filter and Sort Controls */}
          <div className="premium-card glass p-2 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
            <div className="flex-1 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 group">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-bold text-sm text-gray-700 dark:text-gray-200 transition-all"
                >
                  <option value="all">All Request Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="active">🚶 Active</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="closed">🏠 Closed</option>
                  <option value="expired">⏰ Expired</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiList size={14} />
                </div>
              </div>

              <div className="relative flex-1 group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-bold text-sm text-gray-700 dark:text-gray-200 transition-all"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="destination">Destination (A-Z)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiTrendingUp size={14} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:border-l lg:border-gray-100 dark:lg:border-white/10 lg:pl-2">
              <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 shadow-inner h-[46px]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-2 px-4 rounded-lg font-bold text-xs transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <FiList size={14} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-2 px-4 rounded-lg font-bold text-xs transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <FiClock size={14} />
                  <span className="hidden sm:inline">Timeline</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSortBy('date-desc');
                }}
                className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 rounded-xl transition-all"
                title="Reset Filters"
              >
                <FiRefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Rendering the lists based on ViewMode */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
              {filteredRequests.map(request => renderRequestCard(request, false))}
            </div>
          ) : (
            <div className="relative py-12 px-4 overflow-hidden">
              {/* Animated Timeline Line */}
              <div className="absolute left-10 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent dark:via-blue-500/10" />

              <div className="space-y-16">
                {filteredRequests.map((request, idx) => {
                  const isLeft = idx % 2 === 0;

                  // Determine timeline node color and icon based on status
                  let circleColor = 'bg-gray-400 ring-gray-400/20 shadow-gray-400/20';
                  let icon = <FiClock size={16} className="text-white" />;

                  if (request.status === 'approved') {
                    circleColor = 'bg-blue-500 ring-blue-500/20 shadow-blue-500/30';
                    icon = <FiCheckCircle size={16} className="text-white" />;
                  }
                  else if (request.status === 'active') {
                    circleColor = 'bg-indigo-600 ring-indigo-600/20 shadow-indigo-600/40 animate-pulse';
                    icon = <FiPlay size={16} className="text-white" />;
                  }
                  else if (request.status === 'closed') {
                    circleColor = 'bg-emerald-500 ring-emerald-500/20 shadow-emerald-500/30';
                    icon = <FiCheckCircle size={16} className="text-white" />;
                  }
                  else if (request.status === 'rejected') {
                    circleColor = 'bg-rose-500 ring-rose-500/20 shadow-rose-500/30';
                    icon = <FiX size={16} className="text-white" />;
                  }
                  else if (request.status === 'expired') {
                    circleColor = 'bg-amber-500 ring-amber-500/20 shadow-amber-500/30';
                    icon = <FiAlertCircle size={16} className="text-white" />;
                  }

                  return (
                    <div key={request.id} className="relative flex justify-between items-center w-full group/item">

                      {/* Side Label (Date) for Desktop */}
                      <div className={`hidden md:flex w-[42%] flex-col ${isLeft ? 'items-end pr-12' : 'items-start pl-12 order-last'}`}>
                        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                          {new Date(request.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-xs font-bold text-blue-500/60">
                          {new Date(request.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Timeline Node Center */}
                      <div className="absolute left-10 md:left-1/2 -ml-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border-4 border-gray-50 dark:border-slate-800 shadow-xl z-20 group-hover/item:scale-110 transition-transform duration-500 rotate-45">
                        <div className={`w-full h-full rounded-xl flex items-center justify-center ${circleColor} shadow-lg ring-4 -rotate-45`}>
                          {icon}
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className={`w-full md:w-[45%] pl-24 md:pl-0 flex ${isLeft ? 'justify-start md:order-last' : 'justify-end'}`}>
                        <div className="w-full max-w-lg transition-all duration-500 group-hover/item:translate-y-[-4px]">
                          {renderRequestCard(request, true)}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredRequests.length === 0 && (
            <div className="premium-card glass p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                <FiList size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No matching results</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or search criteria to find what you&apos;re looking for.</p>
              <button
                onClick={() => { setFilterStatus('all'); setSortBy('date-desc'); }}
                className="btn-secondary"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

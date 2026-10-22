import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBell,
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
  FiInfo,
  FiAlertCircle,
  FiCheck,
  FiTrash2,
  FiArrowRight,
  FiFilter,
  FiCheckSquare,
  FiZap,
} from 'react-icons/fi';
import { useNotificationStore, AppNotification } from '../store';
import toastService from '../utils/toastService';
import { nativeImpact } from '../utils/native';

interface NotificationsPageProps {
  portalType: 'student' | 'warden';
}

export default function NotificationsPage({ portalType }: NotificationsPageProps) {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'unread' | 'approval' | 'security' | 'warning'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'approval') return n.type === 'approval';
    if (filter === 'security') return n.type === 'security';
    if (filter === 'warning') return n.type === 'warning' || n.type === 'error';
    return true;
  });

  const handleMarkAllRead = async () => {
    await nativeImpact();
    markAllAsRead();
    toastService.success('All notifications marked as read');
  };

  const handleClearAll = async () => {
    await nativeImpact();
    clearAll();
    toastService.info('Notification feed cleared');
  };

  const handleSimulateNotification = async () => {
    await nativeImpact();
    const demoItems = [
      {
        title: 'New Outpass Request',
        message: 'A student has submitted an outpass request for City Central Library.',
        type: 'approval' as const,
      },
      {
        title: 'Security Telemetry Alert',
        message: 'Student check-in recorded at West Campus Gate 2.',
        type: 'security' as const,
      },
      {
        title: 'Curfew Proximity Warning',
        message: 'Curfew cutoff approaches in 30 minutes. Please report to hostel supervisor.',
        type: 'warning' as const,
      },
      {
        title: 'System Health Check',
        message: 'All security gateway servers and GPS relays are operational.',
        type: 'info' as const,
      },
    ];

    const randomItem = demoItems[Math.floor(Math.random() * demoItems.length)];
    addNotification(randomItem);
    toastService.info(randomItem.message);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'approval':
        return <FiCheckCircle className="text-emerald-500" size={20} />;
      case 'security':
        return <FiShield className="text-indigo-500" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-amber-500" size={20} />;
      case 'error':
        return <FiAlertCircle className="text-rose-500" size={20} />;
      default:
        return <FiInfo className="text-blue-500" size={20} />;
    }
  };

  const getNotificationBadgeColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'approval':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'security':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'error':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in group/main w-full max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">
            <FiBell size={14} className="animate-pulse" />
            <span>Activity Feed & Notifications</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-500/30 animate-pulse">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Real-time updates, gate verification telemetry, and outpass review alerts
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleSimulateNotification}
            className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-2"
            title="Generate a real-time notification"
          >
            <FiZap size={15} className="text-amber-500" />
            <span>Test Alert</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-2"
            >
              <FiCheckSquare size={15} className="text-emerald-500" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-xs font-bold active:scale-95 border border-rose-200/60 dark:border-rose-800/40"
              title="Clear all notifications"
              aria-label="Clear all notifications"
            >
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <FiFilter size={13} />
          <span>All ({notifications.length})</span>
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filter === 'unread'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Unread ({unreadCount})</span>
        </button>

        <button
          onClick={() => setFilter('approval')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filter === 'approval'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <FiCheckCircle size={13} className="text-emerald-500" />
          <span>Approvals</span>
        </button>

        <button
          onClick={() => setFilter('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filter === 'security'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <FiShield size={13} className="text-indigo-500" />
          <span>Security & Gates</span>
        </button>

        <button
          onClick={() => setFilter('warning')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            filter === 'warning'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <FiAlertTriangle size={13} className="text-amber-500" />
          <span>Curfew & Warnings</span>
        </button>
      </div>

      {/* ── Notification List ── */}
      {filteredNotifications.length === 0 ? (
        <div className="premium-card p-12 sm:p-16 text-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto mb-5 border border-blue-100 dark:border-blue-900/50 shadow-inner">
            <FiBell size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No notifications found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {filter === 'unread'
              ? "You're all caught up! No unread messages or pending alerts."
              : 'Your notification center is clear. New events and status updates will appear here in real-time.'}
          </p>
          <button onClick={handleSimulateNotification} className="btn-primary text-xs font-bold py-2.5 px-5">
            <FiZap size={15} />
            <span>Generate Test Alert</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${
                notif.read
                  ? 'bg-white/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/50 opacity-85 hover:opacity-100'
                  : 'bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-800/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
              }`}
            >
              {/* Type Icon Badge */}
              <div
                className={`p-3 rounded-2xl flex items-center justify-center shrink-0 border ${getNotificationBadgeColor(
                  notif.type
                )}`}
              >
                {getNotificationIcon(notif.type)}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {notif.message}
                </p>

                {/* Bottom Row Actions */}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>View Outpass</span>
                      <FiArrowRight size={13} />
                    </Link>
                  )}

                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 transition-colors ml-auto"
                    >
                      <FiCheck size={13} />
                      <span>Mark read</span>
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors ml-auto"
                    title="Remove notification"
                  >
                    <FiTrash2 size={13} />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

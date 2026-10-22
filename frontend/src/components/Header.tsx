import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSidebarStore, useNotificationStore } from '../store';
import { FiMenu, FiSun, FiMoon, FiShield, FiUserCheck, FiClock, FiLogOut, FiBell } from 'react-icons/fi';
import { nativeImpact } from '../utils/native';

interface HeaderProps {
  portalType: 'student' | 'warden';
}

export default function Header({ portalType }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();
  const { toggle: toggleSidebar } = useSidebarStore();
  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = async () => {
    await nativeImpact();
    toggleSidebar();
  };

  const handleLogout = async () => {
    await nativeImpact();
    logout();
    navigate('/');
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors shadow-xs">
      {/* Left: Sidebar Toggle & Portal Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all active:scale-95 border border-slate-200/60 dark:border-slate-700/60"
          aria-label="Toggle Sidebar"
        >
          <FiMenu size={19} />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
            {portalType === 'warden' ? (
              <>
                <FiShield className="text-indigo-500" size={14} />
                <span>Warden Authority</span>
              </>
            ) : (
              <>
                <FiUserCheck className="text-blue-500" size={14} />
                <span>Student Portal</span>
              </>
            )}
          </div>
          <span className="hidden md:inline-block text-xs font-medium text-slate-400">
            &bull; Campus Outpass System
          </span>
        </div>
      </div>

      {/* Right: Live Clock, Status, Theme Toggle, User Chip & Sign Out */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <FiClock size={13} className="text-blue-500" />
          <span>{currentTime}</span>
        </div>

        {/* Live System Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live</span>
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={async () => {
            await nativeImpact();
            navigate(`/${portalType}/notifications`);
          }}
          title="Notification Center"
          aria-label="View notifications"
          className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all active:scale-95 border border-slate-200/60 dark:border-slate-700/60"
        >
          <FiBell size={17} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md shadow-blue-500/40 ring-2 ring-white dark:ring-slate-900 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Unified Theme Toggle Pill */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md shadow-sm">
          <button
            type="button"
            onClick={() => {
              if (dark) toggleTheme();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !dark
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Light Mode"
          >
            <FiSun size={14} className={!dark ? 'text-white' : ''} />
            <span className="hidden sm:inline">Light</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!dark) toggleTheme();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dark
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            title="Switch to Dark Mode"
          >
            <FiMoon size={14} className={dark ? 'text-white' : ''} />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white/10 shrink-0">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
              {user?.role || portalType}
            </p>
          </div>
        </div>

        {/* Direct Sign Out Button */}
        <button
          onClick={handleLogout}
          title="Sign Out to Landing Page"
          aria-label="Sign Out"
          className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 border border-rose-200/60 dark:border-rose-800/40 text-xs font-bold"
        >
          <FiLogOut size={15} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

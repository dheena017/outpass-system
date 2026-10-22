import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSidebarStore, useNotificationStore } from '../store';
import { FiLogOut, FiPlusSquare, FiList, FiMoon, FiSun, FiChevronLeft, FiX, FiBell } from 'react-icons/fi';
import { nativeImpact } from '../utils/native';
import Logo from './Logo';

const navLinks = [
  { to: '/student/status', label: 'My Requests', icon: FiList },
  { to: '/student/request', label: 'New Request', icon: FiPlusSquare },
  { to: '/student/notifications', label: 'Notifications', icon: FiBell },
];

export default function StudentNav() {
  const { logout, user } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const { isOpen, toggle: toggleDesktopSidebar, setIsOpen } = useSidebarStore();
  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically close sidebar when navigating to any page
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, setIsOpen]);

  const handleNavClick = async () => {
    await nativeImpact();
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await nativeImpact();
    setIsOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/student/status') {
      return location.pathname === '/student/status' || location.pathname === '/student' || location.pathname === '/student/';
    }
    return location.pathname === path;
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'ST';

  return (
    <>
      {/* ── Backdrop Overlay with Smooth Blur ── */}
      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            nativeImpact();
          }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-40 transition-all duration-300 animate-fade-in cursor-pointer"
          aria-label="Close sidebar overlay"
        />
      )}

      {/* ── Fixed Overlay Sidebar with Independent Custom Scroll ── */}
      <nav
        className={`flex flex-col fixed top-0 left-0 h-screen w-72 p-5 z-50 overflow-y-auto custom-scrollbar bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 select-none shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 mt-1 px-1">
          <Logo size="md" />
          <button
            onClick={() => {
              toggleDesktopSidebar();
              nativeImpact();
            }}
            aria-label="Close sidebar"
            className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 text-slate-500 dark:text-slate-400"
          >
            <span className="hidden md:inline"><FiChevronLeft size={20} /></span>
            <span className="md:hidden"><FiX size={20} /></span>
          </button>
        </div>

        {/* User Card */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700/60 shadow-xs relative overflow-hidden group shrink-0">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/30 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-0.5">
                Student Portal
              </span>
              <p className="font-bold text-sm truncate text-slate-900 dark:text-white leading-tight">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1.5 flex-1 min-h-0">
          <p className="px-3 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 font-bold text-sm group ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <link.icon size={19} className={active ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors'} />
                <span className="font-semibold text-sm tracking-tight">{link.label}</span>
                {link.label === 'Notifications' && unreadCount > 0 ? (
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
                      active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white shadow-xs'
                    }`}
                  >
                    {unreadCount}
                  </span>
                ) : (
                  active && <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2.5 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => {
              toggleDark();
              nativeImpact();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-sm font-semibold group"
          >
            <div className="flex items-center gap-3">
              {dark ? <FiSun className="text-amber-400" size={17} /> : <FiMoon className="text-indigo-500" size={17} />}
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${dark ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${dark ? 'left-4' : 'left-0.5'}`} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-sm font-bold active:scale-95 group"
          >
            <FiLogOut size={17} className="transition-transform group-hover:translate-x-1" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation Bar (Hidden when drawer is open) ── */}
      {!isOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-around py-2 px-4 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 transition-all active:scale-95 ${
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                  <link.icon size={19} />
                </div>
                <span className="text-[10px] font-bold tracking-tight mt-0.5">{link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center py-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 active:scale-95 transition-all"
          >
            <div className="p-2 rounded-xl">
              <FiLogOut size={19} />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Sign Out</span>
          </button>
        </div>
      )}
    </>
  );
}

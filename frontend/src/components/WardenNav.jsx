import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSidebarStore } from '../store';
import { FiLogOut, FiMenu, FiCheckSquare, FiUsers, FiMap, FiBarChart2, FiMoon, FiSun, FiChevronLeft } from 'react-icons/fi';

const navLinks = [
  { to: '/warden/approvals', label: 'Approvals', icon: FiCheckSquare },
  { to: '/warden/roster', label: 'Roster', icon: FiUsers },
  { to: '/warden/map', label: 'Live Map', icon: FiMap },
  { to: '/warden/analytics', label: 'Analytics', icon: FiBarChart2 },
];

export default function WardenNav() {
  const { logout, user } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const { isOpen, toggle: toggleDesktopSidebar } = useSidebarStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Simple avatar initials
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 overflow-y-auto bg-slate-900 border-r border-white/5 text-white w-72 p-6 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Brand */}
        <div className="flex items-center justify-between mb-10 px-2 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
              <span className="text-2xl font-bold text-white italic">O</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Outpass</h1>
          </div>
          <button
            onClick={toggleDesktopSidebar}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 border border-white/5"
          >
            <FiChevronLeft size={20} className="text-gray-400" />
          </button>
        </div>

        {/* User Card */}
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-indigo-500/20"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/10">
              {initials || 'W'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Warden Control</p>
              <p className="font-bold text-base truncate text-white">{user?.first_name} {user?.last_name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-4 flex-1">
          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Administration</p>
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${active
                  ? 'bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                  <link.icon size={20} />
                </div>
                <span className="font-bold text-[15px]">{link.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-4 mt-10 pt-8 border-t border-white/5">
          <button
            onClick={toggleDark}
            className="w-full flex items-center justify-between px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              {dark ? <FiSun className="text-amber-400" size={20} /> : <FiMoon className="text-indigo-400" size={20} />}
              <span className="font-bold text-[15px] text-gray-300 group-hover:text-white">{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${dark ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${dark ? 'left-6' : 'left-1'}`}></div>
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-2xl transition-all font-bold shadow-lg shadow-rose-500/0 hover:shadow-rose-500/20 group"
          >
            <FiLogOut size={20} className="transition-transform group-hover:translate-x-1" />
            <span className="text-[15px]">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass bg-slate-900/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
            <span className="text-xl font-bold text-white italic">O</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Outpass</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleDark}
            className="p-2.5 bg-white/5 active:bg-white/10 rounded-xl transition-all"
          >
            {dark ? <FiSun size={18} className="text-amber-400" /> : <FiMoon size={18} className="text-indigo-400" />}
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/10">
            {initials || 'W'}
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/5 flex shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] pt-2 pb-safe px-4 overflow-x-auto custom-scrollbar">
        <div className="flex w-full items-center justify-between gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex-1 flex flex-col items-center justify-center py-2 relative min-w-[64px] group"
              >
                <div className={`p-3 rounded-2xl transition-all duration-300 ${active
                  ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/30'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                  <link.icon size={20} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                <span className={`text-[10px] mt-2 font-bold tracking-widest uppercase transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {link.label.split(' ')[0]}
                </span>
                {active && (
                  <span className="absolute -top-2 w-10 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.5)]"></span>
                )}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex-1 flex flex-col items-center justify-center py-2 text-gray-500 dark:text-gray-400 group min-w-[64px]"
          >
            <div className="p-3 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 group-active:scale-95">
              <FiLogOut size={20} />
            </div>
            <span className="text-[10px] mt-2 font-bold tracking-widest uppercase group-hover:text-rose-500 transition-colors">Exit</span>
          </button>
        </div>
      </div>

      {/* Sidebar Toggle for Desktop (Floating) */}
      {!isOpen && (
        <button
          onClick={toggleDesktopSidebar}
          className="hidden md:flex fixed top-6 left-6 z-50 glass w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 shadow-2xl group"
        >
          <FiMenu size={24} className="text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
    </>
  );
}

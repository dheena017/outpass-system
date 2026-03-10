import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store';
import { FiLogOut, FiMenu, FiX, FiPlusSquare, FiList, FiMoon, FiSun } from 'react-icons/fi';
import { useState } from 'react';

const navLinks = [
  { to: '/student/request', label: 'New Request', icon: FiPlusSquare },
  { to: '/student/status', label: 'My Requests', icon: FiList },
];

export default function StudentNav() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Simple avatar initials
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col bg-gradient-to-b from-indigo-600 via-blue-600 to-blue-800 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white w-72 min-h-screen p-6 shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <span className="text-xl font-bold bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">O</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Outpass</h1>
        </div>

        <div className="mb-8 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center gap-4 shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white/30 shrink-0">
            {initials || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-blue-200 dark:text-gray-400 font-medium uppercase tracking-wider">Welcome back,</p>
            <p className="font-bold text-lg truncate drop-shadow-sm">{user?.first_name} {user?.last_name}</p>
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group ${isActive(link.to)
                  ? 'bg-white/20 border border-white/30 shadow-lg backdrop-blur-md translate-x-1'
                  : 'hover:bg-white/10 hover:translate-x-1 border border-transparent'
                }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${isActive(link.to) ? 'bg-white/20 text-white' : 'bg-transparent text-blue-200 group-hover:text-white group-hover:bg-white/10'}`}>
                <link.icon size={20} />
              </div>
              <span className={`font-semibold tracking-wide ${isActive(link.to) ? 'text-white' : 'text-blue-100 group-hover:text-white'}`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="space-y-3 mt-8">
          <button
            onClick={toggleDark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 rounded-xl transition-all duration-300 hover:-translate-y-0.5 shadow-md focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {dark ? <FiSun className="text-yellow-300" size={20} /> : <FiMoon className="text-blue-200" size={20} />}
            <span className="font-semibold">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={logout}
            aria-label="Logout"
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-red-500/50 hover:border-red-400 rounded-xl transition-all duration-300 hover:-translate-y-0.5 shadow-md focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <FiLogOut size={20} />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-indigo-600/90 dark:bg-gray-900/90 backdrop-blur-md text-white flex items-center justify-between px-5 h-16 shadow-lg border-b border-indigo-500/30 dark:border-gray-700/50 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-sm font-bold shadow-inner ring-2 ring-white/20">
            {initials || 'U'}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Outpass</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/5 backdrop-blur-sm rounded-full transition-all duration-300 active:scale-95"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <FiSun size={18} className="text-yellow-300" /> : <FiMoon size={18} className="text-blue-100" />}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className={`p-2.5 transition-all duration-300 rounded-full active:scale-95 ${open ? 'bg-white/20 rotate-90' : 'bg-transparent hover:bg-white/10'}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Slide-down Menu ── */}
      <div
        className={`md:hidden fixed top-16 left-0 right-0 z-40 bg-indigo-700/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-indigo-600/50 dark:border-gray-700 shadow-2xl transition-all duration-400 ease-in-out origin-top ${open ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'
          }`}
      >
        <div className="p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive(link.to) ? 'bg-white/20 shadow-inner translate-x-1' : 'hover:bg-white/10 hover:translate-x-1'
                }`}
            >
              <div className={`p-2 rounded-lg ${isActive(link.to) ? 'bg-white/20 text-white' : 'bg-indigo-600/50 dark:bg-gray-700 text-blue-200'}`}>
                <link.icon size={20} />
              </div>
              <span className={`font-semibold tracking-wide ${isActive(link.to) ? 'text-white' : 'text-blue-100'}`}>{link.label}</span>
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 mt-4 rounded-xl text-red-100 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition-all active:scale-95"
          >
            <div className="p-2 rounded-lg bg-red-500/30 text-red-200">
              <FiLogOut size={20} />
            </div>
            <span className="font-semibold tracking-wide">Logout</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 flex shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] transition-colors duration-300 pb-safe px-2 py-1">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex-1 flex flex-col items-center justify-center py-2 relative group"
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive(link.to) ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 scale-110 shadow-sm' : 'text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-800'}`}>
              <link.icon size={24} className={`transition-transform duration-300 ${isActive(link.to) ? 'scale-110' : 'group-hover:scale-110'}`} />
            </div>
            <span className={`text-[10px] mt-1.5 font-bold tracking-wide transition-colors ${isActive(link.to) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300'}`}>{link.label}</span>
            {isActive(link.to) && (
              <span className="absolute top-0 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"></span>
            )}
          </Link>
        ))}
        <button
          onClick={logout}
          aria-label="Logout"
          className="flex-1 flex flex-col items-center justify-center py-2 relative group text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <div className="p-2.5 rounded-2xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-all duration-300 group-hover:scale-110">
            <FiLogOut size={24} className="transition-transform duration-300" />
          </div>
          <span className="text-[10px] mt-1.5 font-bold tracking-wide group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">Logout</span>
        </button>
      </div>

      {/* Overlay for mobile menu */}
      <div
        className={`md:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-30 transition-all duration-400 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}


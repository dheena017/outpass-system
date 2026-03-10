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
      <nav className="hidden md:flex flex-col bg-blue-600 text-white w-64 min-h-screen p-4 transition-colors duration-200">
        <h1 className="text-2xl font-bold mb-8">Outpass</h1>

        <div className="mb-6 p-4 bg-blue-500 rounded flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold shrink-0">
            {initials || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-blue-200">Welcome,</p>
            <p className="font-semibold truncate">{user?.first_name} {user?.last_name}</p>
          </div>
        </div>

        <div className="space-y-2 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded transition-colors duration-200 ${isActive(link.to) ? 'bg-blue-700' : 'hover:bg-blue-500'
                }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={toggleDark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded transition-colors duration-200 mt-4 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {dark ? <FiSun /> : <FiMoon />} {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={logout}
          aria-label="Logout"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition-colors duration-200 mt-2 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <FiLogOut /> Logout
        </button>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white flex items-center justify-between px-4 h-14 shadow-lg transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-sm font-bold">
            {initials || 'U'}
          </div>
          <h1 className="text-lg font-bold">Outpass</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="p-2 opacity-80 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 opacity-80 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Slide-down Menu ── */}
      <div
        className={`md:hidden fixed top-14 left-0 right-0 z-40 bg-blue-700 text-white shadow-xl transition-all duration-300 ease-in-out origin-top ${open ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'
          }`}
      >
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-6 py-4 border-b border-blue-600/50 transition-colors ${isActive(link.to) ? 'bg-blue-800' : 'hover:bg-blue-600'
              }`}
          >
            <link.icon size={18} /> <span className="font-medium">{link.label}</span>
          </Link>
        ))}
        <button
          onClick={() => { setOpen(false); logout(); }}
          className="w-full flex items-center gap-3 px-6 py-4 text-red-200 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <FiLogOut size={18} /> <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-colors duration-200 pb-safe">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 transition-colors ${isActive(link.to) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
          >
            <div className={`p-1 rounded-full ${isActive(link.to) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
              <link.icon size={22} />
            </div>
            <span className="text-[10px] mt-1 font-medium">{link.label}</span>
          </Link>
        ))}
        <button
          onClick={logout}
          aria-label="Logout"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <div className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
            <FiLogOut size={22} />
          </div>
          <span className="text-[10px] mt-1 font-medium">Logout</span>
        </button>
      </div>

      {/* Overlay for mobile menu */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}

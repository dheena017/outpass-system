import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSidebarStore } from '../store';
import { FiLogOut, FiMenu, FiX, FiPlusSquare, FiList, FiMoon, FiSun, FiChevronLeft } from 'react-icons/fi';
import { useState } from 'react';

const navLinks = [
  { to: '/student/request', label: 'New Request', icon: FiPlusSquare },
  { to: '/student/status', label: 'My Requests', icon: FiList },
];

export default function StudentNav() {
  const [open, setOpen] = useState(false);
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
      <nav className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 overflow-y-auto bg-[#1A1D27] text-white w-72 p-5 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-1 mt-2">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-[#2A2E3D] flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold text-white">O</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide text-white">Outpass</h1>
          </div>
          <button
            onClick={toggleDesktopSidebar}
            className="w-8 h-8 flex items-center justify-center bg-[#2A2E3D] hover:bg-[#3A4150] rounded-lg transition-colors text-white/70 hover:text-white"
            aria-label="Close sidebar"
          >
            <FiChevronLeft size={18} />
          </button>
        </div>

        {/* Profile Card */}
        <div className="mb-8 p-4 bg-[#252A38] rounded-2xl flex items-center gap-4 border border-white/5 shadow-md">
          <div className="w-12 h-12 rounded-full bg-[#5B6BF9] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
            {initials || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mb-0.5">Welcome back,</p>
            <p className="font-bold text-base truncate text-white">{user?.first_name} {user?.last_name}</p>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-2 flex-1">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group border ${active
                    ? 'bg-[#3A4150] border-white/5 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-[#2A2E3D]'
                  }`}
              >
                <div className={`p-1.5 rounded-md ${active ? 'bg-white/10 text-white' : 'text-white/70 group-hover:text-white'}`}>
                  <link.icon size={18} />
                </div>
                <span className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 mt-8">
          <button
            onClick={toggleDark}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-[#252A38] hover:bg-[#3A4150] border border-white/5 rounded-xl transition-all duration-200 shadow-sm"
          >
            {dark ? <FiSun className="text-yellow-400" size={18} /> : <FiMoon className="text-yellow-400" size={18} />}
            <span className="font-bold text-[15px] text-white">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={logout}
            aria-label="Logout"
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-[#D64545] hover:bg-[#E55353] rounded-xl transition-all duration-200 shadow-md"
          >
            <FiLogOut size={18} className="text-white" />
            <span className="font-bold text-[15px] text-white">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#1A1D27] text-white flex items-center justify-between px-5 h-16 shadow-lg border-b border-[#2A2E3D] transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#5B6BF9] flex items-center justify-center text-sm font-bold shadow-sm">
            {initials || 'U'}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Outpass</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2.5 bg-[#2A2E3D] border border-white/5 rounded-full transition-all duration-300 active:scale-95"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <FiSun size={18} className="text-yellow-400" /> : <FiMoon size={18} className="text-yellow-400" />}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className={`p-2.5 transition-all duration-300 rounded-full active:scale-95 ${open ? 'bg-[#3A4150]' : 'bg-transparent hover:bg-[#2A2E3D]'}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Slide-down Menu ── */}
      <div
        className={`md:hidden fixed top-16 left-0 right-0 z-40 bg-[#1A1D27] border-b border-[#2A2E3D] shadow-2xl transition-all duration-400 ease-in-out origin-top ${open ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-0 -translate-y-4 pointer-events-none'
          }`}
      >
        <div className="p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 border ${isActive(link.to) ? 'bg-[#3A4150] border-white/5' : 'border-transparent hover:bg-[#2A2E3D]'
                }`}
            >
              <div className={`p-1.5 rounded-md ${isActive(link.to) ? 'bg-white/10 text-white' : 'text-white/70'}`}>
                <link.icon size={18} />
              </div>
              <span className={`font-semibold text-[15px] ${isActive(link.to) ? 'text-white' : 'text-white/70'}`}>{link.label}</span>
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 mt-4 rounded-xl text-white bg-[#D64545] hover:bg-[#E55353] transition-all active:scale-95"
          >
            <FiLogOut size={18} />
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


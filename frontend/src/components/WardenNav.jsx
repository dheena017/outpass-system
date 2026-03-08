import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store';
import { FiLogOut, FiMenu, FiX, FiCheckSquare, FiUsers, FiMap, FiBarChart2, FiMoon, FiSun } from 'react-icons/fi';
import { useState } from 'react';

export default function WardenNav() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const links = [
    { to: '/warden/approvals', label: 'Approvals', icon: FiCheckSquare },
    { to: '/warden/roster', label: 'Roster', icon: FiUsers },
    { to: '/warden/map', label: 'Live Map', icon: FiMap },
    { to: '/warden/analytics', label: 'Analytics', icon: FiBarChart2 },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col bg-green-700 text-white w-64 min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-8">Outpass Control</h1>

        <div className="mb-6 p-4 bg-green-600 rounded">
          <p className="text-sm">Warden</p>
          <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
        </div>

        <div className="space-y-2 flex-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded transition ${isActive(link.to) ? 'bg-green-600' : 'hover:bg-green-600'
                }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={toggleDark}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition mt-4"
        >
          {dark ? <FiSun /> : <FiMoon />} {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition mt-2"
        >
          <FiLogOut /> Logout
        </button>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-green-700 text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <h1 className="text-lg font-bold">Outpass Control</h1>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark} className="p-1 opacity-80 hover:opacity-100">
            {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <span className="text-sm opacity-80">{user?.first_name}</span>
          <button onClick={() => setOpen(!open)} className="p-1">
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Slide-down Menu ── */}
      {open && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-green-800 text-white shadow-xl">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 border-b border-green-700 transition ${isActive(link.to) ? 'bg-green-900' : 'hover:bg-green-700'
                }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-6 py-3 text-red-300 hover:bg-green-700 transition"
          >
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      )}

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex shadow-lg">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition ${isActive(link.to) ? 'text-green-600' : 'text-gray-400'
              }`}
          >
            <link.icon size={20} />
            <span className="text-xs mt-0.5 font-medium">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

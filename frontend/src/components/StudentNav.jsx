import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { FiLogOut, FiMenu, FiX, FiPlusSquare, FiList } from 'react-icons/fi';
import { useState } from 'react';

export default function StudentNav() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const links = [
    { to: '/student/request', label: 'New Request', icon: FiPlusSquare },
    { to: '/student/status', label: 'My Requests', icon: FiList },
  ];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col bg-blue-600 text-white w-64 min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-8">Outpass</h1>

        <div className="mb-6 p-4 bg-blue-500 rounded">
          <p className="text-sm">Welcome,</p>
          <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
        </div>

        <div className="space-y-2 flex-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded transition ${isActive(link.to) ? 'bg-blue-700' : 'hover:bg-blue-500'
                }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition mt-8"
        >
          <FiLogOut /> Logout
        </button>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <h1 className="text-lg font-bold">Outpass</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{user?.first_name}</span>
          <button onClick={() => setOpen(!open)} className="p-1">
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Slide-down Menu ── */}
      {open && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-blue-700 text-white shadow-xl">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 border-b border-blue-600 transition ${isActive(link.to) ? 'bg-blue-800' : 'hover:bg-blue-600'
                }`}
            >
              <link.icon size={16} /> {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-3 px-6 py-3 text-red-300 hover:bg-blue-600 transition"
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
            className={`flex-1 flex flex-col items-center justify-center py-2 transition ${isActive(link.to) ? 'text-blue-600' : 'text-gray-400'
              }`}
          >
            <link.icon size={20} />
            <span className="text-xs mt-0.5 font-medium">{link.label}</span>
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center justify-center py-2 text-gray-400 hover:text-red-500 transition"
        >
          <FiLogOut size={20} />
          <span className="text-xs mt-0.5 font-medium">Logout</span>
        </button>
      </div>

      {/* Overlay for mobile menu */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { FiLogOut, FiMenu, FiBarChart2 } from 'react-icons/fi';
import { useState } from 'react';

export default function WardenNav() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-green-700 text-white w-64 min-h-screen p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Outpass Control</h1>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-2xl"
        >
          <FiMenu />
        </button>
      </div>

      <div className={`space-y-4 ${open ? 'block' : 'hidden'} md:block`}>
        <div className="mb-6 p-4 bg-green-600 rounded">
          <p className="text-sm">Warden</p>
          <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
        </div>

        <Link
          to="/warden/approvals"
          className={`block px-4 py-2 rounded transition ${isActive('/warden/approvals')
              ? 'bg-green-600'
              : 'hover:bg-green-600'
            }`}
        >
          Approval Queue
        </Link>

        <Link
          to="/warden/roster"
          className={`block px-4 py-2 rounded transition ${isActive('/warden/roster')
              ? 'bg-green-600'
              : 'hover:bg-green-600'
            }`}
        >
          Active Roster
        </Link>

        <Link
          to="/warden/map"
          className={`block px-4 py-2 rounded transition ${isActive('/warden/map')
              ? 'bg-green-600'
              : 'hover:bg-green-600'
            }`}
        >
          Live Map
        </Link>

        <Link
          to="/warden/analytics"
          className={`flex items-center gap-2 px-4 py-2 rounded transition ${isActive('/warden/analytics')
              ? 'bg-green-600'
              : 'hover:bg-green-600'
            }`}
        >
          <FiBarChart2 size={14} /> Analytics
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition mt-8"
        >
          <FiLogOut /> Logout
        </button>
      </div>
    </nav>
  );
}

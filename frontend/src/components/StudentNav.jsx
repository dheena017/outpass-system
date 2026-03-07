import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { FiLogOut, FiMenu } from 'react-icons/fi';
import { useState } from 'react';

export default function StudentNav() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-blue-600 text-white w-64 min-h-screen p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Outpass</h1>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-2xl"
        >
          <FiMenu />
        </button>
      </div>

      <div className={`space-y-4 ${open ? 'block' : 'hidden'} md:block`}>
        <div className="mb-6 p-4 bg-blue-500 rounded">
          <p className="text-sm">Welcome,</p>
          <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
        </div>

        <Link
          to="/student/request"
          className={`block px-4 py-2 rounded transition ${
            isActive('/student/request')
              ? 'bg-blue-700'
              : 'hover:bg-blue-500'
          }`}
        >
          New Request
        </Link>

        <Link
          to="/student/status"
          className={`block px-4 py-2 rounded transition ${
            isActive('/student/status')
              ? 'bg-blue-700'
              : 'hover:bg-blue-500'
          }`}
        >
          My Requests
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

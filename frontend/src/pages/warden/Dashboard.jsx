import { Routes, Route, useLocation } from 'react-router-dom';
import WardenNav from '../../components/WardenNav';
import ApprovalQueue from './ApprovalQueue';
import ActiveRoster from './ActiveRoster';
import Map from './Map';
import Analytics from './Analytics';
import { useSidebarStore } from '../../store';
import { FiMenu } from 'react-icons/fi';

export default function WardenDashboard() {
  const { isOpen, toggle } = useSidebarStore();
  const location = useLocation();
  const isMapPage = location.pathname.includes('/map');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <WardenNav />
      {/* Floating Toggle Button when Sidebar is closed on Desktop (Hidden on Map page to prevent overlap) */}
      {!isMapPage && (
        <button
          onClick={toggle}
          className={`hidden md:flex fixed top-6 left-6 z-30 p-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-xl text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:shadow-xl transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 -translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
          aria-label="Open Sidebar"
        >
          <FiMenu size={24} />
        </button>
      )}
      <main className={`flex-1 w-full overflow-x-hidden pt-14 pb-16 md:pt-0 md:pb-0 transition-all duration-300 ease-in-out ${isOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        <Routes>
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/roster" element={<ActiveRoster />} />
          <Route path="/map" element={<Map />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/" element={<ApprovalQueue />} />
        </Routes>
      </main>
    </div>
  );
}

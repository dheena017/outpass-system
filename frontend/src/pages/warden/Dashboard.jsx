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
    <div className="flex min-h-screen bg-transparent transition-colors duration-300">
      <WardenNav />
      {/* Floating Toggle Button when Sidebar is closed on Desktop */}
      {!isMapPage && !isOpen && (
        <button
          onClick={toggle}
          className="hidden md:flex fixed top-6 left-6 z-50 glass w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 shadow-2xl group"
        >
          <FiMenu size={24} className="text-gray-700 dark:text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
      <main className={`flex-1 w-full bg-transparent overflow-x-hidden pt-16 pb-20 md:pt-0 md:pb-0 transition-all duration-300 ease-in-out ${isOpen ? 'md:ml-72' : 'md:ml-0'}`}>
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

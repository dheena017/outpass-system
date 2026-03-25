import { Routes, Route } from 'react-router-dom';
import StudentNav from '../../components/StudentNav';
import RequestForm from './RequestForm';
import RequestStatus from './RequestStatus';
import { useSidebarStore } from '../../store';
import { FiMenu } from 'react-icons/fi';

export default function StudentDashboard() {
  const { isOpen, toggle } = useSidebarStore();
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <StudentNav />
      {/* Floating Toggle Button when Sidebar is closed on Desktop */}
      <button
        onClick={toggle}
        className={`hidden md:flex fixed top-6 left-6 z-30 p-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-xl text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-xl transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 -translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
        aria-label="Open Sidebar"
      >
        <FiMenu size={24} />
      </button>

      {/* Main Content Area */}
      <main className={`flex-1 w-full bg-transparent overflow-x-hidden pt-16 pb-20 md:pt-0 md:pb-0 transition-all duration-300 ease-in-out ${isOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        <Routes>
          <Route path="/request" element={<RequestForm />} />
          <Route path="/status" element={<RequestStatus />} />
          <Route path="/" element={<RequestStatus />} />
        </Routes>
      </main>
    </div>
  );
}

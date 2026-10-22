import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import StudentNav from '../../components/StudentNav';
import Header from '../../components/Header';
import RequestForm from './RequestForm';
import RequestStatus from './RequestStatus';
import NotificationsPage from '../NotificationsPage';
import PageTransition from '../../components/PageTransition';
import { useSidebarStore } from '../../store';

export default function StudentDashboard() {
  const { isOpen } = useSidebarStore();
  const location = useLocation();

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-50/70 dark:bg-slate-950 transition-colors duration-300">
      {/* Overlay Sidebar & Backdrop Blur */}
      <StudentNav />

      {/* Main Viewport - Completely stationary */}
      <div
        className={`flex flex-col h-screen w-full overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'pointer-events-none sm:pointer-events-auto select-none opacity-80' : ''
        }`}
      >
        {/* Top Header - Fixed at top */}
        <Header portalType="student" />

        {/* Scrollable Container - Scrollbar sits strictly BELOW the header */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-16">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/request"
                  element={
                    <PageTransition>
                      <RequestForm />
                    </PageTransition>
                  }
                />
                <Route
                  path="/status"
                  element={
                    <PageTransition>
                      <RequestStatus />
                    </PageTransition>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <PageTransition>
                      <NotificationsPage portalType="student" />
                    </PageTransition>
                  }
                />
                <Route
                  path="/"
                  element={
                    <PageTransition>
                      <RequestStatus />
                    </PageTransition>
                  }
                />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

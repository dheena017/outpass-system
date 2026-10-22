import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import WardenNav from '../../components/WardenNav';
import Header from '../../components/Header';
import ApprovalQueue from './ApprovalQueue';
import ActiveRoster from './ActiveRoster';
import Map from './Map';
import Analytics from './Analytics';
import NotificationsPage from '../NotificationsPage';
import PageTransition from '../../components/PageTransition';
import { useSidebarStore } from '../../store';

export default function WardenDashboard() {
  const { isOpen } = useSidebarStore();
  const location = useLocation();
  const isMapPage = location.pathname.includes('/map');

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-50/70 dark:bg-slate-950 transition-colors duration-300">
      {/* Overlay Sidebar & Backdrop Blur */}
      <WardenNav />

      {/* Main Viewport - Completely stationary */}
      <div
        className={`flex flex-col h-screen w-full overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'pointer-events-none sm:pointer-events-auto select-none opacity-80' : ''
        }`}
      >
        {/* Top Header - Fixed at top */}
        <Header portalType="warden" />

        {/* Scrollable Container - Full bleed for Map, padded for other pages */}
        <main className={`flex-1 w-full ${isMapPage ? 'overflow-hidden p-0' : 'overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-6 lg:p-8'}`}>
          <div className={isMapPage ? 'w-full h-full' : 'max-w-7xl mx-auto pb-16'}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/approvals"
                  element={
                    <PageTransition>
                      <ApprovalQueue />
                    </PageTransition>
                  }
                />
                <Route
                  path="/roster"
                  element={
                    <PageTransition>
                      <ActiveRoster />
                    </PageTransition>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <PageTransition className="w-full h-full">
                      <Map />
                    </PageTransition>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <PageTransition>
                      <Analytics />
                    </PageTransition>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <PageTransition>
                      <NotificationsPage portalType="warden" />
                    </PageTransition>
                  }
                />
                <Route
                  path="/"
                  element={
                    <PageTransition>
                      <ApprovalQueue />
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

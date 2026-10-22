import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore, useThemeStore } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/student/Dashboard';
import WardenDashboard from './pages/warden/Dashboard';
import ValidatePass from './pages/ValidatePass';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import NativeScanner from './components/NativeScanner';
import PageTransition from './components/PageTransition';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AnimatePresence } from 'framer-motion';
import './index.css';

function AnimatedRoutes() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  return (
    <AnimatePresence mode="wait">
      <Routes
        location={location}
        key={
          location.pathname.startsWith('/student')
            ? 'student-portal'
            : location.pathname.startsWith('/warden')
            ? 'warden-portal'
            : location.pathname
        }
      >
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route path="/validate/:id" element={<PageTransition><ValidatePass /></PageTransition>} />

        {/* Student Routes */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="student"
            >
              <PageTransition>
                <StudentDashboard />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Warden Routes */}
        <Route
          path="/warden/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="warden"
            >
              <PageTransition>
                <WardenDashboard />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Landing Page (First Page) */}
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />

        {/* Catch-all redirect to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { restoreSession, isInitialized } = useAuthStore();
  const { dark, init: initTheme } = useThemeStore();

  useEffect(() => {
    restoreSession();
    initTheme();
  }, [restoreSession, initTheme]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return <Loading message="Initializing Outpass System..." />;
  }

  return (
    <Router>
      <NativeScanner />
      <PWAInstallPrompt />
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={dark ? 'dark' : 'light'}
      />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;

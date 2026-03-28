import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore, useThemeStore } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
      <Routes location={location} key={location.pathname}>
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

        {/* Default redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              user?.role === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/warden" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { restoreSession, isInitialized } = useAuthStore();
  const initTheme = useThemeStore((s) => s.init);

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
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;

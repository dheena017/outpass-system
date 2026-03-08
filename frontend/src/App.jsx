import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore, useThemeStore } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/Dashboard';
import WardenDashboard from './pages/warden/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import './index.css';

function App() {
  const { restoreSession, isAuthenticated, user, isInitialized } = useAuthStore();
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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Routes */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
              userRole={user?.role}
              requiredRole="student"
            >
              <StudentDashboard />
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
              <WardenDashboard />
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
    </Router>
  );
}

export default App;

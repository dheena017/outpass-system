import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../api/endpoints';
import { FiMail, FiLock, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import { getStatusMessage } from '../utils/statusMessages';
import toastService from '../utils/toastService';

const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const InputField = ({ id, label, icon: Icon, rightElement, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-gray-700 font-semibold mb-2">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3 text-gray-400" />}
      <input
        id={id}
        {...props}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} ${rightElement ? 'pr-10' : 'pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white`}
      />
      {rightElement && (
        <div className="absolute right-3 top-2">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request token, 2 = reset password
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      const { access_token, user } = response.data;

      login(user, access_token);
      navigate(user.role === 'student' ? '/student' : '/warden');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      setError(detail || getStatusMessage(status, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const res = await authAPI.requestPasswordReset(resetEmail);
      toastService.success(res.data.message);
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
      }
      setResetStep(2);
    } catch (err) {
      toastService.error(err.response?.data?.detail || 'Failed to request reset');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await authAPI.resetPassword(resetToken, newPassword);
      toastService.success('Password updated successfully! Please login.');
      setShowResetModal(false);
      setResetStep(1);
      setNewPassword('');
      setResetToken('');
      setResetEmail('');
    } catch (err) {
      toastService.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Outpass</h1>
        <p className="text-center text-gray-600 mb-8">Student Outpass Tracking System</p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 text-sm" role="alert">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            id="email"
            label="Email"
            type="email"
            icon={FiMail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />

          <div>
            <InputField
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              icon={FiLock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none rounded transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              }
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg transition duration-200 flex items-center justify-center mt-6"
          >
            {loading && <LoadingSpinner />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors">
            Register here
          </a>
        </p>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-zoom-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <FiX size={24} />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Enter your email and we'll send you a password reset link.</p>
                <InputField
                  id="resetEmail"
                  label="Email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg transition duration-200 flex items-center justify-center mt-2"
                >
                  {resetLoading && <LoadingSpinner />}
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">Use your reset token to create a new password.</p>
                <InputField
                  id="resetToken"
                  label="Reset Token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  placeholder="Paste token here"
                  className="bg-blue-50 w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />

                <InputField
                  id="newPassword"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 disabled:bg-green-400 text-white font-bold py-2.5 rounded-lg transition duration-200 flex items-center justify-center mt-2"
                >
                  {resetLoading && <LoadingSpinner />}
                  {resetLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

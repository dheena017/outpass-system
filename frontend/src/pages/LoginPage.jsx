import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../api/endpoints';
import { FiMail, FiLock, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import { getStatusMessage } from '../utils/statusMessages';
import toastService from '../utils/toastService';

const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const InputField = ({ id, label, icon: Icon, rightElement, ...props }) => (
  <div className="relative group">
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">{label}</label>
    <div className="relative items-center">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />}
      <input
        id={id}
        {...props}
        className={`w-full ${Icon ? 'pl-12' : 'px-4'} ${rightElement ? 'pr-12' : 'pr-4'} py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white placeholder-gray-400`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-indigo-950 to-black flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative blurred background circles */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="bg-white/10 dark:bg-gray-900/60 backdrop-blur-2xl border border-white/20 dark:border-gray-800 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] w-full max-w-[440px] p-8 sm:p-10 animate-fade-in-up relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <span className="text-3xl font-bold text-white">O</span>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-center text-white mb-3 tracking-tight">Outpass</h1>
        <p className="text-center text-indigo-200/80 mb-8 font-medium">Student Outpass Tracking System</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-md text-red-200 p-4 rounded-xl mb-6 text-sm flex gap-3 animate-zoom-in" role="alert">
            <FiX className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold text-red-300">Login Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            id="email"
            label="Email Address"
            type="email"
            icon={FiMail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="student@university.edu"
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
                  className="p-2 text-gray-400 hover:text-indigo-500 focus:outline-none rounded-lg transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              }
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors hover:underline decoration-indigo-400 decoration-2 underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:ring-4 focus:ring-indigo-500/50 disabled:from-indigo-800 disabled:to-blue-800 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center mt-8 active:scale-[0.98]"
          >
            {loading ? <LoadingSpinner /> : null}
            <span className="text-lg tracking-wide">{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-white/10">
          <p className="text-indigo-200/80 text-sm font-medium">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-white hover:text-indigo-300 transition-colors font-bold underline decoration-indigo-400/50 hover:decoration-indigo-300 decoration-2 underline-offset-4">
              Create Account
            </a>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-zoom-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <FiX size={24} />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Enter your email and we'll send you a securely signed reset link.</p>
                <InputField
                  id="resetEmail"
                  label="Email"
                  type="email"
                  icon={FiMail}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition duration-300 flex items-center justify-center mt-4 shadow-md active:scale-[0.98]"
                >
                  {resetLoading && <LoadingSpinner />}
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">Check your email for the token and create your new password below.</p>
                <InputField
                  id="resetToken"
                  label="Reset Token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  placeholder="Paste secure token here"
                  className="bg-indigo-50/50 dark:bg-gray-800/50 w-full px-4 py-3.5 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />

                <InputField
                  id="newPassword"
                  label="New Password"
                  type="password"
                  icon={FiLock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/50 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl transition duration-300 flex items-center justify-center mt-4 shadow-md active:scale-[0.98]"
                >
                  {resetLoading && <LoadingSpinner />}
                  {resetLoading ? 'Updating...' : 'Secure Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

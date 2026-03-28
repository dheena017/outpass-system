import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../api/endpoints';
import { FiMail, FiLock, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import { getStatusMessage } from '../utils/statusMessages';
import toastService from '../utils/toastService';
import Logo from '../components/Logo';
import { nativeImpact } from '../utils/native';

const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
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
    await nativeImpact();

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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="glass premium-card w-full max-w-[440px] p-8 sm:p-10 relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <Logo size="lg" className="justify-center mb-6" />
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Welcome Back
          </h1>
          <p className="text-gray-400 mt-3 font-medium">Outpass Tracking System</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl mb-8 flex items-start gap-3 animate-fade-in">
            <FiX className="shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-bold">Authentication Failed</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <div className="relative group">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@university.edu"
                className="input-field"
                style={{ paddingLeft: '3rem' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-gray-500">Password</label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                style={{ cursor: 'pointer' }}
              >
                Forgot?
              </button>
            </div>
            <div className="relative group">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field pr-12"
                style={{ paddingLeft: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 mt-8 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner />
                Logging in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 text-center pt-8 border-t border-gray-100/10">
          <p className="text-gray-400 text-sm font-medium">
            New to the system?{' '}
            <a href="/register" className="text-blue-400 hover:text-blue-300 font-bold ml-1 transition-colors">
              Create Account
            </a>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass premium-card max-w-sm w-full p-8 animate-zoom-in border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-6">
                <p className="text-sm text-gray-400 leading-relaxed italic">Enter your email and we&apos;ll send you a password reset token.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 ml-1">Email</label>
                  <div className="relative group">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      placeholder="EMAIL ADDRESS"
                      className="input-field"
                      style={{ paddingLeft: '3rem' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full btn-primary"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <p className="text-sm text-gray-400 leading-relaxed italic pb-2">Check your email for the token and create your new password.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 ml-1">Reset Token</label>
                  <div className="relative group">
                    <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      required
                      placeholder="Paste token here"
                      className="input-field"
                      style={{ paddingLeft: '3rem' }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 ml-1">New Password</label>
                  <div className="relative group">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="PASSWORD"
                      className="input-field"
                      style={{ paddingLeft: '3rem' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                >
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

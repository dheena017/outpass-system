import { Link } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store';
import Logo from '../components/Logo';
import {
  FiArrowRight,
  FiShield,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiSmartphone,
  FiActivity,
  FiSun,
  FiMoon,
  FiZap,
  FiUsers,
  FiMaximize2,
  FiBell
} from 'react-icons/fi';
import { QRCodeCanvas } from 'qrcode.react';
import StatusBadge from '../components/StatusBadge';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const { dark, toggle: toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 relative overflow-hidden select-none">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div
        className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] pointer-events-none animate-pulse"
        style={{ animationDelay: '2s' }}
      />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[150px] pointer-events-none" />

      {/* ── Fixed Top Navigation Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-slate-900/85 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/20 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
              <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              <a href="#preview" className="hover:text-blue-400 transition-colors">Live Pass</a>
              <a href="#demo-access" className="hover:text-blue-400 transition-colors">Demo Credentials</a>
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {dark ? <FiSun className="text-amber-400" size={18} /> : <FiMoon className="text-indigo-400" size={18} />}
            </button>

            {isAuthenticated ? (
              <Link
                to={user?.role === 'student' ? '/student' : '/warden'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95"
              >
                <span>Go to Dashboard</span>
                <FiArrowRight size={16} />
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-2xl text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs sm:text-sm transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                >
                  <span>Register</span>
                  <FiArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Next-Gen Campus Safety & Mobility</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
              Smart Campus Outpass{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                & Live Tracking
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Say goodbye to paper slips and manual registers. Streamline campus permissions with real-time approval
              workflows, dynamic QR security verification, and GPS-enabled geofencing.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/30 transition-all duration-200 active:scale-95"
              >
                <FiZap size={18} />
                <span>Launch Portal / Sign In</span>
                <FiArrowRight size={18} />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-all active:scale-95"
              >
                <FiUsers size={18} />
                <span>Create Student Account</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="text-2xl font-black text-white">99.9%</p>
                <p className="text-xs text-slate-400 font-medium">Approval Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-black text-blue-400">&lt; 30s</p>
                <p className="text-xs text-slate-400 font-medium">Avg Request Time</p>
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-400">100%</p>
                <p className="text-xs text-slate-400 font-medium">Digital Verification</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Mockup Card */}
          <div id="preview" className="lg:col-span-5 relative scroll-mt-28">
            <div className="relative mx-auto max-w-sm rounded-3xl bg-slate-900/90 border border-slate-700/80 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                    Digital Outpass
                  </span>
                  <h3 className="text-xl font-bold text-white">City Central Hospital</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Medical consultation & checkup</p>
                </div>
                <StatusBadge status="approved" />
              </div>

              {/* Student Details */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  JD
                </div>
                <div>
                  <p className="text-xs font-bold text-white">John Doe</p>
                  <p className="text-[11px] text-slate-400">ID: STU-2024-8842</p>
                </div>
              </div>

              {/* Time Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Departure
                  </span>
                  <p className="text-xs font-bold text-slate-200">Today, 4:30 PM</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Expected Return
                  </span>
                  <p className="text-xs font-bold text-slate-200">Today, 8:30 PM</p>
                </div>
              </div>

              {/* Security Gate QR Preview */}
              <div className="p-4 rounded-2xl bg-white flex items-center justify-between text-slate-900 shadow-inner">
                <div className="space-y-0.5">
                  <p className="text-xs font-black uppercase tracking-wider">Gate Access Pass</p>
                  <p className="text-[10px] text-slate-500">Scan at Main Gate 1</p>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Verified by Warden
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                  <QRCodeCanvas value="https://outpass.campus/verify/sample-pass-8842" size={54} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights Grid ── */}
      <section id="features" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/80 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
            Engineered for Campus Governance
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Key Features Designed for Students & Wardens
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-blue-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiZap size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Digital Requests</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Submit outpass leaves in seconds with destination suggestions, reason tags, and automatic departure-return
              duration validation.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiShield size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">One-Tap Warden Approvals</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Wardens can approve with custom curfew guidelines or reject with official reasons, individually or in bulk
              batches.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-cyan-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiMapPin size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">GPS Geofencing & Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time telemetry and geofencing monitoring during active student leaves, with automated battery and
              signal health logs.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiMaximize2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dynamic QR Gate Security</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Anti-tamper digital pass with dynamic QR encoding for instantaneous security checkpoint scanning and exit
              logging.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-purple-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiBell size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Push Notifications & PWA</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Install directly onto Android and iOS as a Progressive Web App (PWA). Receive alerts whenever requests are
              reviewed.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-slate-800/40 border border-slate-700/60 hover:border-amber-500/50 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FiActivity size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Active Roster & Analytics</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Instant visibility into students currently off campus, overdue return alerts, leave statistics, and
              tamper-proof PDF generation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Demo Accounts Section ── */}
      <section id="demo-access" className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center scroll-mt-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/80 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            Ready to test the system?
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
            Try both the Student and Warden workflows immediately using the pre-configured demo credentials.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left mb-8">
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                Student Account
              </span>
              <p className="text-xs font-semibold text-white">Email: demo@student.com</p>
              <p className="text-xs text-slate-400">Password: password123</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                Warden Account
              </span>
              <p className="text-xs font-semibold text-white">Email: warden@example.com</p>
              <p className="text-xs text-slate-400">Password: password123</p>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all active:scale-95"
          >
            <span>Proceed to Login</span>
            <FiArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-20 border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Outpass Tracking System &bull; Version 1.0.0</span>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <Link to="/login" className="hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="hover:text-white transition-colors">
            Register
          </Link>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            API Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}

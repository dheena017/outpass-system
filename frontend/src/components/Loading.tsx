import { FiShield, FiZap, FiRadio } from 'react-icons/fi';

interface LoadingProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
}

export default function Loading({
  message = 'Synchronizing Campus Systems...',
  subtext = 'Verifying cryptographic permissions & session state',
  fullScreen = true,
}: LoadingProps) {
  const content = (
    <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm px-6">
      {/* ── Visual Shield Icon with Layered Glowing Radar Rings ── */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Outer glowing pulsing orb */}
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 rounded-full blur-xl animate-pulse" />

        {/* Expanding ping ring */}
        <div className="absolute -inset-3 rounded-3xl border border-blue-500/30 dark:border-blue-400/20 animate-ping opacity-60" />

        {/* Orbital spinning dashed ring */}
        <div
          className="absolute -inset-2.5 rounded-3xl border-2 border-dashed border-blue-500/40 dark:border-blue-400/30 animate-spin"
          style={{ animationDuration: '12s' }}
        />

        {/* Central Glassmorphic Badge */}
        <div className="relative w-20 h-20 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-blue-500/20 flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/40">
            <FiShield size={24} className="animate-pulse" />
          </div>
          {/* Accent mini badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900">
            <FiZap size={12} />
          </div>
        </div>
      </div>

      {/* ── Brand Badge ── */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-3 shadow-2xs">
        <FiRadio className="text-blue-500 animate-pulse" size={12} />
        <span>Campus Digital Outpass</span>
      </div>

      {/* ── Main Message Heading ── */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
        {message}
      </h2>

      {/* ── Progress Bar Container with Gliding Gradient Beam ── */}
      <div className="w-64 sm:w-72 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mt-6 mb-4 shadow-inner">
        <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full animate-loading" />
      </div>

      {/* ── Subtext and Metric Indicator ── */}
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs leading-relaxed">
        {subtext}
      </p>

      {/* ── Staggered Bouncing Status Dots ── */}
      <div className="flex items-center gap-1.5 mt-5">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors selection:bg-blue-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/3 w-80 h-80 bg-indigo-500/10 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {content}
    </div>
  );
}

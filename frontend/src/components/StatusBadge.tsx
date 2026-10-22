interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending: {
    bg: 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-400/10 dark:border-amber-400/30',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500 animate-pulse',
    label: 'Pending Approval',
  },
  approved: {
    bg: 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-400/10 dark:border-emerald-400/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Approved',
  },
  active: {
    bg: 'bg-sky-500/10 border-sky-500/30 dark:bg-sky-400/10 dark:border-sky-400/30',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500 animate-ping',
    label: 'Active (Outside)',
  },
  closed: {
    bg: 'bg-slate-500/10 border-slate-500/30 dark:bg-slate-400/10 dark:border-slate-400/30',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
    label: 'Returned & Closed',
  },
  rejected: {
    bg: 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-400/10 dark:border-rose-400/30',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Rejected',
  },
  expired: {
    bg: 'bg-orange-500/10 border-orange-500/30 dark:bg-orange-400/10 dark:border-orange-400/30',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    label: 'Expired',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || 'pending').toLowerCase();
  const config = statusStyles[normalized] || statusStyles.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border backdrop-blur-md shadow-sm transition-all select-none ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

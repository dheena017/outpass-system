import PropTypes from 'prop-types';

const statusStyles = {
  pending: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', label: 'Pending' },
  approved: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-600 dark:text-green-400', label: 'Approved' },
  active: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', label: 'Active' },
  closed: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-600 dark:text-gray-400', label: 'Closed' },
  rejected: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-600 dark:text-red-400', label: 'Rejected' },
  expired: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', label: 'Expired' },
};

export default function StatusBadge({ status }) {
  const config = statusStyles[status] || statusStyles.pending;

  return (
    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-sm shadow-sm transition-all duration-300 ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string
};

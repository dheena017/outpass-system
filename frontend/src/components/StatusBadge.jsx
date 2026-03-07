const statusColors = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Closed' },
  expired: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Expired' },
};

export default function StatusBadge({ status }) {
  const config = statusColors[status] || statusColors.pending;

  return (
    <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-sm font-semibold`}>
      {config.label}
    </span>
  );
}

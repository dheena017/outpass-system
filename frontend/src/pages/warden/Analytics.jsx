import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp, FiAlertCircle, FiDownload } from 'react-icons/fi';

// ── Tiny inline bar chart (no dependencies) ──────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = '#3b82f6', height = 120 }) {
    if (!data || data.length === 0) return <p className="text-gray-400 text-sm">No data</p>;
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div className="flex items-end gap-1 w-full" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-xs text-gray-500 font-medium">{d[valueKey] > 0 ? d[valueKey] : ''}</span>
                    <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                            height: `${Math.max((d[valueKey] / max) * (height - 24), d[valueKey] > 0 ? 4 : 1)}px`,
                            backgroundColor: d[valueKey] > 0 ? color : '#e5e7eb',
                        }}
                        title={`${d[labelKey]}: ${d[valueKey]}`}
                    />
                    <span className="text-xs text-gray-400 truncate w-full text-center" style={{ fontSize: '9px' }}>
                        {d[labelKey]}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Horizontal bar (for destinations) ────────────────────────────────────────
function HorizBar({ label, value, max, color }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-32 truncate flex-shrink-0">{label}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-sm font-bold text-gray-700 w-6 text-right">{value}</span>
        </div>
    );
}

const DEST_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// ── Peak hours: only show relevant window (6am–11pm) ─────────────────────────
function PeakHoursChart({ data }) {
    const window = data.slice(6, 23); // 6am to 10pm
    const labels = window.map(d => {
        const h = d.hour % 12 || 12;
        return `${h}${d.hour < 12 ? 'a' : 'p'}`;
    });
    const chartData = window.map((d, i) => ({ label: labels[i], count: d.count }));
    return <BarChart data={chartData} labelKey="label" valueKey="count" color="#8b5cf6" height={110} />;
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4`} style={{ borderColor: color }}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                </div>
                <div className="p-2 rounded-lg opacity-20" style={{ backgroundColor: color }}>
                    <Icon size={24} style={{ color }} className="opacity-100" />
                </div>
            </div>
        </div>
    );
}

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/analytics/warden');
            setData(res.data);
            setLastUpdated(new Date());
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading message="Loading analytics…" />;

    if (error) return (
        <div className="p-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        </div>
    );

    const { summary, top_destinations, requests_by_day, peak_hours } = data;
    const maxDest = top_destinations.length > 0 ? top_destinations[0].count : 1;

    return (
        <div className="p-8 space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">Updated {lastUpdated.toLocaleTimeString()}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const res = await apiClient.get('/outpasses/export-csv', { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'outpass_report.csv';
                                a.click();
                                window.URL.revokeObjectURL(url);
                            } catch { /* silent */ }
                        }}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        <FiDownload /> Download CSV
                    </button>
                    <button
                        onClick={fetchAnalytics}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        <FiRefreshCw /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Requests" value={summary.total} icon={FiUsers} color="#3b82f6" />
                <StatCard
                    label="Approval Rate"
                    value={`${summary.approval_rate}%`}
                    icon={FiTrendingUp}
                    color="#10b981"
                    sub={`${summary.approved} approved`}
                />
                <StatCard
                    label="Avg Time Outside"
                    value={`${summary.avg_duration_hours}h`}
                    icon={FiClock}
                    color="#f59e0b"
                    sub="for closed outpasses"
                />
                <StatCard
                    label="Active Now"
                    value={summary.active}
                    icon={FiUsers}
                    color="#6366f1"
                    sub={`${summary.pending} pending approval`}
                />
            </div>

            {/* ── Secondary stat row ── */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Approved" value={summary.approved} icon={FiCheckCircle} color="#10b981" />
                <StatCard label="Rejected" value={summary.rejected} icon={FiXCircle} color="#ef4444" />
                <StatCard label="Auto-Expired" value={summary.expired} icon={FiAlertCircle} color="#f97316" sub="forgot to return" />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Requests over 14 days */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-700 mb-4">Requests — Last 14 Days</h2>
                    <BarChart
                        data={requests_by_day}
                        labelKey="day"
                        valueKey="count"
                        color="#3b82f6"
                        height={130}
                    />
                </div>

                {/* Peak departure hours */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-700 mb-4">Peak Departure Hours</h2>
                    <PeakHoursChart data={peak_hours} />
                    <p className="text-xs text-gray-400 mt-2 text-center">6 am – 10 pm</p>
                </div>
            </div>

            {/* ── Top Destinations ── */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-700 mb-5">Top Destinations</h2>
                {top_destinations.length === 0 ? (
                    <p className="text-gray-400 text-sm">No data yet</p>
                ) : (
                    <div className="space-y-3">
                        {top_destinations.map((d, i) => (
                            <HorizBar
                                key={i}
                                label={d.name}
                                value={d.count}
                                max={maxDest}
                                color={DEST_COLORS[i % DEST_COLORS.length]}
                            />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}

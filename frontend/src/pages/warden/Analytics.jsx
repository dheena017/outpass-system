import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp, FiAlertCircle, FiDownload, FiX } from 'react-icons/fi';

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
        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border-l-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group" style={{ borderColor: color, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: color }}></div>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">{label}</p>
                    <p className="text-3xl sm:text-4xl font-extrabold mt-2" style={{ color }}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">{sub}</p>}
                </div>
                <div className="p-3 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity shadow-inner" style={{ backgroundColor: color }}>
                    <Icon size={26} style={{ color }} className="opacity-100" />
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
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        status: '',
        start_date: '',
        end_date: ''
    });

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

    const handleExport = async (e) => {
        e.preventDefault();
        try {
            const params = new URLSearchParams();
            if (exportFilters.status) params.append('status_filter', exportFilters.status);
            if (exportFilters.start_date) params.append('start_date', exportFilters.start_date);
            if (exportFilters.end_date) params.append('end_date', exportFilters.end_date);

            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await apiClient.get(`/outpasses/export-csv${queryString}`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `outpass_report${queryString ? '_filtered' : ''}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            setShowExportModal(false);
        } catch { /* silent */ }
    };

    return (
        <div className="min-h-[calc(100vh-theme(spacing.16))] p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Analytics</h1>
                    {lastUpdated && (
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={fetchAnalytics}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                    >
                        <FiRefreshCw /> Refresh
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 focus:ring-4 focus:ring-emerald-500/30"
                    >
                        <FiDownload /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    color="#8b5cf6"
                    sub={`${summary.pending} pending approval`}
                />
            </div>

            {/* ── Secondary stat row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Approved" value={summary.approved} icon={FiCheckCircle} color="#10b981" />
                <StatCard label="Rejected" value={summary.rejected} icon={FiXCircle} color="#ef4444" />
                <StatCard label="Auto-Expired" value={summary.expired} icon={FiAlertCircle} color="#f97316" sub="forgot to return" />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Requests over 14 days */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-sm p-6 sm:p-8">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-6">Requests — Last 14 Days</h2>
                    <BarChart
                        data={requests_by_day}
                        labelKey="day"
                        valueKey="count"
                        color="#3b82f6"
                        height={160}
                    />
                </div>

                {/* Peak departure hours */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-sm p-6 sm:p-8">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-6">Peak Departure Hours</h2>
                    <PeakHoursChart data={peak_hours} />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-4 text-center">6 am – 10 pm</p>
                </div>
            </div>

            {/* ── Top Destinations ── */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-sm p-6 sm:p-8 mb-8">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-8">Top Destinations</h2>
                {top_destinations.length === 0 ? (
                    <div className="flex items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No destination data collected yet.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
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

            {/* ── Export Modal ── */}
            {showExportModal && (
                <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-4 animate-zoom-in border border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <FiDownload className="text-emerald-500" />
                                </div>
                                Export Report
                            </h2>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleExport} className="space-y-5">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Status Filter</label>
                                <select
                                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm dark:text-white"
                                    value={exportFilters.status}
                                    onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="active">Active</option>
                                    <option value="closed">Closed</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                        value={exportFilters.start_date}
                                        onChange={(e) => setExportFilters({ ...exportFilters, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                        value={exportFilters.end_date}
                                        onChange={(e) => setExportFilters({ ...exportFilters, end_date: e.target.value })}
                                        min={exportFilters.start_date}
                                    />
                                </div>
                            </div>
                            <div className="pt-6 flex flex-col sm:flex-row gap-3">
                                <button type="button" onClick={() => setShowExportModal(false)} className="flex-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 text-sm">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 px-4 py-3 rounded-xl font-bold transition-all active:scale-95 text-sm focus:ring-4 focus:ring-emerald-500/30">
                                    Download CSV
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Loading from '../../components/Loading';
import { FiRefreshCw, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp, FiAlertCircle, FiDownload, FiMap } from 'react-icons/fi';
import PropTypes from 'prop-types';

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

BarChart.propTypes = {
    data: PropTypes.array.isRequired,
    labelKey: PropTypes.string.isRequired,
    valueKey: PropTypes.string.isRequired,
    color: PropTypes.string,
    height: PropTypes.number
};

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

HorizBar.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired
};

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

PeakHoursChart.propTypes = {
    data: PropTypes.array.isRequired
};

// ── Summary stat card ─────────────────────────────────────────────────────────
// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }) {
    return (
        <div className="premium-card glass p-6 transition-all duration-500 hover:shadow-2xl hover:border-indigo-500/30 group/stat">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black transition-all group-hover/stat:scale-110 origin-left" style={{ color }}>
                            {value}
                        </p>
                    </div>
                    {sub && <p className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest leading-tight">{sub}</p>}
                </div>
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover/stat:rotate-12"
                    style={{ backgroundColor: `${color}15`, color }}
                >
                    <Icon size={24} />
                </div>
            </div>
            {/* Subtle progress-like line at bottom */}
            <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all group-hover/stat:opacity-40" style={{ color, width: '40%' }}></div>
        </div>
    );
}

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired,
    sub: PropTypes.string
};

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

    if (loading) return <Loading message="Synthesizing intelligence data…" />;

    if (error) return (
        <div className="p-8">
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                <FiAlertCircle size={20} />
                <span className="font-bold">{error}</span>
            </div>
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
        <div className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in group/main">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
                <div>
                    <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest mb-2">
                        <FiTrendingUp size={14} /> Intelligence Bureau
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">System Analytics</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                            {lastUpdated && `Last Synchronized: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} size={18} />
                        <span className="font-bold text-sm tracking-wide">Sync Metrics</span>
                    </button>

                    <button
                        onClick={() => setShowExportModal(true)}
                        className="btn-primary py-3 px-6 bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20"
                    >
                        <FiDownload size={18} />
                        <span className="font-bold text-sm tracking-wide">Generate CSV</span>
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
                    sub={`${summary.approved} verified approvals`}
                />
                <StatCard
                    label="Avg Duration"
                    value={`${summary.avg_duration_hours}h`}
                    icon={FiClock}
                    color="#f59e0b"
                    sub="Avg journey time outside"
                />
                <StatCard
                    label="Active Missions"
                    value={summary.active}
                    icon={FiUsers}
                    color="#8b5cf6"
                    sub={`${summary.pending} pending screening`}
                />
            </div>

            {/* ── Secondary stat row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Approved" value={summary.approved} icon={FiCheckCircle} color="#10b981" />
                <StatCard label="Rejected" value={summary.rejected} icon={FiXCircle} color="#ef4444" />
                <StatCard label="Overdue / Expired" value={summary.expired} icon={FiAlertCircle} color="#f97316" sub="Potential cleanup required" />
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Requests over 14 days */}
                <div className="premium-card glass p-8 group/chart overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[80px] -mr-16 -mt-16 transition-all group-hover/chart:bg-blue-500/10"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <FiTrendingUp size={20} />
                            </div>
                            Request Volume
                        </h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last 14 Days</span>
                    </div>
                    <div className="relative z-10">
                        <BarChart
                            data={requests_by_day}
                            labelKey="day"
                            valueKey="count"
                            color="#3b82f6"
                            height={180}
                        />
                    </div>
                </div>

                {/* Peak departure hours */}
                <div className="premium-card glass p-8 group/chart overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[80px] -mr-16 -mt-16 transition-all group-hover/chart:bg-indigo-500/10"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <FiClock size={20} />
                            </div>
                            Peak Activity
                        </h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departure Hours</span>
                    </div>
                    <div className="relative z-10">
                        <PeakHoursChart data={peak_hours} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400/50 mt-8 text-center border-t border-gray-100 dark:border-white/5 pt-4">Operational Window 06:00 — 22:00</p>
                </div>
            </div>

            {/* ── Top Destinations ── */}
            <div className="premium-card glass p-8 sm:p-10 group/dest overflow-hidden pb-12">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-all group-hover/dest:bg-emerald-500/10"></div>
                <div className="flex items-center justify-between mb-10 relative z-10 border-b border-gray-100 dark:border-white/5 pb-6">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                            <FiTrendingUp size={24} />
                        </div>
                        Travel Destinations
                    </h2>
                    <span className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Heatmap Data</span>
                </div>

                {top_destinations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/10 relative z-10">
                        <FiMap className="text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest">No Intelligence Data Recorded</p>
                    </div>
                ) : (
                    <div className="space-y-8 relative z-10 max-w-4xl mx-auto">
                        {top_destinations.map((d, i) => (
                            <div key={i} className="group/bar">
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <span className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider group-hover/bar:text-indigo-500 transition-colors">{d.name}</span>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{d.count} HITS</span>
                                </div>
                                <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200/50 dark:border-white/5 shadow-inner">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                                        style={{
                                            width: `${maxDest > 0 ? (d.count / maxDest) * 100 : 0}%`,
                                            backgroundColor: DEST_COLORS[i % DEST_COLORS.length],
                                            boxShadow: `0 0 15px ${DEST_COLORS[i % DEST_COLORS.length]}40`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Export Modal ── */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowExportModal(false)}></div>
                    <div className="relative w-full max-w-lg premium-card glass bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-2xl animate-zoom-in border-white/20 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[80px] -mr-16 -mt-16"></div>

                        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500">
                                <FiDownload size={24} />
                            </div>
                            Export Metrics
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                            Configure filters to generate a tailored CSV intelligence report.
                        </p>

                        <form onSubmit={handleExport} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Status Classification</label>
                                <div className="relative group">
                                    <FiList className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                    <select
                                        className="input-field py-3.5"
                                        value={exportFilters.status}
                                        onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                                        style={{ paddingLeft: '3rem' }}
                                    >
                                        <option value="">All Scopes</option>
                                        <option value="pending">⏳ Pending Review</option>
                                        <option value="approved">✅ Verified Approvals</option>
                                        <option value="rejected">❌ Denied Requests</option>
                                        <option value="active">🚶 Active Deployments</option>
                                        <option value="closed">🏠 Successfully Closed</option>
                                        <option value="expired">⏰ Late Expired</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Start Date</label>
                                    <div className="relative group">
                                        <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                        <input
                                            type="date"
                                            className="input-field py-3.5 pr-4 [color-scheme:light] dark:[color-scheme:dark]"
                                            value={exportFilters.start_date}
                                            onChange={(e) => setExportFilters({ ...exportFilters, start_date: e.target.value })}
                                            style={{ paddingLeft: '3rem' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">End Date</label>
                                    <div className="relative group">
                                        <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={18} />
                                        <input
                                            type="date"
                                            className="input-field py-3.5 pr-4 [color-scheme:light] dark:[color-scheme:dark]"
                                            value={exportFilters.end_date}
                                            onChange={(e) => setExportFilters({ ...exportFilters, end_date: e.target.value })}
                                            min={exportFilters.start_date}
                                            style={{ paddingLeft: '3rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-4 mt-10">
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(false)}
                                    className="btn-secondary flex-1 py-4 text-gray-600"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20"
                                >
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


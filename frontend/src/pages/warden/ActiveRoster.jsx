import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import Loading from '../../components/Loading';
import toastService from '../../utils/toastService';
import { FiRefreshCw, FiAlertTriangle, FiClock, FiDownload, FiSearch } from 'react-icons/fi';
import { jsPDF } from 'jspdf';

export default function ActiveRoster() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActiveStudents();
    const interval = setInterval(fetchActiveStudents, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveStudents = async () => {
    try {
      const response = await outpassAPI.getActiveStudents();
      setActiveStudents(response.data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      setError('Unable to fetch active students roster');
      toastService.error('Failed to update roster');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = (student) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Official Outpass Document", 105, 20, null, null, "center");
    doc.setFontSize(14);
    doc.text(`Status: ACTIVE`, 105, 30, null, null, "center");
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    let y = 45;
    const lineSpacing = 10;

    const fields = [
      { label: "Student Name", value: student.student_name },
      { label: "Student ID", value: student.student_id },
      { label: "Outpass ID", value: `#${student.outpass_request_id}` },
      { label: "Destination", value: student.destination },
      { label: "Departure Time", value: new Date(student.departure_time).toLocaleString() },
      { label: "Expected Return", value: new Date(student.expected_return_time).toLocaleString() },
    ];

    fields.forEach(f => {
      doc.setFont("helvetica", "bold");
      doc.text(`${f.label}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(f.value), 60, y);
      y += lineSpacing;
    });

    doc.setDrawColor(0, 128, 0); // Green
    doc.setLineWidth(1);
    doc.rect(140, 45, 50, 50);
    doc.setTextColor(0, 128, 0);
    doc.setFontSize(16);
    doc.text("VALIDATED", 165, 72, null, null, "center");

    doc.save(`Outpass_Warden_Export_${student.outpass_request_id}.pdf`);
  };


  const handleExpireOverdue = async () => {
    setExpiringLoading(true);
    try {
      const res = await outpassAPI.expireOverdue();
      toastService.success(`✅ ${res.data.message}`);
      await fetchActiveStudents(); // refresh list
    } catch (err) {
      toastService.error(err.response?.data?.detail || 'Failed to expire overdue outpasses');
    } finally {
      setExpiringLoading(false);
    }
  };

  const now = new Date();

  const filteredStudents = activeStudents.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.student_name || '').toLowerCase().includes(q) ||
           (s.student_id || '').toLowerCase().includes(q) ||
           (s.destination || '').toLowerCase().includes(q);
  });

  const overdueCount = activeStudents.filter(
    s => s.expected_return_time && new Date(s.expected_return_time) < now
  ).length;

  if (loading) {
    return <Loading message="Loading active students..." />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in group/main">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest mb-2">
            <FiClock size={14} /> Real-time Tracking
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Active Roster</h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-[10px]">
              Live Feed {lastRefresh && `• Synchronized ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {overdueCount > 0 && (
            <button
              onClick={handleExpireOverdue}
              disabled={expiringLoading}
              className="px-6 py-3 bg-rose-500 text-white font-black text-sm rounded-xl shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95 flex items-center gap-2 group/btn"
            >
              <FiAlertTriangle className="group-hover:animate-bounce" />
              {expiringLoading ? 'Processing...' : `Expire ${overdueCount} Overdue`}
            </button>
          )}

          <button
            onClick={fetchActiveStudents}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : 'hover:rotate-180 transition-transform duration-500'} size={18} />
            <span className="font-bold text-sm tracking-wide">Sync Data</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card glass p-6 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover/card:bg-blue-500/10"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Total Active</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-gray-900 dark:text-white">{activeStudents.length}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Students</span>
          </div>
        </div>

        <div className={`premium-card glass p-6 overflow-hidden group/card ${overdueCount > 0 ? 'border-rose-500/30' : ''}`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-12 -mt-12 transition-all ${overdueCount > 0 ? 'bg-rose-500/10 group-hover/card:bg-rose-500/20' : 'bg-emerald-500/5 group-hover/card:bg-emerald-500/10'}`}></div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${overdueCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Overdue Returns</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>{overdueCount}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Late</span>
          </div>
        </div>

        <div className="premium-card glass p-6 overflow-hidden group/card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover/card:bg-indigo-500/10"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">On Schedule</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-gray-900 dark:text-white">{activeStudents.length - overdueCount}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Regular</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-lg shadow-rose-500/10">
          <FiAlertTriangle size={20} className="shrink-0" />
          <span className="font-bold text-sm tracking-wide">{error}</span>
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="premium-card glass p-2 max-w-2xl border-white/20">
        <div className="relative group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, ID, or destination..."
            className="w-full pr-4 py-3 bg-white/50 dark:bg-white/5 border-transparent focus:border-emerald-500/30 rounded-xl focus:outline-none focus:ring-0 transition-all font-bold text-sm text-gray-700 dark:text-gray-200"
            style={{ paddingLeft: '3rem' }}
          />
        </div>
      </div>

      {activeStudents.length === 0 ? (
        <div className="premium-card glass p-20 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-100 dark:border-white/5 group-hover:scale-110 transition-transform">
            <span className="text-4xl">🏠</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Campus Secure</h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">There are no students currently on active outpasses. All students are accounted for.</p>
        </div>
      ) : (
        <div className="premium-card glass overflow-hidden border-white/20 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student Profile</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Destination</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Return ETA</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monitoring</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredStudents.map((student) => {
                  const isOverdue = student.expected_return_time && new Date(student.expected_return_time) < now;
                  const batteryLow = student.battery_level !== null && student.battery_level <= 20;
                  return (
                    <tr
                      key={student.student_id}
                      className={`group transition-all duration-300 hover:bg-gray-50/50 dark:hover:bg-white/5 ${isOverdue ? 'bg-rose-500/5' : ''}`}
                    >
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">{student.student_name}</span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">{student.student_id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-bold text-gray-600 dark:text-gray-300 text-sm tracking-wide">{student.destination}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`font-black text-sm uppercase ${isOverdue ? 'text-rose-500' : 'text-gray-700 dark:text-gray-200'}`}>
                            {new Date(student.expected_return_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`text-[11px] font-bold ${isOverdue ? 'text-rose-500/70' : 'text-gray-400'}`}>
                            {new Date(student.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        {isOverdue ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-lg animate-pulse shadow-lg shadow-rose-500/20">
                            <FiAlertTriangle size={12} /> Overdue
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg">
                            <FiClock size={12} /> Active
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-[100px] h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${batteryLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${student.battery_level || 0}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-black tracking-widest ${batteryLow ? 'text-rose-500' : 'text-gray-400'} uppercase`}>
                            {student.battery_level !== null ? `${student.battery_level}%` : '---'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => exportToPDF(student)}
                          className="p-3 text-gray-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm hover:shadow-xl border border-transparent hover:border-gray-100 dark:hover:border-white/5 group/btn"
                          title="Generate Watchlist Report"
                        >
                          <FiDownload size={18} className="group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

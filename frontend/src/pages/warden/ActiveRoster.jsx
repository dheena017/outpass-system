import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import Loading from '../../components/Loading';
import toastService from '../../utils/toastService';
import { FiRefreshCw, FiAlertTriangle, FiClock, FiDownload } from 'react-icons/fi';
import { jsPDF } from 'jspdf';

export default function ActiveRoster() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

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

  const overdueCount = activeStudents.filter(
    s => s.expected_return_time && new Date(s.expected_return_time) < now
  ).length;

  if (loading) {
    return <Loading message="Loading active students..." />;
  }

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Active Roster</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live Tracking</p>
            {lastRefresh && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                • Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {overdueCount > 0 && (
            <button
              onClick={handleExpireOverdue}
              disabled={expiringLoading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 focus:ring-4 focus:ring-rose-500/30 disabled:opacity-50 text-white shadow-lg shadow-rose-500/25 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              <FiAlertTriangle />
              {expiringLoading ? 'Expiring...' : `Expire ${overdueCount} Overdue`}
            </button>
          )}
          <button
            onClick={fetchActiveStudents}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-2">Total Active</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">{activeStudents.length}</span>
            <span className="text-sm font-medium text-gray-400">students</span>
          </div>
        </div>

        <div className={`relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl group ${overdueCount > 0 ? 'border-rose-300 dark:border-rose-500/50 shadow-rose-500/10' : 'border-gray-200/50 dark:border-gray-700/50'}`}>
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all ${overdueCount > 0 ? 'bg-rose-500/20 group-hover:bg-rose-500/30' : 'bg-green-500/10 group-hover:bg-green-500/20'}`}></div>
          <p className={`text-sm uppercase tracking-wider font-bold mb-2 ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Overdue</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl sm:text-5xl font-extrabold ${overdueCount > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 bg-clip-text text-transparent animate-pulse' : 'text-emerald-500'}`}>{overdueCount}</span>
            <span className="text-sm font-medium text-gray-400">students</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gray-500/10 rounded-full blur-2xl group-hover:bg-gray-500/20 transition-all"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-2">On Time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold text-gray-700 dark:text-gray-200">{activeStudents.length - overdueCount}</span>
            <span className="text-sm font-medium text-gray-400">students</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {activeStudents.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
            <span className="text-4xl">🏠</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white mb-2">Campus is Secure</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">There are no students currently on active outpasses.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl shadow-xl overflow-x-auto ring-1 ring-black/5 dark:ring-white/5">
          <table className="min-w-full text-left border-collapse">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Profile</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Device Battery</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {activeStudents.map((student) => {
                const isOverdue = student.expected_return_time && new Date(student.expected_return_time) < now;
                const batteryLow = student.battery_level !== null && student.battery_level <= 20;
                return (
                  <tr
                    key={student.student_id}
                    className={`group transition-colors duration-200 ${isOverdue ? 'bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-100/50 dark:hover:bg-rose-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900 dark:text-white">{student.student_name}</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">{student.student_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{student.destination}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {new Date(student.expected_return_time).toLocaleDateString()}
                        </span>
                        <span className={`text-sm ${isOverdue ? 'text-rose-500 dark:text-rose-500/80' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(student.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOverdue ? (
                        <div className="inline-flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                          <FiAlertTriangle size={12} /> Overdue
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                          <FiClock size={12} /> On Time
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${batteryLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${student.battery_level || 0}%` }}
                          />
                        </div>
                        <span className={`text-xs font-extrabold tracking-wide ${batteryLow ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {student.battery_level !== null && student.battery_level !== undefined ? `${student.battery_level}%` : '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => exportToPDF(student)}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-90 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                        title="Download Outpass Document PDF"
                      >
                        <FiDownload size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

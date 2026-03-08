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
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Active Roster</h1>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Expire Overdue button — only shown if there are overdue students */}
          {overdueCount > 0 && (
            <button
              onClick={handleExpireOverdue}
              disabled={expiringLoading}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
            >
              <FiAlertTriangle />
              {expiringLoading ? 'Expiring...' : `Expire ${overdueCount} Overdue`}
            </button>
          )}
          <button
            onClick={fetchActiveStudents}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Currently Outside</p>
          <p className="text-3xl font-bold text-blue-700">{activeStudents.length}</p>
        </div>
        <div className={`rounded-lg p-4 border ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'}`}>
          <p className={`text-sm font-medium ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>Overdue</p>
          <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{overdueCount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-500 font-medium">On Time</p>
          <p className="text-3xl font-bold text-gray-700">{activeStudents.length - overdueCount}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {activeStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-gray-600 font-medium">No students currently outside</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Student ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Destination</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Expected Return</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 w-32">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 w-32">Battery</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeStudents.map((student) => {
                const isOverdue = student.expected_return_time && new Date(student.expected_return_time) < now;
                const batteryLow = student.battery_level !== null && student.battery_level <= 20;
                return (
                  <tr
                    key={student.student_id}
                    className={`border-t ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">{student.student_name}</td>
                    <td className="px-6 py-4 text-gray-600">{student.student_id}</td>
                    <td className="px-6 py-4 text-gray-600">{student.destination}</td>
                    <td className="px-6 py-4">
                      <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {new Date(student.expected_return_time).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                          <FiAlertTriangle size={10} /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                          <FiClock size={10} /> On Time
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${batteryLow ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${student.battery_level || 0}%` }}
                          />
                        </div>
                        <span className={`text-sm ${batteryLow ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                          {student.battery_level !== null && student.battery_level !== undefined ? `${student.battery_level}%` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => exportToPDF(student)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                        title="Download Outpass PDF"
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

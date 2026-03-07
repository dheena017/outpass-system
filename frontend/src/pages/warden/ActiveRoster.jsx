import { useState, useEffect } from 'react';
import { outpassAPI } from '../../api/endpoints';
import Loading from '../../components/Loading';
import { FiRefreshCw } from 'react-icons/fi';

export default function ActiveRoster() {
  const [activeStudents, setActiveStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveStudents();
    const interval = setInterval(fetchActiveStudents, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveStudents = async () => {
    try {
      const response = await outpassAPI.getActiveStudents();
      setActiveStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch active students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading active students..." />;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Active Roster</h1>
        <button
          onClick={fetchActiveStudents}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {activeStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No students currently outside</p>
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Battery</th>
              </tr>
            </thead>
            <tbody>
              {activeStudents.map((student) => (
                <tr key={student.student_id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">{student.student_name}</td>
                  <td className="px-6 py-4">{student.student_id}</td>
                  <td className="px-6 py-4">{student.destination}</td>
                  <td className="px-6 py-4">
                    {new Date(student.expected_return_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${student.battery_level || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{student.battery_level || 'N/A'}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { outpassAPI } from '../../api/endpoints';
import { FiMapPin, FiClock, FiFileText, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function RequestForm() {
  const [formData, setFormData] = useState({
    destination: '',
    reason: '',
    departure_time: '',
    expected_return_time: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');
    setLoading(true);

    const departure = new Date(formData.departure_time);
    const returnTime = new Date(formData.expected_return_time);

    if (returnTime <= departure) {
      setError('Expected return time must be strictly after the departure time.');
      setLoading(false);
      return;
    }

    try {
      await outpassAPI.submitRequest({
        ...formData,
        departure_time: new Date(formData.departure_time).toISOString(),
        expected_return_time: new Date(formData.expected_return_time).toISOString(),
      });
      setSuccess('Outpass request submitted successfully!');
      setFormData({
        destination: '',
        reason: '',
        departure_time: '',
        expected_return_time: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] p-4 sm:p-8 flex items-center justify-center animate-fade-in-up">
      <div className="w-full max-w-2xl relative">
        {/* Decorative elements behind form */}
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Request Outpass</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">Fill in your travel details to submit a new outpass request.</p>
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm shadow-sm animate-zoom-in">
              <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold uppercase text-xs tracking-wider mb-0.5">Success</p>
                <p className="text-sm font-medium">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm shadow-sm animate-zoom-in">
              <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-bold uppercase text-xs tracking-wider mb-0.5">Error</p>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl p-6 sm:p-10 space-y-8">

            <div className="group">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                <FiMapPin size={16} /> Destination
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                placeholder="Where are you traveling to?"
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white placeholder-gray-400"
              />
            </div>

            <div className="group">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                <FiFileText size={16} /> Reason
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                minLength="10"
                placeholder="Provide a valid reason for leaving the hostel..."
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white placeholder-gray-400 h-32 resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                  <FiClock size={16} /> Departure Time
                </label>
                <input
                  type="datetime-local"
                  name="departure_time"
                  value={formData.departure_time}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white"
                />
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                  <FiClock size={16} /> Expected Return
                </label>
                <input
                  type="datetime-local"
                  name="expected_return_time"
                  value={formData.expected_return_time}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-indigo-400 disabled:to-blue-400 focus:ring-4 focus:ring-indigo-500/50 text-white font-extrabold text-lg tracking-wide py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-2xl relative">
        <div className="relative z-10">
          <div className="mb-10">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
              Request Outpass
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-3">Fill in your travel details to submit a new outpass request.</p>
          </div>

          {success && (
            <div className="glass bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-5 rounded-2xl mb-8 flex items-start gap-4 animate-slide-up shadow-lg shadow-emerald-500/10">
              <FiCheckCircle className="mt-1 shrink-0" size={20} />
              <div>
                <p className="font-bold text-sm tracking-wide">Success!</p>
                <p className="text-sm opacity-90">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="glass bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 p-5 rounded-2xl mb-8 flex items-start gap-4 animate-slide-up shadow-lg shadow-rose-500/10">
              <FiAlertCircle className="mt-1 shrink-0" size={20} />
              <div>
                <p className="font-bold text-sm tracking-wide">Submission Failed</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="premium-card p-6 sm:p-10 space-y-8 glass border-white/20">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                Destination
              </label>
              <div className="relative group">
                <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Home, Hospital, etc."
                  className="input-field"
                  style={{ paddingLeft: '3rem' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                Reason for Visit
              </label>
              <div className="relative group">
                <FiFileText className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  minLength="10"
                  placeholder="Please provide a valid reason..."
                  className="input-field h-32 resize-none pt-3"
                  style={{ paddingLeft: '3rem' }}
                ></textarea>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Departure Date & Time
                </label>
                <div className="relative group">
                  <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="datetime-local"
                    name="departure_time"
                    value={formData.departure_time}
                    onChange={handleChange}
                    required
                    className="input-field"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                  Expected Return Time
                </label>
                <div className="relative group">
                  <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="datetime-local"
                    name="expected_return_time"
                    value={formData.expected_return_time}
                    onChange={handleChange}
                    required
                    className="input-field"
                    style={{ paddingLeft: '3rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-white/5">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

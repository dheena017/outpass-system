import { useState, useMemo } from 'react';
import { outpassAPI } from '../../api/endpoints';
import { FiMapPin, FiClock, FiFileText, FiCheckCircle, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import toastService from '../../utils/toastService';

const DESTINATION_CHIPS = ['Home', 'Medical / Hospital', 'Library / College', 'Market / Groceries', 'Transit / Station'];
const REASON_CHIPS = ['Family visit', 'Medical consultation', 'Academic work & library', 'Personal errands'];

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Compute duration in hours and minutes
  const calculatedDuration = useMemo(() => {
    if (!formData.departure_time || !formData.expected_return_time) return null;
    const dep = new Date(formData.departure_time).getTime();
    const ret = new Date(formData.expected_return_time).getTime();
    if (isNaN(dep) || isNaN(ret) || ret <= dep) return null;
    const diffMs = ret - dep;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h duration`;
    }
    return `${hours}h ${mins}m duration`;
  }, [formData.departure_time, formData.expected_return_time]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      setSuccess('Outpass request submitted successfully! Your warden will review it shortly.');
      toastService.success('Outpass request submitted!');
      setFormData({
        destination: '',
        reason: '',
        departure_time: '',
        expected_return_time: '',
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit outpass request';
      setError(msg);
      toastService.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Title Card */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            Student Portal
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Request an Outpass
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Complete the travel details below. Once submitted, your assigned warden will be notified.
        </p>
      </div>

      {success && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 mb-6 flex items-start gap-3.5 animate-slide-up shadow-sm">
          <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={20} />
          <div>
            <p className="font-bold text-sm">Request Submitted!</p>
            <p className="text-sm opacity-90 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-400 mb-6 flex items-start gap-3.5 animate-slide-up shadow-sm">
          <FiAlertCircle className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" size={20} />
          <div>
            <p className="font-bold text-sm">Submission Incomplete</p>
            <p className="text-sm opacity-90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        {/* Destination */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Destination Location
          </label>
          <div className="relative">
            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              required
              placeholder="e.g. City Central Hospital, Railway Station, Home"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium"
            />
          </div>

          {/* Quick Destination Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DESTINATION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, destination: chip }))}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:text-slate-300 transition-all border border-slate-200/60 dark:border-slate-700/60"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Reason for Leave
          </label>
          <div className="relative">
            <FiFileText className="absolute left-4 top-4 text-slate-400" size={18} />
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Describe why you need to leave campus..."
              rows={3}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium resize-none"
            />
          </div>

          {/* Quick Reason Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {REASON_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, reason: chip }))}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-indigo-600 dark:text-slate-300 transition-all border border-slate-200/60 dark:border-slate-700/60"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Departure Date & Time
            </label>
            <div className="relative">
              <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="datetime-local"
                name="departure_time"
                value={formData.departure_time}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Expected Return Time
              </label>
              {calculatedDuration && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                  {calculatedDuration}
                </span>
              )}
            </div>
            <div className="relative">
              <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="datetime-local"
                name="expected_return_time"
                value={formData.expected_return_time}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Submitting Request...'
            ) : (
              <>
                <span>Submit Outpass Request</span>
                <FiArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

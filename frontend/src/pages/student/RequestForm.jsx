import { useState } from 'react';
import { outpassAPI } from '../../api/endpoints';
import { FiMapPin, FiClock, FiFileText } from 'react-icons/fi';

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
      setError('Expected return time must be after the departure time.');
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
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Request Outpass</h1>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            <FiMapPin className="inline mr-2" />
            Destination
          </label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            required
            placeholder="Where are you going?"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            <FiFileText className="inline mr-2" />
            Reason
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            minLength="10"
            placeholder="Why do you need to leave the hostel?"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <FiClock className="inline mr-2" />
              Departure Time
            </label>
            <input
              type="datetime-local"
              name="departure_time"
              value={formData.departure_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <FiClock className="inline mr-2" />
              Expected Return Time
            </label>
            <input
              type="datetime-local"
              name="expected_return_time"
              value={formData.expected_return_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

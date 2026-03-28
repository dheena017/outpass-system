import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/endpoints';
import { getStatusMessage } from '../utils/statusMessages';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAtSign, FiPhone, FiHash, FiArrowLeft } from 'react-icons/fi';
import Logo from '../components/Logo';
import { nativeImpact } from '../utils/native';

export default function RegisterPage() {
  const [userType, setUserType] = useState('student');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    student_id: '',
    warden_id: '',
    phone_number: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    await nativeImpact();

    try {
      if (userType === 'student') {
        await authAPI.registerStudent({
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          student_id: formData.student_id,
          phone_number: formData.phone_number,
        });
      } else {
        await authAPI.registerWarden({
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          warden_id: formData.warden_id,
          phone_number: formData.phone_number,
        });
      }

      navigate('/login');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      setError(detail || getStatusMessage(status, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="glass premium-card w-full max-w-md p-8 relative z-10 animate-slide-up">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="md" className="mb-6" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Create Account
          </h1>
          <p className="text-gray-400 mt-2">Join the Outpass System today</p>
        </div>

        <div className="flex gap-2 mb-8 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setUserType('student')}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all duration-300 ${userType === 'student'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            Student
          </button>
          <button
            onClick={() => setUserType('warden')}
            className={`flex-1 py-2.5 rounded-xl font-semibold transition-all duration-300 ${userType === 'warden'
              ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            Warden
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl mb-6 text-sm animate-fade-in text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 ml-1">First Name</label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  name="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 ml-1">Last Name</label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Email Address</label>
            <div className="relative group">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="email"
                name="email"
                placeholder="EMAIL ADDRESS"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field pl-10"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Username</label>
            <div className="relative group">
              <FiAtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                name="username"
                placeholder="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="input-field pl-10"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">
              {userType === 'student' ? 'Student ID' : 'Warden ID'}
            </label>
            <div className="relative group">
              <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                name={userType === 'student' ? 'student_id' : 'warden_id'}
                placeholder={userType === 'student' ? 'STUDENT ID' : 'WARDEN ID'}
                value={userType === 'student' ? formData.student_id : formData.warden_id}
                onChange={handleChange}
                required
                className="input-field pl-10"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Phone Number</label>
            <div className="relative group">
              <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="tel"
                name="phone_number"
                placeholder="PHONE NUMBER"
                value={formData.phone_number}
                onChange={handleChange}
                className="input-field pl-10"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
            <div className="relative group">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="PASSWORD"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field pl-10 pr-10"
                style={{ paddingLeft: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">Confirm Password</label>
            <div className="relative group">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm_password"
                placeholder="CONFIRM PASSWORD"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                className="input-field pl-10 pr-10"
                style={{ paddingLeft: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary mt-4"
            
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : 'Register Now'}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-blue-500 hover:text-blue-600 font-bold transition-colors">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}


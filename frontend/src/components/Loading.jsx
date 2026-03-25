import { FiLoader } from 'react-icons/fi';
import PropTypes from 'prop-types';

export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative inline-block">
          {/* Animated spinner */}
          <FiLoader className="w-16 h-16 text-blue-600 animate-spin" />
          
          {/* Pulsing circle background */}
          <div className="absolute inset-0 -z-10">
            <div className="w-24 h-24 bg-blue-200 rounded-full animate-ping opacity-20 -ml-4 -mt-4"></div>
          </div>
        </div>
        
        {/* Loading text */}
        <h2 className="mt-6 text-xl font-semibold text-gray-800">{message}</h2>
        
        {/* Loading dots animation */}
        <div className="flex justify-center mt-3 space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Subtext */}
        <p className="mt-4 text-sm text-gray-600">Please wait while we set things up</p>
      </div>
    </div>
  );
}

Loading.propTypes = {
  message: PropTypes.string
};

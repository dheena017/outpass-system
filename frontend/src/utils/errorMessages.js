/**
 * Error message mapping and user-friendly error handler
 * Converts API errors and validation errors to helpful user messages
 */

// API error code to user-friendly message mapping
const errorMessageMap = {
  // Authentication errors
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  
  // Request validation errors
  400: 'Invalid request. Please check your input and try again.',
  422: 'Some fields are invalid. Please review and correct them.',
  
  // Resource errors
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  
  // Server errors
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service is under maintenance. Please try again later.',
  
  // Network errors
  'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
  'TIMEOUT': 'Request timed out. Please try again.',
};

// Field validation error messages
const fieldValidationMap = {
  email: 'Please enter a valid email address',
  username: 'Username must be 3-50 characters, alphanumeric and underscores only',
  password: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  first_name: 'First name is required',
  last_name: 'Last name is required',
  student_id: 'Student ID is required',
  destination: 'Destination is required',
  reason: 'Reason for outpass is required',
  departure_time: 'Departure time is required',
  expected_return_time: 'Expected return time is required',
  rejection_reason: 'Rejection reason is required',
};

// Operation-specific error messages
const operationErrorMap = {
  'REGISTER': {
    'email_exists': 'This email is already registered. Please use a different email.',
    'username_exists': 'This username is already taken. Please choose another.',
    'invalid_email': 'Please enter a valid email address.',
    'weak_password': 'Password is too weak. Use uppercase, lowercase, numbers and special characters.',
  },
  'LOGIN': {
    'invalid_credentials': 'Email or password is incorrect. Please try again.',
    'user_not_found': 'No account found with this email address.',
  },
  'CREATE_REQUEST': {
    'invalid_dates': 'Return time must be after departure time.',
    'past_departure': 'Departure time cannot be in the past.',
    'existing_active': 'You already have an active outpass request. Complete it before creating a new one.',
  },
  'UPDATE_REQUEST': {
    'invalid_status': 'This status transition is not allowed.',
    'request_not_found': 'Request not found or you do not have permission to modify it.',
  },
  'LOCATION_TRACKING': {
    'permission_denied': 'Location permission denied. Enable it in your browser settings.',
    'unavailable': 'Location service is unavailable on your device.',
    'timeout': 'Location request timed out. Please try again.',
  },
};

/**
 * Extract user-friendly error message from API error response
 * @param {Error|Object} error - The error object from axios or native Error
 * @param {String} operation - The operation context (e.g., 'REGISTER', 'LOGIN', 'CREATE_REQUEST')
 * @returns {String} User-friendly error message
 */
export function getErrorMessage(error, operation = null) {
  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return errorMessageMap['TIMEOUT'];
    }
    if (error.message && error.message.includes('Network')) {
      return errorMessageMap['NETWORK_ERROR'];
    }
    return error.message || 'An unexpected error occurred.';
  }

  const status = error.response.status;
  const data = error.response.data;

  // Check for operation-specific error messages
  if (operation && operationErrorMap[operation]) {
    // Look for error code in response
    if (data.error_code && operationErrorMap[operation][data.error_code]) {
      return operationErrorMap[operation][data.error_code];
    }
    
    // Look for specific field errors
    if (data.errors && typeof data.errors === 'object') {
      const firstError = Object.values(data.errors)[0];
      if (firstError) return firstError;
    }
  }

  // Check for detail message from API
  if (data.detail) {
    // If detail is a string, try to parse it for better messages
    if (typeof data.detail === 'string') {
      // Handle common API patterns
      if (data.detail.includes('already exists')) {
        return data.detail;
      }
      if (data.detail.includes('not found')) {
        return data.detail;
      }
      if (data.detail.includes('invalid') || data.detail.includes('Invalid')) {
        return data.detail;
      }
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail[0]?.msg || errorMessageMap[status] || 'An error occurred.';
    }
  }

  // Check for validation errors (Pydantic format)
  if (data.errors && Array.isArray(data.errors)) {
    const firstError = data.errors[0];
    if (firstError.msg) {
      return firstError.msg;
    }
    if (firstError.loc && firstError.loc[1] && fieldValidationMap[firstError.loc[1]]) {
      return fieldValidationMap[firstError.loc[1]];
    }
  }

  // Fall back to status code message
  return errorMessageMap[status] || `Error: ${status}. Please try again.`;
}

/**
 * Get field-specific validation error message
 * @param {String} fieldName - The name of the form field
 * @param {String} validationType - Type of validation (e.g., 'required', 'email', 'minLength')
 * @returns {String} Validation error message
 */
export function getFieldValidationMessage(fieldName, validationType = null) {
  if (fieldValidationMap[fieldName]) {
    return fieldValidationMap[fieldName];
  }

  const messageMap = {
    'required': `${fieldName} is required`,
    'email': 'Please enter a valid email address',
    'minLength': `${fieldName} is too short`,
    'maxLength': `${fieldName} is too long`,
    'pattern': `${fieldName} format is invalid`,
  };

  return messageMap[validationType] || `Invalid ${fieldName}`;
}

/**
 * Format validation errors from form submission
 * @param {Object} errors - Object with field names as keys and error messages as values
 * @returns {Object} Formatted error messages
 */
export function formatValidationErrors(errors) {
  const formatted = {};
  Object.entries(errors).forEach(([field, error]) => {
    formatted[field] = typeof error === 'string' ? error : getFieldValidationMessage(field);
  });
  return formatted;
}

export default {
  getErrorMessage,
  getFieldValidationMessage,
  formatValidationErrors,
};

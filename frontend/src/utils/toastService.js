import { toast } from 'react-toastify';

/**
 * Toast notification service
 * Provides centralized toast notifications for the app
 */

export const toastService = {
  success: (message, options = {}) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  error: (message, options = {}) => {
    toast.error(message, {
      position: 'bottom-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  info: (message, options = {}) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
    });
  },

  update: (toastId, updates) => {
    toast.update(toastId, {
      render: updates.message,
      type: updates.type || 'default',
      isLoading: updates.isLoading || false,
      autoClose: updates.autoClose !== undefined ? updates.autoClose : 3000,
      ...updates,
    });
  },

  dismiss: (toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};

export default toastService;

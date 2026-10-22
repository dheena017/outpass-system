import { toast, ToastOptions } from 'react-toastify';
import { useNotificationStore } from '../store';

/**
 * Toast notification service
 * Positions all toasts on the LEFT side with dark/light mode synchronization
 */

export const toastService = {
  success: (message: string, options: ToastOptions = {}) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });

    try {
      useNotificationStore.getState().addNotification({
        title: 'Action Succeeded',
        message,
        type: 'success',
      });
    } catch {
      /* ignore */
    }
  },

  error: (message: string, options: ToastOptions = {}) => {
    toast.error(message, {
      toastId: message,
      position: 'bottom-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });

    try {
      useNotificationStore.getState().addNotification({
        title: 'System Alert',
        message,
        type: 'error',
      });
    } catch {
      /* ignore */
    }
  },

  info: (message: string, options: ToastOptions = {}) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });

    try {
      useNotificationStore.getState().addNotification({
        title: 'Information',
        message,
        type: 'info',
      });
    } catch {
      /* ignore */
    }
  },

  warning: (message: string, options: ToastOptions = {}) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });

    try {
      useNotificationStore.getState().addNotification({
        title: 'Security Warning',
        message,
        type: 'warning',
      });
    } catch {
      /* ignore */
    }
  },

  loading: (message: string, options: ToastOptions = {}) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
    });
  },

  update: (toastId: any, updates: any) => {
    toast.update(toastId, {
      render: updates.message,
      type: updates.type || 'default',
      isLoading: updates.isLoading || false,
      autoClose: updates.autoClose !== undefined ? updates.autoClose : 3000,
      ...updates,
    });
  },

  dismiss: (toastId?: any) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};

export default toastService;

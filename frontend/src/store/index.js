import { create } from 'zustand';
import { toast } from 'react-toastify';
import { getStatusMessage } from '../utils/statusMessages';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },


  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        set({
          token,
          user: JSON.parse(user),
          isAuthenticated: true,
          isInitialized: true,
        });
      } catch (error) {
        console.error('Failed to parse user session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));

export const useOutpassStore = create((set) => ({
  requests: [],
  activeStudents: [],
  currentRequest: null,
  loading: false,
  error: null,

  setRequests: (requests) => set({ requests }),
  setActiveStudents: (students) => set({ activeStudents: students }),
  setCurrentRequest: (request) => set({ currentRequest: request }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export const useLocationStore = create((set) => ({
  locations: [],
  studentLocation: null,

  setLocations: (locations) => set({ locations }),
  setStudentLocation: (location) => set({ studentLocation: location }),
  addLocation: (location) => set((state) => ({
    locations: [...state.locations, location],
  })),
}));

export const useThemeStore = create((set) => ({
  dark: localStorage.getItem('theme') === 'dark',
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return { dark: next };
    }),
  init: () => {
    const isDark = localStorage.getItem('theme') === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    set({ dark: isDark });
  },
}));

export const useSidebarStore = create((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (isOpen) => set({ isOpen }),
}));

import { create } from 'zustand';

export interface User {
  id?: number;
  email?: string;
  role?: 'student' | 'warden' | string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  student_id?: string;
  room_number?: string;
  phone_number?: string;
  hostel_block?: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  login: (user: User, token: string) => {
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

export interface OutpassState {
  requests: any[];
  activeStudents: any[];
  currentRequest: any | null;
  loading: boolean;
  error: string | null;
  setRequests: (requests: any[]) => void;
  setActiveStudents: (students: any[]) => void;
  setCurrentRequest: (request: any | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOutpassStore = create<OutpassState>((set) => ({
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

export interface LocationState {
  locations: any[];
  studentLocation: any | null;
  setLocations: (locations: any[]) => void;
  setStudentLocation: (location: any | null) => void;
  addLocation: (location: any) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  studentLocation: null,

  setLocations: (locations) => set({ locations }),
  setStudentLocation: (location) => set({ studentLocation: location }),
  addLocation: (location) =>
    set((state) => ({
      locations: [...state.locations, location],
    })),
}));

export interface ThemeState {
  dark: boolean;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
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

export interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
}));

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval' | 'security';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  addNotification: (item: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Outpass Approved',
    message: 'Your outpass request to City Central Hospital has been approved by the Warden.',
    type: 'approval',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    link: '/student/status',
  },
  {
    id: 'notif-2',
    title: 'Security Gate Checkpoint',
    message: 'Dynamic QR validated at Campus Gate 1. Departure confirmed.',
    type: 'security',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Curfew Return Reminder',
    message: 'Reminder: Expected return time is set to 8:30 PM today. Ensure prompt return.',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Live Telemetry Active',
    message: 'Geofencing boundary monitoring is running smoothly for active student leaves.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    read: true,
  },
];

const loadStoredNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem('outpass_notifications');
    return raw ? JSON.parse(raw) : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
};

const saveNotifications = (items: AppNotification[]) => {
  try {
    localStorage.setItem('outpass_notifications', JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: loadStoredNotifications(),

  addNotification: (item) =>
    set((state) => {
      const newEntry: AppNotification = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [newEntry, ...state.notifications];
      saveNotifications(updated);
      return { notifications: updated };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return { notifications: updated };
    }),

  markAllAsRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return { notifications: updated };
    }),

  deleteNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveNotifications(updated);
      return { notifications: updated };
    }),

  clearAll: () =>
    set(() => {
      saveNotifications([]);
      return { notifications: [] };
    }),
}));

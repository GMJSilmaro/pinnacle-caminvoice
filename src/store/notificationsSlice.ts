import { StateCreator } from "zustand";

export type NotificationType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'invoice-created'
  | 'invoice-submitted'
  | 'invoice-deleted'
  | 'invoice-accepted'
  | 'invoice-rejected'
  | 'invoice-delivered'
  | 'note-created'
  | 'note-submitted'
  | 'note-deleted'
  | 'bulk-upload'
  | 'system';

export type NotificationItem = {
  id: string;
  title: string;
  message?: string;
  link?: string;
  createdAt: number; // epoch ms
  read: boolean;
  type?: NotificationType; // Type for icon selection
  user?: {
    id?: string;
    name?: string;
    email?: string;
  }; // Who performed the action
};

export interface NotificationsSlice {
  notifications: NotificationItem[];
  addNotification: (n: NotificationItem) => void;
  addNotifications: (items: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const STORAGE_KEY = 'pinnacle-notifications';
const MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

// Load notifications from localStorage
const loadNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out notifications older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return parsed.filter((n: NotificationItem) => n.createdAt > thirtyDaysAgo);
    }
  } catch (error) {
    console.error('Failed to load notifications from localStorage:', error);
  }
  return [];
};

// Save notifications to localStorage
const saveNotifications = (notifications: NotificationItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    // Keep only the most recent notifications`
    const toSave = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save notifications to localStorage:', error);
  }
};

const createNotificationsSlice: StateCreator<NotificationsSlice> = (set, get) => ({
  // Initialize as empty array to avoid SSR issues - load from localStorage on client side
  notifications: [],

  addNotification: (n) =>
    set((state) => {
      const updated = [n, ...state.notifications];
      saveNotifications(updated);
      return { notifications: updated };
    }),

  addNotifications: (items) =>
    set((state) => {
      // Avoid duplicates by checking IDs
      const existingIds = new Set(state.notifications.map(n => n.id));
      const newItems = items.filter(item => !existingIds.has(item.id));
      if (newItems.length === 0) return state;
      
      const updated = [...newItems, ...state.notifications];
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

  removeNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      saveNotifications(updated);
      return { notifications: updated };
    }),
});

export default createNotificationsSlice;


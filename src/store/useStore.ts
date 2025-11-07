import { create } from "zustand"
import createAppSlice, { AppSlice } from "./appSlice"
import createNotificationsSlice, {
  NotificationsSlice,
} from "./notificationsSlice";

export type RootStore = AppSlice & NotificationsSlice;

/**
 * Global Client Store
 * @example const something = useStore((state) => state.notifications)
 */
export const useStore = create<RootStore>((...a) => ({
  ...createAppSlice(...a),
  ...createNotificationsSlice(...a),
}));

// Initialize notifications from localStorage on client side after store creation
if (typeof window !== 'undefined') {
  // Load notifications after a short delay to ensure store is ready
  setTimeout(() => {
    try {
      const stored = localStorage.getItem('pinnacle-notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const filtered = parsed.filter((n: any) => n.createdAt > thirtyDaysAgo);
        if (filtered.length > 0) {
          const store = useStore.getState();
          if (store && store.addNotifications) {
            store.addNotifications(filtered);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize notifications from localStorage:', error);
    }
  }, 100);
}

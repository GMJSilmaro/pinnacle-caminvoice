import { notifications } from '@mantine/notifications';
import { 
  IconCheck, 
  IconX, 
  IconAlertTriangle, 
  IconInfoCircle,
  IconFileInvoice,
  IconTrash,
  IconSend,
  IconCircleCheck,
  IconCircleX,
  IconMail,
  IconFileText,
  IconUpload,
  IconBell,
  IconUser,
} from '@tabler/icons-react';
import { createElement } from 'react';
import type { NotificationItem, NotificationType } from '../store/notificationsSlice';

// Helper to get current user info
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    // Try to get from auth hook/store
    const authModule = require('../hooks/useAuth');
    // This is a bit tricky - we'll need to get user from store or pass it
    return null; // Will be handled by passing user info when creating notifications
  } catch {
    return null;
  }
};

// Helper to get icon component based on notification type
export const getNotificationIcon = (type?: NotificationType) => {
  const iconProps = { size: 18, stroke: 1.5 };
  
  switch (type) {
    case 'invoice-created':
      return IconFileInvoice;
    case 'invoice-submitted':
      return IconSend;
    case 'invoice-deleted':
      return IconTrash;
    case 'invoice-accepted':
      return IconCircleCheck;
    case 'invoice-rejected':
      return IconCircleX;
    case 'invoice-delivered':
      return IconMail;
    case 'note-created':
    case 'note-submitted':
      return IconFileText;
    case 'note-deleted':
      return IconTrash;
    case 'bulk-upload':
      return IconUpload;
    case 'success':
      return IconCheck;
    case 'error':
      return IconX;
    case 'warning':
      return IconAlertTriangle;
    case 'info':
      return IconInfoCircle;
    case 'system':
      return IconBell;
    default:
      return IconBell;
  }
};

// Store reference - will be set when available
let storeInstance: any = null;

// Helper to get store instance (only on client side)
const getStore = () => {
  if (typeof window === 'undefined') return null;
  
  // Try to get cached instance first
  if (storeInstance) return storeInstance;
  
  try {
    // Use dynamic import to avoid SSR issues
    const storeModule = require('../store/useStore');
    const store = storeModule.useStore;
    if (store && typeof store.getState === 'function') {
      storeInstance = store.getState();
      return storeInstance;
    }
  } catch (error) {
    console.warn('Failed to get store instance:', error);
  }
  return null;
};

// Helper to get user info from store or context
const getUserInfo = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    // Try to get from auth context via store
    const store = getStore();
    // User info should be passed when creating notifications, but we can try to get it
    return undefined; // Will be set by caller
  } catch {
    return undefined;
  }
};

// Helper to add notification to store
const addToStore = (
  notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
  userInfo?: { id?: string; name?: string; email?: string }
) => {
  try {
    // Add user info if provided
    const notificationWithUser = {
      ...notification,
      ...(userInfo && { user: userInfo }),
    };

    const store = getStore();
    if (!store || !store.addNotification) {
      // Store not ready yet, try again after a short delay
      setTimeout(() => {
        const retryStore = getStore();
        if (retryStore && retryStore.addNotification) {
          const notificationItem: NotificationItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...notificationWithUser,
            createdAt: Date.now(),
            read: false,
          };
          retryStore.addNotification(notificationItem);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Notification added to store (retry):', notificationItem.title);
          }
        } else {
          console.warn('⚠️ Store still not available after retry');
        }
      }, 100);
      return;
    }
    
    const notificationItem: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notificationWithUser,
      createdAt: Date.now(),
      read: false,
    };
    
    store.addNotification(notificationItem);
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Notification added to store:', notificationItem.title, notificationItem);
    }
  } catch (error) {
    console.error('❌ Failed to add notification to store:', error);
  }
};

// Test function to add sample notifications (for development/testing)
export const addTestNotification = () => {
  addToStore({
    title: 'Test Notification',
    message: 'This is a test notification to verify the system is working!',
    link: '/invoices',
  });
  
  notifications.show({
    title: 'Test Notification',
    message: 'Test notification added to store!',
    color: 'blue',
    icon: createElement(IconInfoCircle, { size: 16 }),
    autoClose: 3000,
  });
};

// Make test function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).addTestNotification = addTestNotification;
}

export const showNotification = {
  success: (
    message: string, 
    title?: string, 
    options?: { 
      addToStore?: boolean; 
      link?: string; 
      type?: NotificationType;
      user?: { id?: string; name?: string; email?: string };
    }
  ) => {
    const finalTitle = title || 'Success';
    const notificationType = options?.type || 'success';
    
    // Show toast notification
    notifications.show({
      title: finalTitle,
      message,
      color: 'green',
      icon: createElement(IconCheck, { size: 16 }),
      autoClose: 4000,
      withCloseButton: true,
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-green-0)',
          borderColor: 'var(--mantine-color-green-3)',
        },
        title: {
          color: 'var(--mantine-color-green-9)',
          fontWeight: 600,
        },
        description: {
          color: 'var(--mantine-color-green-8)',
        },
        closeButton: {
          color: 'var(--mantine-color-green-6)',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-green-1)',
          },
        },
      },
    });

    // Add to store if requested
    if (options?.addToStore !== false) {
      addToStore({
        title: finalTitle,
        message,
        link: options?.link,
        type: notificationType,
      }, options?.user);
    }
  },

  error: (
    message: string, 
    title?: string, 
    options?: { 
      addToStore?: boolean; 
      link?: string; 
      type?: NotificationType;
      user?: { id?: string; name?: string; email?: string };
    }
  ) => {
    const finalTitle = title || 'Error';
    const notificationType = options?.type || 'error';
    
    // Show toast notification
    notifications.show({
      title: finalTitle,
      message,
      color: 'red',
      icon: createElement(IconX, { size: 16 }),
      autoClose: 6000,
      withCloseButton: true,
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-red-0)',
          borderColor: 'var(--mantine-color-red-3)',
        },
        title: {
          color: 'var(--mantine-color-red-9)',
          fontWeight: 600,
        },
        description: {
          color: 'var(--mantine-color-red-8)',
        },
        closeButton: {
          color: 'var(--mantine-color-red-6)',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-red-1)',
          },
        },
      },
    });

    // Add to store if requested
    if (options?.addToStore !== false) {
      addToStore({
        title: finalTitle,
        message,
        link: options?.link,
        type: notificationType,
      }, options?.user);
    }
  },

  warning: (
    message: string, 
    title?: string, 
    options?: { 
      addToStore?: boolean; 
      link?: string; 
      type?: NotificationType;
      user?: { id?: string; name?: string; email?: string };
    }
  ) => {
    const finalTitle = title || 'Warning';
    const notificationType = options?.type || 'warning';
    
    // Show toast notification
    notifications.show({
      title: finalTitle,
      message,
      color: 'orange',
      icon: createElement(IconAlertTriangle, { size: 16 }),
      autoClose: 5000,
      withCloseButton: true,
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-orange-0)',
          borderColor: 'var(--mantine-color-orange-3)',
        },
        title: {
          color: 'var(--mantine-color-orange-9)',
          fontWeight: 600,
        },
        description: {
          color: 'var(--mantine-color-orange-8)',
        },
        closeButton: {
          color: 'var(--mantine-color-orange-6)',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-orange-1)',
          },
        },
      },
    });

    // Add to store if requested
    if (options?.addToStore !== false) {
      addToStore({
        title: finalTitle,
        message,
        link: options?.link,
        type: notificationType,
      }, options?.user);
    }
  },

  info: (
    message: string, 
    title?: string, 
    options?: { 
      addToStore?: boolean; 
      link?: string; 
      type?: NotificationType;
      user?: { id?: string; name?: string; email?: string };
    }
  ) => {
    const finalTitle = title || 'Information';
    const notificationType = options?.type || 'info';
    
    // Show toast notification
    notifications.show({
      title: finalTitle,
      message,
      color: 'blue',
      icon: createElement(IconInfoCircle, { size: 16 }),
      autoClose: 4000,
      withCloseButton: true,
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-blue-0)',
          borderColor: 'var(--mantine-color-blue-3)',
        },
        title: {
          color: 'var(--mantine-color-blue-9)',
          fontWeight: 600,
        },
        description: {
          color: 'var(--mantine-color-blue-8)',
        },
        closeButton: {
          color: 'var(--mantine-color-blue-6)',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-blue-1)',
          },
        },
      },
    });

    // Add to store if requested
    if (options?.addToStore !== false) {
      addToStore({
        title: finalTitle,
        message,
        link: options?.link,
        type: notificationType,
      }, options?.user);
    }
  },

  // CamInvoice specific notifications
  camInvoice: {
    submitted: (
      invoiceNumber: string, 
      invoiceId?: string,
      userInfo?: { id?: string; name?: string; email?: string }
    ) => {
      const title = 'Invoice Submitted';
      const message = `Invoice ${invoiceNumber} has been successfully submitted to CamInvoice`;
      
      notifications.show({
        title,
        message,
        color: 'teal',
        icon: createElement(IconSend, { size: 16 }),
        autoClose: 5000,
        withCloseButton: true,
      });

      // Add to store with link to invoice
      addToStore({
        title,
        message,
        link: invoiceId ? `/invoices/${invoiceId}` : undefined,
        type: 'invoice-submitted',
      }, userInfo);
    },

    accepted: (
      invoiceNumber: string, 
      invoiceId?: string,
      userInfo?: { id?: string; name?: string; email?: string }
    ) => {
      const title = 'Invoice Accepted';
      const message = `Invoice ${invoiceNumber} has been accepted by CamInvoice`;
      
      notifications.show({
        title,
        message,
        color: 'green',
        icon: createElement(IconCircleCheck, { size: 16 }),
        autoClose: 5000,
        withCloseButton: true,
      });

      // Add to store with link to invoice
      addToStore({
        title,
        message,
        link: invoiceId ? `/invoices/${invoiceId}` : undefined,
        type: 'invoice-accepted',
      }, userInfo);
    },

    rejected: (
      invoiceNumber: string, 
      reason?: string, 
      invoiceId?: string,
      userInfo?: { id?: string; name?: string; email?: string }
    ) => {
      const title = 'Invoice Rejected';
      const message = `Invoice ${invoiceNumber} was rejected${reason ? `: ${reason}` : ''}`;
      
      notifications.show({
        title,
        message,
        color: 'red',
        icon: createElement(IconCircleX, { size: 16 }),
        autoClose: 8000,
        withCloseButton: true,
      });

      // Add to store with link to invoice
      addToStore({
        title,
        message,
        link: invoiceId ? `/invoices/${invoiceId}` : undefined,
        type: 'invoice-rejected',
      }, userInfo);
    },

    connectionError: () => {
      notifications.show({
        title: 'Connection Error',
        message: 'Unable to connect to CamInvoice. Please check your connection settings.',
        color: 'red',
        icon: createElement(IconX, { size: 16 }),
        autoClose: 6000,
        withCloseButton: true,
      });
    },
  },

  // Loading notifications with custom IDs for updates
  loading: {
    show: (id: string, message: string) => {
      notifications.show({
        id,
        title: 'Processing...',
        message,
        color: 'blue',
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });
    },

    update: (id: string, message: string, type: 'success' | 'error' | 'warning' = 'success', options?: { addToStore?: boolean; link?: string; type?: NotificationType; user?: { id?: string; name?: string; email?: string } }) => {
      const config = {
        success: {
          color: 'green',
          icon: createElement(IconCheck, { size: 16 }),
          title: 'Success',
        },
        error: {
          color: 'red',
          icon: createElement(IconX, { size: 16 }),
          title: 'Error',
        },
        warning: {
          color: 'orange',
          icon: createElement(IconAlertTriangle, { size: 16 }),
          title: 'Warning',
        },
      };

      notifications.update({
        id,
        ...config[type],
        message,
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });

      // Add to store if requested
      if (options?.addToStore !== false) {
        addToStore({
          title: config[type].title,
          message,
          link: options?.link,
          type: options?.type,
        }, options?.user);
      }
    },

    hide: (id: string) => {
      notifications.hide(id);
    },
  },

  // Clean all notifications
  clean: () => {
    notifications.clean();
  },
};

// Navigation progress utilities
export const navigationProgress = {
  start: () => {
    // This will be implemented with nprogress
    if (typeof window !== 'undefined') {
      const { nprogress } = require('@mantine/nprogress');
      nprogress.start();
    }
  },

  complete: () => {
    if (typeof window !== 'undefined') {
      const { nprogress } = require('@mantine/nprogress');
      nprogress.complete();
    }
  },

  increment: (amount?: number) => {
    if (typeof window !== 'undefined') {
      const { nprogress } = require('@mantine/nprogress');
      nprogress.increment(amount);
    }
  },

  set: (progress: number) => {
    if (typeof window !== 'undefined') {
      const { nprogress } = require('@mantine/nprogress');
      nprogress.set(progress);
    }
  },
};

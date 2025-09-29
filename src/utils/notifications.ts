import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { createElement } from 'react';

export const showNotification = {
  success: (message: string, title?: string) => {
    notifications.show({
      title: title || 'Success',
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
  },

  error: (message: string, title?: string) => {
    notifications.show({
      title: title || 'Error',
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
  },

  warning: (message: string, title?: string) => {
    notifications.show({
      title: title || 'Warning',
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
  },

  info: (message: string, title?: string) => {
    notifications.show({
      title: title || 'Information',
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
  },

  // CamInvoice specific notifications
  camInvoice: {
    submitted: (invoiceNumber: string) => {
      notifications.show({
        title: 'Invoice Submitted',
        message: `Invoice ${invoiceNumber} has been successfully submitted to CamInvoice`,
        color: 'teal',
        icon: createElement(IconCheck, { size: 16 }),
        autoClose: 5000,
        withCloseButton: true,
      });
    },

    accepted: (invoiceNumber: string) => {
      notifications.show({
        title: 'Invoice Accepted',
        message: `Invoice ${invoiceNumber} has been accepted by CamInvoice`,
        color: 'green',
        icon: createElement(IconCheck, { size: 16 }),
        autoClose: 5000,
        withCloseButton: true,
      });
    },

    rejected: (invoiceNumber: string, reason?: string) => {
      notifications.show({
        title: 'Invoice Rejected',
        message: `Invoice ${invoiceNumber} was rejected${reason ? `: ${reason}` : ''}`,
        color: 'red',
        icon: createElement(IconX, { size: 16 }),
        autoClose: 8000,
        withCloseButton: true,
      });
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

    update: (id: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
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

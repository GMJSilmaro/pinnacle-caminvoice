'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { nprogress } from '@mantine/nprogress';

export function useNavigationProgress() {
  const pathname = usePathname();

  useEffect(() => {
    // Complete progress when route changes
    nprogress.complete();
  }, [pathname]);

  const startProgress = () => {
    nprogress.start();
  };

  const completeProgress = () => {
    nprogress.complete();
  };

  const incrementProgress = (amount?: number) => {
    nprogress.increment(amount);
  };

  const setProgress = (progress: number) => {
    nprogress.set(progress);
  };

  return {
    startProgress,
    completeProgress,
    incrementProgress,
    setProgress,
  };
}

// Hook for form submissions and API calls
export function useLoadingProgress() {
  const startLoading = (message?: string) => {
    nprogress.start();
    // You can combine this with notifications if needed
  };

  const completeLoading = () => {
    nprogress.complete();
  };

  const updateProgress = (progress: number) => {
    nprogress.set(progress);
  };

  return {
    startLoading,
    completeLoading,
    updateProgress,
  };
}

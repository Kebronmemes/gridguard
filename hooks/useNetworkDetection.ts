"use client";

import { useEffect, useState } from 'react';

/**
 * useNetworkDetection
 * Tracks if the user's internet connection drops and pings the server.
 * Used for "Auto-Report" logic when multiple users in the same area go offline.
 */
export function useNetworkDetection() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      
      // OPTIONAL: Send a "Signal Loss" ping if they still have a tiny bit of cache-send capability
      // Or store the last known location for the auto-report clustering.
      const lastLoc = localStorage.getItem('gridguard_last_location');
      if (lastLoc) {
        console.log('[Auto-Report] Signal lost! Last known area:', JSON.parse(lastLoc).area);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

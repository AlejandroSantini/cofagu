import { useEffect, useRef } from 'react';
import { AUTO_REFRESH_INTERVAL_MS } from '../config/constants';

/**
 * Custom hook to trigger periodic auto-refresh callback.
 * @param callback Function to execute on every interval.
 * @param intervalMs Refresh interval in ms (defaults to AUTO_REFRESH_INTERVAL_MS).
 */
export const useAutoRefresh = (
  callback: () => void,
  intervalMs: number = AUTO_REFRESH_INTERVAL_MS
) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
};

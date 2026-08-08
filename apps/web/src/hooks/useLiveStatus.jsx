import { useEffect, useState } from 'react';
import liveFeed from '@/lib/liveFeed';

// Exposes the shared Binance WebSocket connection status for freshness badges.
export function useLiveStatus() {
  const [status, setStatus] = useState(liveFeed.status);
  useEffect(() => liveFeed.onStatus(setStatus), []);
  return status; // idle | connecting | connected | reconnecting | offline
}

export default useLiveStatus;

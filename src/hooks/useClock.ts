import { useEffect, useState } from 'react';

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useClock() {
  const [time, setTime] = useState(getCurrentTime);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTime(getCurrentTime()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return time;
}

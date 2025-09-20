import { useState, useEffect } from 'react';
import { ISSPosition } from '../types';
import { fetchISSPosition } from '../services/api';

export const useISSPosition = (updateInterval: number = 3000) => {
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updatePosition = async () => {
      try {
        const data = await fetchISSPosition();
        setPosition(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch ISS position');
        setLoading(false);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return { position, loading, error };
};

import { useState, useEffect } from 'react';

interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  error: string | null;
}

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    altitude: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude, // This might be null
        error: null,
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      setLocation(prev => ({ ...prev, error: err.message }));
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return location;
};

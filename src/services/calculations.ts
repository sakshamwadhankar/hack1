import * as THREE from 'three';

export const toCartesian = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
) => {
  const EARTH_RADIUS = 6371; // Earth's radius in kilometers
  
  const point1 = toCartesian(lat1, lon1, EARTH_RADIUS + alt1);
  const point2 = toCartesian(lat2, lon2, EARTH_RADIUS + alt2);
  
  return point1.distanceTo(point2);
};

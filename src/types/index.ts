export interface ISSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

export interface Astronaut {
  name: string;
  craft: string;
}

export interface CrewData {
  people: Astronaut[];
  number: number;
  message: string;
}

export interface OrbitPoint {
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

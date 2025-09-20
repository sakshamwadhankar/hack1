import axios from 'axios';
import { ISSPosition, CrewData } from '../types';

const ISS_API_BASE = 'https://api.wheretheiss.at/v1/satellites/25544';
const CREW_API = 'http://api.open-notify.org/astros.json';

export const fetchISSPosition = async (): Promise<ISSPosition> => {
  try {
    const response = await axios.get(ISS_API_BASE);
    const data = response.data;

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error fetching ISS position:', error);
    throw error;
  }
};

export const fetchCrewData = async (): Promise<CrewData> => {
  try {
    const response = await axios.get(CREW_API);
    return response.data;
  } catch (error) {
    console.error('Error fetching crew data:', error);
    throw error;
  }
};

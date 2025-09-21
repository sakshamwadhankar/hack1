import React from 'react';
import { ISSPosition } from '../../types';
import { calculateDistance } from '../../services/calculations';

interface DataPanelProps {
  issPosition: ISSPosition | null;
  userLocation: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    error: string | null;
  };
}

const DataPanel: React.FC<DataPanelProps> = ({ issPosition, userLocation }) => {
  const distance =
    issPosition && userLocation.latitude !== null
      ? calculateDistance(
          issPosition.latitude,
          issPosition.longitude,
          issPosition.altitude,
          userLocation.latitude,
          userLocation.longitude,
          userLocation.altitude || 0,
        )
      : null;

  if (!issPosition) {
    return (
      <div className="glass-panel p-4 text-white min-w-[250px] pulsing-border">
        <p className="text-sm">Loading ISS data...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 text-white min-w-[250px] pulsing-border">
      <h2 className="text-lg font-bold mb-3 text-blue-300">ISS Position</h2>
      <div className="space-y-2 text-sm">
        <div className="data-item">
          <div className="data-icon">🌍</div>
          <div className="data-content">
            <div className="data-label">Latitude</div>
            <div className="data-value">{issPosition.latitude.toFixed(4)}°</div>
          </div>
        </div>
        <div className="data-item">
          <div className="data-icon">🌐</div>
          <div className="data-content">
            <div className="data-label">Longitude</div>
            <div className="data-value">{issPosition.longitude.toFixed(4)}°</div>
          </div>
        </div>
        <div className="data-item">
          <div className="data-icon">⬆️</div>
          <div className="data-content">
            <div className="data-label">Altitude</div>
            <div className="data-value">{issPosition.altitude.toFixed(2)} km</div>
          </div>
        </div>
        <div className="data-item">
          <div className="data-icon">⚡</div>
          <div className="data-content">
            <div className="data-label">Velocity</div>
            <div className="data-value">{issPosition.velocity.toFixed(2)} km/h</div>
          </div>
        </div>
        <div className="data-item">
          <div className="data-icon">📏</div>
          <div className="data-content">
            <div className="data-label">Distance to ISS</div>
            <div className="data-value">
              {distance !== null ? `${distance.toFixed(2)} km` : 'Calculating...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPanel;

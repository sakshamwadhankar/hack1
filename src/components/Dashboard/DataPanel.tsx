import React from 'react';
import { ISSPosition } from '../../types';

interface DataPanelProps {
  position: ISSPosition | null;
}

const DataPanel: React.FC<DataPanelProps> = ({ position }) => {
  if (!position) {
    return (
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 text-white">
        <p className="text-sm">Loading ISS data...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 text-white min-w-[250px]">
      <h2 className="text-lg font-bold mb-3 text-blue-400">ISS Position</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Latitude:</span>
          <span className="font-mono">{position.latitude.toFixed(4)}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Longitude:</span>
          <span className="font-mono">{position.longitude.toFixed(4)}°</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Altitude:</span>
          <span className="font-mono">{position.altitude.toFixed(2)} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Velocity:</span>
          <span className="font-mono">{position.velocity.toFixed(2)} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default DataPanel;

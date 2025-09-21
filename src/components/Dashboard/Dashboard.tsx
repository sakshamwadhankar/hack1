import React from 'react';
import { ISSPosition } from '../../types';
import DataPanel from './DataPanel';
import CrewList from './CrewList';
import { useUserLocation } from '../../hooks/useUserLocation';

interface DashboardProps {
  issPosition: ISSPosition | null;
}

const Dashboard: React.FC<DashboardProps> = ({ issPosition }) => {
  const userLocation = useUserLocation();

  return (
    <div className="absolute top-4 left-4 z-10 space-y-4">
      <DataPanel issPosition={issPosition} userLocation={userLocation} />
      {/* <CrewList /> */}
    </div>
  );
};

export default Dashboard;

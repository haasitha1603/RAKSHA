import React from 'react';
import { Outlet } from 'react-router-dom';

export const GuardianLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Outlet />
    </div>
  );
};

export default GuardianLayout;

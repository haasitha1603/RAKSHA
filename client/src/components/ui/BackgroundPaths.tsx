import React from 'react';

interface BackgroundPathsProps {
  className?: string;
  opacity?: number;
}

export const BackgroundPaths: React.FC<BackgroundPathsProps> = ({
  className = '',
  opacity = 0.15,
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B727F5" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#B727F5" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="pinkGradient" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D96BFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8E17C4" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <path
          d="M -100 200 C 200 100, 400 400, 700 250 C 1000 100, 1100 300, 1200 200"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.5"
          className="animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <path
          d="M -50 450 C 250 350, 450 650, 750 500 C 1050 350, 1150 550, 1250 450"
          fill="none"
          stroke="url(#pinkGradient)"
          strokeWidth="1.2"
        />
        <path
          d="M -150 750 C 150 600, 500 900, 850 750 C 1100 650, 1200 850, 1300 700"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};

export default BackgroundPaths;

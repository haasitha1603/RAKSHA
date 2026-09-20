import React from 'react';

interface AILoadingStateProps {
  status?: string;
}

export const AILoadingState: React.FC<AILoadingStateProps> = ({
  status = 'Raksha AI is processing...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      {/* Pulsing Orb */}
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Outer expanding ripple */}
        <div className="absolute w-full h-full rounded-full bg-[#B727F5]/20 animate-ping" />
        {/* Middle pulsing halo */}
        <div className="absolute w-12 h-12 rounded-full bg-[#B727F5]/40 animate-pulse blur-sm" />
        {/* Core glowing sphere */}
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#8E17C4] to-[#D96BFF] shadow-[0_0_20px_rgba(183,39,245,0.7)] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white/90 animate-pulse" />
        </div>
      </div>

      {/* Status & Animated Dots */}
      <div className="flex items-center space-x-1.5 text-xs font-medium text-[#B727F5]">
        <span>{status}</span>
        <span className="inline-flex space-x-0.5">
          <span className="w-1 h-1 bg-[#B727F5] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1 h-1 bg-[#B727F5] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1 h-1 bg-[#B727F5] rounded-full animate-bounce" />
        </span>
      </div>
    </div>
  );
};

export default AILoadingState;

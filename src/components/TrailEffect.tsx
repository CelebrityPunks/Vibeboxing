import React from 'react';

interface TrailEffectProps {
  trailPositions: { x: number; y: number; id: number }[];
}

const TrailEffect: React.FC<TrailEffectProps> = ({ trailPositions }) => {
  // Don't render anything if there's no trail
  if (trailPositions.length < 2) return null;
  
  // Only use the most recent positions for the trail
  const recentPositions = trailPositions.slice(-8);
  
  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    >
      {/* Glow filter */}
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Trail path */}
      <polyline
        points={recentPositions.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
        filter="url(#glow)"
      />
      
      {/* Smaller trail for better effect */}
      <polyline
        points={recentPositions.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#4ade80"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      
      {/* Trail end points (small circles at each position) */}
      {recentPositions.map((position, index) => (
        <circle
          key={position.id}
          cx={position.x}
          cy={position.y}
          r={5 - (index * 0.5)}
          fill="white"
          opacity={1 - (index / trailPositions.length)}
        />
      ))}
    </svg>
  );
};

export default TrailEffect;
import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSound } from '../context/SoundContext';
import { calculateDistance } from '../utils/helpers';
import FruitComponent from './FruitComponent';
import TrailEffect from './TrailEffect';

interface FruitRendererProps {
  handPosition: { x: number; y: number } | null;
  trailPositions: { x: number; y: number; id: number }[];
}

const FruitRenderer: React.FC<FruitRendererProps> = ({ handPosition, trailPositions }) => {
  const { fruits, sliceFruit, slicedFruits } = useGame();
  const { playSliceSound } = useSound();
  
  // Check for fruit slicing
  useEffect(() => {
    if (!handPosition || trailPositions.length < 2) return;
    const minSpeed = 3; // Minimum speed required for slicing
    
    // Check each fruit for collision with the trail
    fruits.forEach((fruit) => {
      // Check last few trail positions for collision
      for (let i = 1; i < Math.min(trailPositions.length, 3); i++) {
        const prevPos = trailPositions[i - 1];
        const currentPos = trailPositions[i];
        
        // Calculate movement speed
        const dx = currentPos.x - prevPos.x;
        const dy = currentPos.y - prevPos.y;
        const speed = Math.sqrt(dx * dx + dy * dy);
        
        // Skip if movement is too slow
        if (speed < minSpeed) continue;
        
        // Calculate distance from line segment to fruit center
        const distance = pointToLineDistance(
          fruit.x, fruit.y,
          prevPos.x, prevPos.y,
          currentPos.x, currentPos.y
        );
        
        // If distance is less than fruit radius, slice it
        if (distance < fruit.size * 0.8) {
          sliceFruit(fruit.id);
          playSliceSound();
          break;
        }
      }
    });
  }, [fruits, handPosition, trailPositions, sliceFruit, playSliceSound]);
  
  // Helper function to calculate distance from point to line segment
  const pointToLineDistance = (
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Trail effect */}
      <TrailEffect trailPositions={trailPositions} />
      
      {/* Active fruits */}
      {fruits.map((fruit) => (
        <FruitComponent
          key={fruit.id}
          fruit={fruit}
          sliced={false}
        />
      ))}
      
      {/* Sliced fruits */}
      {slicedFruits.map((fruit) => (
        <FruitComponent
          key={`sliced-${fruit.id}`}
          fruit={fruit}
          sliced={true}
        />
      ))}
    </div>
  );
};

export default FruitRenderer;
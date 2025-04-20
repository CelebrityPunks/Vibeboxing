import React, { useState, useEffect, useRef } from 'react';
import HandTracker from './HandTracker';
import FruitRenderer from './FruitRenderer';
import GameHUD from './GameHUD';
import GameOverScreen from './GameOverScreen';
import { useGame } from '../context/GameContext';
import { useSound } from '../context/SoundContext';
import { Volume2, VolumeX } from 'lucide-react';

const GameContainer: React.FC = () => {
  const { gameOver, resetGame, timeLeft } = useGame();
  const { muted, toggleMute } = useSound();
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [trailPositions, setTrailPositions] = useState<{ x: number; y: number; id: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Setup canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Update trail positions
  useEffect(() => {
    if (!handPosition) return;
    
    // Only add new position if it's significantly different from the last one
    const lastPos = trailPositions[trailPositions.length - 1];
    if (lastPos) {
      const dx = handPosition.x - lastPos.x;
      const dy = handPosition.y - lastPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 3) return; // More sensitive movement tracking
    }
    
    const newTrailPos = {
      x: handPosition.x,
      y: handPosition.y,
      id: Date.now(),
    };
    
    setTrailPositions(prev => {
      const updated = [...prev, newTrailPos].slice(-12); // Shorter trail for better responsiveness
      return updated;
    });
  }, [handPosition]);

  // Handle hand position change
  const handleHandPositionChange = (position: { x: number; y: number } | null) => {
    setHandPosition(position);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Canvas for game rendering */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      
      {/* Mute button */}
      <button 
        onClick={toggleMute}
        className="absolute top-4 right-4 z-50 bg-slate-800 bg-opacity-70 p-2 rounded-full hover:bg-slate-700 transition-colors"
      >
        {muted ? <VolumeX size={24} className="text-white" /> : <Volume2 size={24} className="text-white" />}
      </button>
      
      {/* Hand tracker component */}
      <HandTracker 
        onHandPositionChange={handleHandPositionChange} 
        canvasRef={canvasRef}
      />
      
      {/* HUD (Heads Up Display) */}
      <GameHUD />
      
      {/* Game elements */}
      <FruitRenderer 
        handPosition={handPosition} 
        trailPositions={trailPositions}
      />
      
      {/* Game over screen */}
      {(gameOver || timeLeft <= 0) && (
        <GameOverScreen onRestart={resetGame} />
      )}
    </div>
  );
};

export default GameContainer;
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Fruit, createFruit } from '../utils/fruitUtils';

interface GameContextType {
  score: number;
  addScore: (points: number) => void;
  gameOver: boolean;
  setGameOver: (isOver: boolean) => void;
  fruits: Fruit[];
  slicedFruits: Fruit[];
  addFruit: () => void;
  sliceFruit: (id: string) => void;
  resetGame: () => void;
  timeLeft: number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [slicedFruits, setSlicedFruits] = useState<Fruit[]>([]);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds game

  const addScore = useCallback((points: number) => {
    setScore((prevScore) => prevScore + points);
  }, []);

  const addFruit = useCallback(() => {
    const newFruit = createFruit();
    setFruits((prevFruits) => [...prevFruits, newFruit]);
    
    // Remove fruit after it falls off screen
    setTimeout(() => {
      setFruits((prevFruits) => 
        prevFruits.filter((fruit) => fruit.id !== newFruit.id)
      );
    }, 3000);
  }, []);

  const sliceFruit = useCallback((id: string) => {
    setFruits((prevFruits) => {
      const fruitToSlice = prevFruits.find((fruit) => fruit.id === id);
      if (!fruitToSlice || fruitToSlice.sliced) return prevFruits;
      
      setSlicedFruits((prev) => [...prev, { ...fruitToSlice, sliced: true }]);
      addScore(fruitToSlice.points);
      
      return prevFruits.filter((fruit) => fruit.id !== id && !fruit.sliced);
    });
  }, [addScore]);

  const resetGame = useCallback(() => {
    setScore(0);
    setGameOver(false);
    setFruits([]);
    setSlicedFruits([]);
    setTimeLeft(60);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameOver]);

  // Spawn fruits at random intervals
  useEffect(() => {
    if (gameOver) return;
    
    const spawnInterval = Math.max(600, 1200 - Math.floor(score / 10) * 50);
    const interval = setInterval(addFruit, spawnInterval);
    
    return () => clearInterval(interval);
  }, [addFruit, gameOver, score]);

  // Clean up sliced fruits after animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlicedFruits([]);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [slicedFruits]);

  return (
    <GameContext.Provider
      value={{
        score,
        addScore,
        gameOver,
        setGameOver,
        fruits,
        slicedFruits,
        addFruit,
        sliceFruit,
        resetGame,
        timeLeft,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
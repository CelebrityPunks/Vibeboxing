import React, { useEffect, useState } from 'react';
import { Fruit, getFruitColor } from '../utils/fruitUtils';

interface FruitComponentProps {
  fruit: Fruit;
  sliced: boolean;
}

const FruitComponent: React.FC<FruitComponentProps> = ({ fruit, sliced }) => {
  const [position, setPosition] = useState({ x: fruit.x, y: fruit.y });
  const [rotation, setRotation] = useState(fruit.rotation);
  
  // Fruit movement animation
  useEffect(() => {
    if (sliced) return;
    
    let animationFrameId: number;
    let currentX = fruit.x;
    let currentY = fruit.y;
    let velocityX = fruit.velocityX;
    let velocityY = fruit.velocityY;
    let currentRotation = fruit.rotation;
    
    const animate = () => {
      // Apply gravity
      velocityY += 0.5;
      
      // Update position
      currentX += velocityX;
      currentY += velocityY;
      
      // Update rotation
      currentRotation += fruit.rotationSpeed;
      
      // Update state
      setPosition({ x: currentX, y: currentY });
      setRotation(currentRotation);
      
      // Continue animation if fruit is still on screen
      if (currentY < window.innerHeight + 100) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fruit, sliced]);
  
  // Slice effect animation
  useEffect(() => {
    if (!sliced) return;
    
    let animationFrameId: number;
    let currentX = fruit.x;
    let currentY = fruit.y;
    const leftHalfVelocityX = fruit.velocityX - 2;
    const rightHalfVelocityX = fruit.velocityX + 2;
    let velocityY = fruit.velocityY;
    
    const animate = () => {
      // Apply gravity
      velocityY += 0.7;
      
      // Update state (not needed for sliced fruit as we're using CSS for the animation)
      
      // Continue animation for a short time
      if (currentY < window.innerHeight + 300) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fruit, sliced]);
  
  const fruitColor = getFruitColor(fruit.type);
  const fruitSize = fruit.size;
  
  if (sliced) {
    // Render sliced fruit (two halves)
    return (
      <>
        {/* Left half */}
        <div
          className="absolute transition-all duration-500 ease-in-out"
          style={{
            left: `${position.x - fruitSize / 2}px`,
            top: `${position.y - fruitSize / 2}px`,
            width: `${fruitSize / 2}px`,
            height: `${fruitSize}px`,
            backgroundColor: fruitColor,
            borderRadius: '50% 0 0 50%',
            transform: `rotate(${rotation}deg) translateX(-50px)`,
            opacity: 0,
            transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
          }}
        />
        
        {/* Right half */}
        <div
          className="absolute transition-all duration-500 ease-in-out"
          style={{
            left: `${position.x}px`,
            top: `${position.y - fruitSize / 2}px`,
            width: `${fruitSize / 2}px`,
            height: `${fruitSize}px`,
            backgroundColor: fruitColor,
            borderRadius: '0 50% 50% 0',
            transform: `rotate(${rotation}deg) translateX(50px)`,
            opacity: 0,
            transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
          }}
        />
        
        {/* Juice particles */}
        <div className="absolute z-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-particle"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                backgroundColor: fruitColor,
                opacity: 0.8,
                transform: `translate(${(Math.random() - 0.5) * 100}px, ${Math.random() * 100}px)`,
                animationDuration: `${Math.random() * 0.5 + 0.5}s`,
              }}
            />
          ))}
        </div>
      </>
    );
  }
  
  // Render whole fruit
  return (
    <div
      className="absolute rounded-full flex items-center justify-center transition-transform shadow-md"
      style={{
        left: `${position.x - fruitSize / 2}px`,
        top: `${position.y - fruitSize / 2}px`,
        width: `${fruitSize}px`,
        height: `${fruitSize}px`,
        backgroundColor: fruitColor,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {fruit.type === 'watermelon' && (
        <div className="w-3/4 h-3/4 rounded-full bg-red-500 opacity-80"></div>
      )}
      {fruit.type === 'banana' && (
        <div className="w-3/4 h-1/5 rounded-full bg-yellow-600 opacity-70"></div>
      )}
    </div>
  );
};

export default FruitComponent;
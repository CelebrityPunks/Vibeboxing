import { getRandomInt } from './helpers';

export type FruitType = 'apple' | 'banana' | 'watermelon' | 'orange' | 'pineapple';

export interface Fruit {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  type: FruitType;
  points: number;
  sliced: boolean;
  size: number;
}

const fruitTypes: Array<{
  type: FruitType;
  points: number;
  color: string;
  size: number;
}> = [
  { type: 'apple', points: 10, color: 'red', size: 60 },
  { type: 'banana', points: 15, color: 'yellow', size: 70 },
  { type: 'watermelon', points: 20, color: 'green', size: 80 },
  { type: 'orange', points: 15, color: 'orange', size: 60 },
  { type: 'pineapple', points: 25, color: 'gold', size: 70 },
];

export const createFruit = (): Fruit => {
  const fruitType = fruitTypes[getRandomInt(0, fruitTypes.length - 1)];
  const windowWidth = window.innerWidth;
  
  return {
    id: Math.random().toString(36).substring(2, 9),
    x: getRandomInt(100, Math.max(windowWidth - 100, 300)),
    y: window.innerHeight + 50, // Start below the screen
    velocityX: getRandomInt(-5, 5),
    velocityY: getRandomInt(-25, -15), // Negative velocity to go upward
    rotation: getRandomInt(0, 360),
    rotationSpeed: getRandomInt(-5, 5),
    type: fruitType.type,
    points: fruitType.points,
    sliced: false,
    size: fruitType.size,
  };
};

export const getFruitColor = (type: FruitType): string => {
  const fruit = fruitTypes.find((f) => f.type === type);
  return fruit ? fruit.color : 'gray';
};
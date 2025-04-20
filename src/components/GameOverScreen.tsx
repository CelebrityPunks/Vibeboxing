import React from 'react';
import { useGame } from '../context/GameContext';
import { Sword } from 'lucide-react';

interface GameOverScreenProps {
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  const { score } = useGame();
  
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30 font-['Exo_2']">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-md w-full mx-4">
        <h2 className="text-4xl font-extrabold text-white mb-2">Game Over!</h2>
        
        <div className="my-8">
          <p className="text-xl text-gray-300 mb-2">Your Score</p>
          <p className="text-5xl font-bold text-yellow-400">{score}</p>
        </div>
        
        <div className="space-y-4 mb-8">
          {score < 100 ? (
            <p className="text-gray-300">Keep practicing to improve your slicing skills!</p>
          ) : score < 300 ? (
            <p className="text-gray-300">Good job! You're getting the hang of it!</p>
          ) : (
            <p className="text-gray-300">Amazing! You're a true Fruit Ninja master!</p>
          )}
        </div>
        
        <button
          onClick={onRestart}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center mx-auto"
        >
          <Sword className="mr-2" size={20} />
          Play Again
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
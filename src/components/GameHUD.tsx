import React from 'react';
import { useGame } from '../context/GameContext';
import { formatTime } from '../utils/helpers';

const GameHUD: React.FC = () => {
  const { score, timeLeft } = useGame();
  
  return (
    <div className="absolute top-0 left-0 w-full p-4 z-20 font-['Exo_2']">
      <div className="flex items-center justify-between">
        {/* Score */}
        <div className="bg-slate-800 bg-opacity-70 px-4 py-2 rounded-lg shadow-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Score: <span className="text-yellow-400">{score}</span>
          </h2>
        </div>
        
        {/* Timer */}
        <div className="bg-slate-800 bg-opacity-70 px-4 py-2 rounded-lg shadow-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Time: <span className={`${timeLeft < 10 ? 'text-red-500' : 'text-blue-400'}`}>
              {formatTime(timeLeft)}
            </span>
          </h2>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
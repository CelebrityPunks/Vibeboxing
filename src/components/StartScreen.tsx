import React from 'react';
import { Sword } from 'lucide-react';
import { useSound } from '../context/SoundContext';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const { playStartSound } = useSound();
  
  const handleStart = () => {
    playStartSound();
    onStart();
  };
  
  return (
    <div className="w-full max-w-xl bg-slate-800 bg-opacity-90 p-8 rounded-xl shadow-2xl text-center font-['Exo_2']">
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
          <span className="text-green-400">Fruit</span> 
          <Sword className="inline-block mx-2 text-yellow-400" />
          <span className="text-red-400">Ninja</span>
        </h1>
        <p className="text-xl text-gray-300">Hand Tracking Edition</p>
      </div>
      
      <div className="space-y-6 mb-8">
        <div className="bg-slate-700 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-2">How to Play</h2>
          <p className="text-gray-300">
            Use your hand to slice fruits! Move your index finger to control the blade.
          </p>
        </div>
        
        <div className="bg-slate-700 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-2">Getting Started</h2>
          <ul className="text-gray-300 text-left space-y-2">
            <li>1. Allow camera permission when prompted</li>
            <li>2. Hold your hand up with your index finger extended</li>
            <li>3. Move your finger to slice the fruits</li>
            <li>4. Score points for every fruit you slice</li>
          </ul>
        </div>
      </div>
      
      <button
        onClick={handleStart}
        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95"
      >
        Start Slicing!
      </button>
    </div>
  );
};

export default StartScreen;
import React, { useState } from 'react';
import GameContainer from './components/GameContainer';
import StartScreen from './components/StartScreen';
import { GameProvider } from './context/GameContext';
import { SoundProvider } from './context/SoundContext';

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <SoundProvider>
      <GameProvider>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden">
          {gameStarted ? (
            <GameContainer />
          ) : (
            <StartScreen onStart={() => setGameStarted(true)} />
          )}
        </div>
      </GameProvider>
    </SoundProvider>
  );
}

export default App;
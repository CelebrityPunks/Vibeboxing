import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Howl } from 'howler';

interface SoundContextType {
  playSliceSound: () => void;
  playGameOverSound: () => void;
  playStartSound: () => void;
  muted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sounds, setSounds] = useState<{
    slice?: Howl;
    gameOver?: Howl;
    start?: Howl;
  }>({});
  
  const [muted, setMuted] = useState(false);

  // Initialize sounds
  useEffect(() => {
    const sliceSound = new Howl({
      src: ['https://assets.codepen.io/21542/howler-push.mp3'],
      volume: 0.5,
    });
    
    const gameOverSound = new Howl({
      src: ['https://assets.codepen.io/21542/howler-ding.mp3'],
      volume: 0.7,
    });
    
    const startSound = new Howl({
      src: ['https://assets.codepen.io/21542/howler-door-open.mp3'],
      volume: 0.5,
    });
    
    setSounds({
      slice: sliceSound,
      gameOver: gameOverSound,
      start: startSound,
    });
    
    return () => {
      sliceSound.unload();
      gameOverSound.unload();
      startSound.unload();
    };
  }, []);

  // Update sound mute state
  useEffect(() => {
    if (sounds.slice) sounds.slice.mute(muted);
    if (sounds.gameOver) sounds.gameOver.mute(muted);
    if (sounds.start) sounds.start.mute(muted);
  }, [muted, sounds]);

  const playSliceSound = useCallback(() => {
    sounds.slice?.play();
  }, [sounds]);

  const playGameOverSound = useCallback(() => {
    sounds.gameOver?.play();
  }, [sounds]);

  const playStartSound = useCallback(() => {
    sounds.start?.play();
  }, [sounds]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  return (
    <SoundContext.Provider
      value={{
        playSliceSound,
        playGameOverSound,
        playStartSound,
        muted,
        toggleMute,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};
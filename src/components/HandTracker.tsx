import React, { useEffect, useRef, useState } from 'react';
import * as hands from '@mediapipe/hands';
import * as drawingUtils from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils/camera_utils';

interface HandTrackerProps {
  onHandPositionChange: (position: { x: number; y: number } | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandPositionChange, canvasRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  
  useEffect(() => {
    if (!videoRef.current || !canvasElementRef.current) return;
    
    // Create Hands object
    const handsModule = new hands.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    handsModule.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    handsModule.onResults((results) => {
      // Calculate FPS
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      // Draw hand landmarks
      if (canvasElementRef.current) {
        const ctx = canvasElementRef.current.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, canvasElementRef.current.width, canvasElementRef.current.height);
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvasElementRef.current.width, canvasElementRef.current.height);
          
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Draw hand landmarks
            for (const landmarks of results.multiHandLandmarks) {
              // Draw index finger path more prominently
              const indexFingerTip = landmarks[8];
              ctx.beginPath();
              ctx.arc(
                indexFingerTip.x * canvasElementRef.current.width,
                indexFingerTip.y * canvasElementRef.current.height,
                8,
                0,
                2 * Math.PI
              );
              ctx.fillStyle = '#00ff00';
              ctx.fill();
              
              // Draw hand connections
              drawingUtils.drawConnectors(
                ctx, landmarks, hands.HAND_CONNECTIONS,
                {color: '#ffffff', lineWidth: 2}
              );
              
              // Draw landmarks
              drawingUtils.drawLandmarks(ctx, landmarks, {
                color: '#ffff00',
                lineWidth: 1,
                radius: 3
              });
              
              // Get index finger tip position (landmark 8)
              const indexFinger = landmarks[8];
              const x = indexFinger.x * canvasElementRef.current.width;
              const y = indexFinger.y * canvasElementRef.current.height;
              const scaledX = (x / canvasElementRef.current.width) * window.innerWidth;
              const scaledY = (y / canvasElementRef.current.height) * window.innerHeight;
              
              // Send hand position to parent component
              onHandPositionChange({ 
                x: window.innerWidth - scaledX,
                y: scaledY
              });
            }
          } else {
            // No hands detected
            onHandPositionChange(null);
          }
          
          ctx.restore();
        }
      }
    });
    
    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await handsModule.send({ image: videoRef.current });
          setMediaPipeLoaded(true);
        },
        width: 320,
        height: 240
      });
      camera.start();
    }
    
    return () => {
      handsModule.close();
    };
  }, [onHandPositionChange]);

  return (
    <div className="absolute bottom-0 right-0 z-10">
      <video 
        ref={videoRef} 
        className="hidden"
        playsInline
      />
      <canvas 
        ref={canvasElementRef} 
        className="w-48 h-36 rounded-lg border-2 border-green-500 bg-black"
        width={320}
        height={240}
      />
      <div className="absolute top-1 left-1 text-xs text-green-400">
        FPS: {fps}
      </div>
      {!mediaPipeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-sm">
          Loading hand tracking...
        </div>
      )}
    </div>
  );
};

export default HandTracker;
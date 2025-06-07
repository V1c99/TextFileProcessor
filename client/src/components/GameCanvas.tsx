import { useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { GameEngine } from '../lib/gameEngine';
import { useGameState } from '../lib/stores/useGameState';

// Create a context to provide the GameEngine instance
export const GameEngineContext = createContext<GameEngine | null>(null);

export default function GameCanvas({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const { phase } = useGameState();

  const gameLoop = useCallback(() => {
    if (gameEngineRef.current && phase === 'playing') {
      gameEngineRef.current.update();
      gameEngineRef.current.render();
    }
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Ensure pixel perfect rendering
      ctx.imageSmoothingEnabled = false;
      
      if (gameEngineRef.current) {
        gameEngineRef.current.resize(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game engine
    gameEngineRef.current = new GameEngine(canvas, ctx);

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameEngineRef.current) {
        gameEngineRef.current.handleKeyDown(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameEngineRef.current) {
        gameEngineRef.current.handleKeyUp(e.code);
      }
    };

    // Handle touch input for mobile
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      if (gameEngineRef.current) {
        gameEngineRef.current.handleTouch(x, y, canvas.width, canvas.height);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Start game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (gameEngineRef.current) {
        gameEngineRef.current.cleanup();
      }
    };
  }, [gameLoop]);

  return (
    <GameEngineContext.Provider value={gameEngineRef.current}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          imageRendering: 'pixelated',
          touchAction: 'none'
        }}
      />
      {children}
    </GameEngineContext.Provider>
  );
}

// Custom hook for consuming the GameEngine instance
export function useGameEngine() {
  return useContext(GameEngineContext);
}

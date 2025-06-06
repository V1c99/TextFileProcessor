import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useGameState } from '../lib/stores/useGameState';
import { useAudio } from '../lib/stores/useAudio';

interface GameUIProps {
  onRestart: () => void;
}

export default function GameUI({ onRestart }: GameUIProps) {
  const { phase, collectedItems, currentMessage, score } = useGameState();
  const { toggleMute, isMuted } = useAudio();

  if (phase === 'ended') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <Card className="max-w-2xl mx-4 bg-black/90 border-red-600">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold text-red-400 mb-4">
              🎉 Adventure Complete! 🎉
            </h2>
            <p className="text-gray-300 mb-6 text-lg">
              Thanks for getting to know me through this journey! I hope you enjoyed learning about 
              my personality, background, and what I can bring to your student house.
            </p>
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-yellow-400 font-semibold">Final Score: {score}</p>
              <p className="text-gray-300">Items Discovered: {collectedItems.length}</p>
            </div>
            <div className="text-left space-y-2 mb-6 text-gray-300">
              <p><strong className="text-red-400">Contact Info:</strong></p>
              <p>📧 Email: victor.gavrila@student.utwente.nl</p>
              <p>🎓 Programme: Business Information Technology, Year 1</p>
              <p>🏠 Looking for: Fun, social, and respectful student house</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={onRestart}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
              >
                Play Again
              </Button>
              <Button 
                onClick={() => window.open('mailto:victor.gavrila@student.utwente.nl?subject=Student House Application', '_blank')}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-6 py-2"
              >
                Get in Touch
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Game HUD */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex justify-between items-start">
          <div className="bg-black/70 p-3 rounded-lg border border-red-600">
            <p className="text-yellow-400 font-semibold">Score: {score}</p>
            <p className="text-gray-300 text-sm">Items: {collectedItems.length}/12</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={toggleMute}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>
            <Button 
              onClick={onRestart}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              Restart
            </Button>
          </div>
        </div>
      </div>

      {/* Current message display */}
      {currentMessage && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-black/90 border-red-600">
            <CardContent className="p-4">
              <p className="text-gray-300 text-center">{currentMessage}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile controls */}
      <div className="absolute bottom-4 right-4 z-10 md:hidden">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button 
              className="w-12 h-12 bg-red-600/70 hover:bg-red-600 text-white"
              onTouchStart={(e) => {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
              }}
            >
              ←
            </Button>
            <Button 
              className="w-12 h-12 bg-red-600/70 hover:bg-red-600 text-white"
              onTouchStart={(e) => {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
              }}
            >
              →
            </Button>
          </div>
          <Button 
            className="w-full h-12 bg-yellow-600/70 hover:bg-yellow-600 text-white"
            onTouchStart={(e) => {
              e.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
            }}
          >
            JUMP
          </Button>
        </div>
      </div>
    </>
  );
}

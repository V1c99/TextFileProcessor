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
      {/* Enhanced Game HUD */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex justify-between items-start">
          <div className="bg-gradient-to-br from-gray-900/90 to-black/90 p-4 rounded-xl border-2 border-yellow-400/50 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">V</span>
              </div>
              <div>
                <p className="text-yellow-400 font-bold text-lg">Score: {score}</p>
                <p className="text-gray-300 text-sm">Discovered: {collectedItems.length}/12</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                style={{ width: `${(collectedItems.length / 12) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={toggleMute}
              size="sm"
              className="bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white border-yellow-400/30 shadow-lg"
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>
            <Button 
              onClick={onRestart}
              size="sm"
              className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white border-yellow-400/30 shadow-lg"
            >
              Restart
            </Button>
          </div>
        </div>
      </div>

      {/* Current message display - Enhanced popup */}
      {currentMessage && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer"
          onClick={() => {
            const gameState = useGameState.getState();
            gameState.setMessage(null);
          }}
        >
          <div className="animate-in zoom-in-95 duration-300 max-w-2xl mx-4">
            <Card className="bg-gradient-to-br from-red-900/95 to-purple-900/95 border-2 border-yellow-400 shadow-2xl backdrop-blur-md">
              <CardContent className="p-6 relative">
                {/* Decorative corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-yellow-400"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-yellow-400"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-yellow-400"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-yellow-400"></div>
                
                {/* Content */}
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-black text-lg font-bold">✓</span>
                    </div>
                    <h3 className="text-yellow-400 font-bold text-lg">Discovery!</h3>
                  </div>
                  
                  <p className="text-white text-lg leading-relaxed font-medium px-4">
                    {currentMessage}
                  </p>
                  
                  <div className="text-yellow-300 text-sm animate-pulse">
                    Click to continue exploring...
                  </div>
                </div>
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 rounded-lg pointer-events-none"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Mobile controls */}
      <div className="absolute bottom-4 right-4 z-10 md:hidden">
        <div className="flex flex-col gap-3 p-3 bg-black/80 rounded-xl border border-yellow-400/30 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button 
              className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white text-xl font-bold rounded-xl shadow-lg border border-yellow-400/20"
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
              className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white text-xl font-bold rounded-xl shadow-lg border border-yellow-400/20"
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
            className="w-full h-14 bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black font-bold text-lg rounded-xl shadow-lg border border-yellow-300"
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

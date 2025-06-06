import { useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';
import { useGameState } from '../lib/stores/useGameState';
import { useAudio } from '../lib/stores/useAudio';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export default function Game() {
  const { phase, start, restart } = useGameState();
  const { toggleMute, isMuted, backgroundMusic } = useAudio();
  const [showIntro, setShowIntro] = useState(true);

  const handleStart = () => {
    setShowIntro(false);
    start();
    
    // Try to play background music
    if (backgroundMusic && !isMuted) {
      backgroundMusic.play().catch(() => {
        console.log("Background music play prevented by browser policy");
      });
    }
  };

  const handleRestart = () => {
    restart();
    setShowIntro(true);
  };

  if (showIntro) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-purple-900 via-red-900 to-black">
        <Card className="max-w-2xl mx-4 bg-black/80 border-red-600">
          <CardContent className="p-8 text-center">
            <h1 className="text-4xl font-bold text-red-400 mb-4">
              🧛 Victor's Transylvania Adventure 🦇
            </h1>
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Hey future housemates! I'm Victor from Romania, and I've created this interactive game 
              to introduce myself in a fun way. Navigate through my Transylvanian world and discover 
              who I am, what I love, and why I'd be a great addition to your student house!
            </p>
            <div className="space-y-4">
              <div className="text-sm text-gray-400 mb-4">
                <p>🎮 Use ARROW KEYS or WASD to move</p>
                <p>🦘 Press SPACE to jump</p>
                <p>🎯 Collect items to learn about me!</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={handleStart}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                >
                  Start Adventure
                </Button>
                <Button 
                  onClick={toggleMute}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <GameCanvas />
      <GameUI onRestart={handleRestart} />
    </div>
  );
}

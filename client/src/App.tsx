import { useEffect } from 'react';
import Game from './components/Game';
import { useAudio } from './lib/stores/useAudio';
import './index.css';

function App() {
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  useEffect(() => {
    // Initialize audio
    const bgMusic = new Audio('/sounds/background.mp3');
    const hitSound = new Audio('/sounds/hit.mp3');
    const successSound = new Audio('/sounds/success.mp3');

    bgMusic.loop = true;
    bgMusic.volume = 0.3;

    setBackgroundMusic(bgMusic);
    setHitSound(hitSound);
    setSuccessSound(successSound);
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return (
    <div className="w-full h-full bg-black">
      <Game />
    </div>
  );
}

export default App;

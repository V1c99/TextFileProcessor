import { useGameState } from './stores/useGameState';
import { useAudio } from './stores/useAudio';
import { Sprites } from './sprites';
import { levels, CollectibleItem } from './levels';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  direction: 'left' | 'right';
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'platform' | 'castle' | 'tree';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprites: Sprites;
  private player: Player;
  private platforms: Platform[];
  private collectibles: CollectibleItem[];
  private keys: Set<string>;
  private gravity: number = 0.8;
  private jumpPower: number = -15;
  private speed: number = 5;
  private cameraX: number = 0;
  private backgroundOffset: number = 0;
  private particles: Particle[] = [];
  private dustParticles: Particle[] = [];
  private gameEnded: boolean = false;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.sprites = new Sprites();
    this.keys = new Set();
    
    // Initialize player
    this.player = {
      x: 100,
      y: 400,
      width: 32,
      height: 48,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      direction: 'right'
    };

    // Initialize level
    this.platforms = levels.platforms;
    this.collectibles = [...levels.collectibles];
  }

  handleKeyDown(code: string) {
    this.keys.add(code);
  }

  handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  handleTouch(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    // Simple touch controls - left/right side for movement, top for jump
    const leftSide = x < canvasWidth / 3;
    const rightSide = x > (canvasWidth * 2) / 3;
    const topSide = y < canvasHeight / 2;

    if (topSide) {
      // Jump
      if (this.player.onGround) {
        this.player.velocityY = this.jumpPower;
        this.player.onGround = false;
      }
    } else if (leftSide) {
      this.player.velocityX = -this.speed;
      this.player.direction = 'left';
    } else if (rightSide) {
      this.player.velocityX = this.speed;
      this.player.direction = 'right';
    }
  }

  update() {
    const gameState = useGameState.getState();
    if (gameState.phase !== 'playing') return;

    // Handle input
    this.player.velocityX = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      this.player.velocityX = -this.speed;
      this.player.direction = 'left';
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      this.player.velocityX = this.speed;
      this.player.direction = 'right';
    }
    if ((this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')) && this.player.onGround) {
      this.player.velocityY = this.jumpPower;
      this.player.onGround = false;
    }

    // Apply gravity
    this.player.velocityY += this.gravity;

    // Update position
    this.player.x += this.player.velocityX;
    this.player.y += this.player.velocityY;

    // Collision detection with platforms
    this.player.onGround = false;
    
    for (const platform of this.platforms) {
      if (this.checkCollision(this.player, platform)) {
        // Landing on top of platform
        if (this.player.velocityY > 0 && this.player.y < platform.y) {
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.onGround = true;
        }
        // Hit platform from below
        else if (this.player.velocityY < 0 && this.player.y > platform.y) {
          this.player.y = platform.y + platform.height;
          this.player.velocityY = 0;
        }
        // Hit platform from side
        else if (this.player.velocityX !== 0) {
          if (this.player.velocityX > 0) {
            this.player.x = platform.x - this.player.width;
          } else {
            this.player.x = platform.x + platform.width;
          }
          this.player.velocityX = 0;
        }
      }
    }

    // Check collectible collision
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];
      if (this.checkCollision(this.player, collectible)) {
        // Create collection particles
        this.createCollectionParticles(collectible.x + collectible.width/2, collectible.y + collectible.height/2);
        
        // Collect item
        gameState.collectItem(collectible);
        this.collectibles.splice(i, 1);
        
        // Play success sound
        const audioState = useAudio.getState();
        audioState.playSuccess();
      }
    }

    // Generate walking dust particles
    if (Math.abs(this.player.velocityX) > 0 && this.player.onGround) {
      if (Math.random() > 0.7) {
        this.createDustParticle(this.player.x + this.player.width/2, this.player.y + this.player.height);
      }
    }

    // Update particles
    this.updateParticles();

    // Update camera to follow player
    const targetCameraX = this.player.x - this.canvas.width / 2;
    this.cameraX += (targetCameraX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.cameraX, 3200 - this.canvas.width));

    // Update background offset for parallax effect
    this.backgroundOffset = this.cameraX * 0.3;

    // Update game state
    gameState.updatePlayerPosition(this.player.x, this.player.y);
    gameState.setCameraOffset(this.cameraX);

    // Check win condition - reaching the final castle or all collectibles
    if (!this.gameEnded) {
      const finalCastle = this.platforms.find(p => p.type === 'castle' && p.x > 2800);
      const reachedEnd = this.player.x > 2900; // Simpler trigger based on x position
      
      if (reachedEnd || (finalCastle && this.checkCollision(this.player, finalCastle))) {
        this.gameEnded = true;
        gameState.setMessage("🎉 Congratulations! You've reached the end of Victor's adventure! Now you know what makes me a great housemate. I hope we can meet soon!");
        setTimeout(() => {
          gameState.end();
        }, 4000);
      }
    }

    // Prevent player from falling off the world
    if (this.player.y > this.canvas.height + 100) {
      this.player.x = 100;
      this.player.y = 400;
      this.player.velocityX = 0;
      this.player.velocityY = 0;
    }
  }

  render() {
    const gameState = useGameState.getState();
    if (gameState.phase !== 'playing') return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for camera transform
    this.ctx.save();
    this.ctx.translate(-this.cameraX, 0);

    // Draw background with parallax
    this.drawBackground();

    // Draw platforms
    this.drawPlatforms();

    // Draw collectibles
    this.drawCollectibles();

    // Draw player
    this.drawPlayer();

    // Draw particles
    this.drawParticles();

    // Restore context
    this.ctx.restore();
  }

  private drawBackground() {
    // Enhanced sky gradient with more atmospheric layers
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(0.3, '#1b263b');
    gradient.addColorStop(0.6, '#2d1b69');
    gradient.addColorStop(0.8, '#415a77');
    gradient.addColorStop(1, '#0f0f23');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(this.cameraX, 0, this.canvas.width, this.canvas.height);

    // Distant mountains (multiple layers for depth)
    const mountainLayers = [
      { color: '#1a0d2e', scale: 0.3, height: 200 },
      { color: '#2a0845', scale: 0.5, height: 150 },
      { color: '#3a1845', scale: 0.7, height: 100 }
    ];

    mountainLayers.forEach((layer, index) => {
      this.ctx.fillStyle = layer.color;
      for (let i = -1; i < 6; i++) {
        const x = i * 400 - this.backgroundOffset * layer.scale;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.canvas.height);
        this.ctx.lineTo(x + 150, this.canvas.height - layer.height);
        this.ctx.lineTo(x + 300, this.canvas.height - layer.height * 0.7);
        this.ctx.lineTo(x + 400, this.canvas.height);
        this.ctx.closePath();
        this.ctx.fill();
      }
    });

    // Enhanced stars with twinkling effect
    const time = Date.now() * 0.001;
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
      const x = (i * 127) % 2500 - this.backgroundOffset * 0.2;
      const y = (i * 73) % 250;
      const twinkle = Math.sin(time + i) * 0.5 + 0.5;
      
      this.ctx.save();
      this.ctx.globalAlpha = twinkle * 0.8 + 0.2;
      
      if (i % 10 === 0) {
        // Larger stars
        this.ctx.fillRect(x - 1, y - 1, 3, 3);
        this.ctx.fillRect(x, y - 2, 1, 5);
        this.ctx.fillRect(x - 2, y, 5, 1);
      } else {
        this.ctx.fillRect(x, y, 2, 2);
      }
      this.ctx.restore();
    }

    // Enhanced moon with glow
    const moonX = 1500 - this.backgroundOffset * 0.1;
    const moonY = 80;
    
    // Moon glow
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = '#f4f4f4';
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    
    // Moon body
    this.ctx.fillStyle = '#f4f4f4';
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Moon craters
    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.beginPath();
    this.ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(moonX + 10, moonY + 8, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(moonX - 5, moonY + 12, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Atmospheric fog effect
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.ctx.fillStyle = '#415a77';
    for (let i = 0; i < 3; i++) {
      const fogX = (i * 600) - this.backgroundOffset * 0.4;
      const fogY = this.canvas.height - 150 + Math.sin(time * 0.5 + i) * 20;
      this.ctx.beginPath();
      this.ctx.ellipse(fogX, fogY, 200, 40, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    // Add subtle clouds
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const cloudX = (i * 500) - this.backgroundOffset * 0.3;
      const cloudY = 150 + Math.sin(time * 0.3 + i) * 10;
      
      // Cloud made of circles
      this.ctx.beginPath();
      this.ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
      this.ctx.arc(cloudX + 30, cloudY, 35, 0, Math.PI * 2);
      this.ctx.arc(cloudX + 60, cloudY, 25, 0, Math.PI * 2);
      this.ctx.arc(cloudX + 20, cloudY - 15, 20, 0, Math.PI * 2);
      this.ctx.arc(cloudX + 40, cloudY - 15, 25, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawPlatforms() {
    for (const platform of this.platforms) {
      const px = platform.x;
      const py = platform.y;
      const pw = platform.width;
      const ph = platform.height;
      
      // Add shadow beneath platforms
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(px + 2, py + ph, pw - 2, 3);
      
      if (platform.type === 'ground') {
        // Ground with dirt and grass
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(px, py, pw, ph);
        
        // Grass layer
        this.ctx.fillStyle = '#388e3c';
        this.ctx.fillRect(px, py, pw, 8);
        
        // Grass texture
        this.ctx.fillStyle = '#4caf50';
        for (let i = 0; i < pw; i += 8) {
          this.ctx.fillRect(px + i, py, 2, 6);
          this.ctx.fillRect(px + i + 4, py + 2, 2, 4);
        }
        
        // Top highlight
        this.ctx.fillStyle = '#66bb6a';
        this.ctx.fillRect(px, py, pw, 1);
        
      } else if (platform.type === 'platform') {
        // Wooden platform
        this.ctx.fillStyle = '#8d6e63';
        this.ctx.fillRect(px, py, pw, ph);
        
        // Wood planks
        this.ctx.fillStyle = '#6d4c41';
        for (let i = 0; i < pw; i += 24) {
          this.ctx.fillRect(px + i, py, 1, ph);
        }
        
        // Wood grain
        this.ctx.fillStyle = '#5d4037';
        for (let j = 2; j < ph; j += 4) {
          this.ctx.fillRect(px + 4, py + j, pw - 8, 1);
        }
        
        // Highlights and shadows
        this.ctx.fillStyle = '#bcaaa4';
        this.ctx.fillRect(px, py, pw, 1);
        this.ctx.fillStyle = '#4e342e';
        this.ctx.fillRect(px, py + ph - 1, pw, 1);
        
      } else if (platform.type === 'castle') {
        // Castle stone
        this.ctx.fillStyle = '#607d8b';
        this.ctx.fillRect(px, py, pw, ph);
        
        // Stone blocks
        this.ctx.fillStyle = '#455a64';
        for (let i = 0; i < pw; i += 32) {
          for (let j = 0; j < ph; j += 16) {
            this.ctx.fillRect(px + i, py + j, 30, 14);
            this.ctx.strokeStyle = '#37474f';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + i, py + j, 30, 14);
          }
        }
        
        // Castle battlements
        this.ctx.fillStyle = '#546e7a';
        for (let i = 0; i < pw; i += 24) {
          this.ctx.fillRect(px + i, py - 12, 16, 12);
          this.ctx.fillRect(px + i + 4, py - 16, 8, 4);
        }
        
        // Windows
        this.ctx.fillStyle = '#263238';
        for (let i = 20; i < pw - 20; i += 40) {
          this.ctx.fillRect(px + i, py + 16, 6, 10);
          this.ctx.fillRect(px + i + 2, py + 18, 2, 6);
        }
        
        // If this is the final castle, draw a 'Finish' sign
        if (px === 2850 && py === 400 && pw === 200 && ph === 100) {
          this.ctx.save();
          // Floating effect
          const time = Date.now() * 0.003;
          const floatY = Math.sin(time) * 5;
          this.ctx.font = 'bold 32px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'bottom';
          this.ctx.strokeStyle = '#b8860b';
          this.ctx.lineWidth = 4;
          // Move sign slightly to the right (+15px)
          const signX = px + pw/2 + 15;
          const signY = py - 18 + floatY;
          // Draw the text (no background)
          this.ctx.strokeText('Finish', signX, signY);
          this.ctx.fillStyle = '#fffbe6';
          this.ctx.fillText('Finish', signX, signY);
          this.ctx.restore();
        }
      } else if (platform.type === 'tree') {
        // Tree trunk
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(px + pw/2 - 12, py, 24, ph);
        
        // Bark texture
        this.ctx.fillStyle = '#4e342e';
        for (let j = 0; j < ph; j += 8) {
          this.ctx.fillRect(px + pw/2 - 10, py + j, 2, 6);
          this.ctx.fillRect(px + pw/2 + 6, py + j + 4, 2, 4);
        }
        
        // Tree crown
        this.ctx.fillStyle = '#2e7d32';
        this.ctx.beginPath();
        this.ctx.ellipse(px + pw/2, py - 20, 35, 25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#388e3c';
        this.ctx.beginPath();
        this.ctx.ellipse(px + pw/2 - 12, py - 15, 25, 18, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(px + pw/2 + 12, py - 15, 25, 18, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tree highlights
        this.ctx.fillStyle = '#4caf50';
        this.ctx.beginPath();
        this.ctx.ellipse(px + pw/2 - 8, py - 25, 12, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawCollectibles() {
    for (const collectible of this.collectibles) {
      const time = Date.now() * 0.005;
      const floatY = Math.sin(time + collectible.x * 0.01) * 5;
      const pulseScale = 0.9 + Math.sin(time * 2 + collectible.x * 0.01) * 0.1;
      const cx = collectible.x + collectible.width / 2;
      const cy = collectible.y + collectible.height / 2 + floatY;
      
      // Outer glow ring
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = this.getCollectibleColor(collectible.type);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 18 * pulseScale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      // Inner glow ring
      this.ctx.save();
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 12 * pulseScale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      // Main collectible body
      this.ctx.fillStyle = this.getCollectibleColor(collectible.type);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Icon based on type
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      let icon = '';
      switch (collectible.type) {
        case 'personality': icon = '😊'; break;
        case 'hobby': icon = '🎯'; break;
        case 'background': icon = '🌍'; break;
        case 'skill': icon = '⭐'; break;
      }
      
      this.ctx.fillText(icon, cx, cy);
      
      // Sparkle particles
      for (let i = 0; i < 3; i++) {
        const angle = time * 2 + i * (Math.PI * 2 / 3);
        const sparkleX = cx + Math.cos(angle) * 15;
        const sparkleY = cy + Math.sin(angle) * 15;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
      }
    }
  }

  private drawPlayer() {
    const px = this.player.x;
    const py = this.player.y;
    const time = Date.now() * 0.01;
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(px + 16, py + 46, 14, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cape animation
    const capeOffset = Math.sin(time * 0.5) * 2;
    this.ctx.fillStyle = '#8b0000';
    this.ctx.beginPath();
    if (this.player.direction === 'right') {
      this.ctx.moveTo(px - 6 + capeOffset, py + 12);
      this.ctx.lineTo(px - 12 + capeOffset, py + 35);
      this.ctx.lineTo(px + 4 + capeOffset, py + 38);
      this.ctx.lineTo(px + 8, py + 16);
    } else {
      this.ctx.moveTo(px + 38 - capeOffset, py + 12);
      this.ctx.lineTo(px + 44 - capeOffset, py + 35);
      this.ctx.lineTo(px + 28 - capeOffset, py + 38);
      this.ctx.lineTo(px + 24, py + 16);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    // Cape highlight
    this.ctx.fillStyle = '#cd5c5c';
    this.ctx.beginPath();
    if (this.player.direction === 'right') {
      this.ctx.moveTo(px - 4 + capeOffset, py + 14);
      this.ctx.lineTo(px - 8 + capeOffset, py + 25);
      this.ctx.lineTo(px + 2 + capeOffset, py + 28);
      this.ctx.lineTo(px + 6, py + 18);
    } else {
      this.ctx.moveTo(px + 36 - capeOffset, py + 14);
      this.ctx.lineTo(px + 40 - capeOffset, py + 25);
      this.ctx.lineTo(px + 30 - capeOffset, py + 28);
      this.ctx.lineTo(px + 26, py + 18);
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    // Body (dark jacket)
    this.ctx.fillStyle = '#2c2c54';
    this.ctx.fillRect(px + 6, py + 16, 20, 24);
    
    // Body highlight
    this.ctx.fillStyle = '#40407a';
    this.ctx.fillRect(px + 8, py + 18, 4, 20);
    
    // Pants
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(px + 8, py + 40, 16, 6);
    
    // Legs
    this.ctx.fillStyle = '#2c2c54';
    this.ctx.fillRect(px + 10, py + 40, 5, 6);
    this.ctx.fillRect(px + 17, py + 40, 5, 6);
    
    // Shoes
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(px + 8, py + 44, 7, 4);
    this.ctx.fillRect(px + 17, py + 44, 7, 4);
    
    // Arms
    this.ctx.fillStyle = '#2c2c54';
    this.ctx.fillRect(px + 2, py + 18, 6, 12);
    this.ctx.fillRect(px + 24, py + 18, 6, 12);
    
    // Hands
    this.ctx.fillStyle = '#fdbcb4';
    this.ctx.fillRect(px + 3, py + 28, 4, 6);
    this.ctx.fillRect(px + 25, py + 28, 4, 6);
    
    // Head
    this.ctx.fillStyle = '#fdbcb4';
    this.ctx.fillRect(px + 8, py, 16, 16);
    
    // Modern hair
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(px + 6, py - 2, 20, 8);
    this.ctx.fillRect(px + 8, py + 2, 16, 4);
    
    // Hair texture
    this.ctx.fillStyle = '#4a2c17';
    this.ctx.fillRect(px + 10, py - 1, 2, 6);
    this.ctx.fillRect(px + 14, py - 1, 2, 5);
    this.ctx.fillRect(px + 18, py - 1, 2, 6);
    
    // Eyes
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 10, py + 6, 4, 3);
    this.ctx.fillRect(px + 18, py + 6, 4, 3);
    
    // Pupils
    this.ctx.fillStyle = '#2e7d32';
    this.ctx.fillRect(px + 12, py + 7, 2, 2);
    this.ctx.fillRect(px + 20, py + 7, 2, 2);
    
    // Eye highlights
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 13, py + 7, 1, 1);
    this.ctx.fillRect(px + 21, py + 7, 1, 1);
    
    // Eyebrows
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(px + 11, py + 5, 3, 1);
    this.ctx.fillRect(px + 19, py + 5, 3, 1);
    
    // Nose
    this.ctx.fillStyle = '#e6a085';
    this.ctx.fillRect(px + 15, py + 8, 2, 3);
    
    // Mouth
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(px + 14, py + 12, 4, 1);
    
    // Small fangs (barely visible)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 15, py + 12, 1, 1);
    this.ctx.fillRect(px + 17, py + 12, 1, 1);
    
    // Collar
    this.ctx.fillStyle = '#8b0000';
    this.ctx.fillRect(px + 8, py + 16, 16, 3);
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private getPlatformColor(type: string): string {
    switch (type) {
      case 'ground': return '#2d5016';
      case 'platform': return '#8b4513';
      case 'castle': return '#696969';
      case 'tree': return '#654321';
      default: return '#8b4513';
    }
  }

  private getCollectibleColor(type: string): string {
    switch (type) {
      case 'personality': return '#ff6b6b';
      case 'hobby': return '#4ecdc4';
      case 'background': return '#45b7d1';
      case 'skill': return '#f9ca24';
      default: return '#ff6b6b';
    }
  }

  resize(width: number, height: number) {
    // Handle canvas resize
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private createCollectionParticles(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 60,
        maxLife: 60,
        color: ['#ffd700', '#ffeb3b', '#fff176', '#ffff8d'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3
      });
    }
  }

  private createDustParticle(x: number, y: number) {
    this.dustParticles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2,
      life: 30,
      maxLife: 30,
      color: '#8d6e63',
      size: 1 + Math.random() * 2
    });
  }

  private updateParticles() {
    // Update collection particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life--;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update dust particles
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life--;
      
      if (p.life <= 0) {
        this.dustParticles.splice(i, 1);
      }
    }
  }

  private drawParticles() {
    // Draw collection particles
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw dust particles
    this.dustParticles.forEach(p => {
      const alpha = p.life / p.maxLife * 0.6;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
      this.ctx.restore();
    });
  }

  cleanup() {
    // Clean up resources if needed
    this.keys.clear();
    this.particles = [];
    this.dustParticles = [];
    this.gameEnded = false;
  }

  // Expose movement methods for UI controls
  public moveLeft() {
    this.player.velocityX = -this.speed;
    this.player.direction = 'left';
  }

  public moveRight() {
    this.player.velocityX = this.speed;
    this.player.direction = 'right';
  }

  public jump() {
    if (this.player.onGround) {
      this.player.velocityY = this.jumpPower;
      this.player.onGround = false;
    }
  }

  public stop() {
    this.player.velocityX = 0;
  }
}

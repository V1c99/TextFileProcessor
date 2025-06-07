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
    this.cameraX = Math.max(0, Math.min(this.cameraX, 2000 - this.canvas.width));

    // Update background offset for parallax effect
    this.backgroundOffset = this.cameraX * 0.3;

    // Update game state
    gameState.updatePlayerPosition(this.player.x, this.player.y);
    gameState.setCameraOffset(this.cameraX);

    // Check win condition - reaching the final castle
    const finalCastle = this.platforms.find(p => p.type === 'castle' && p.x > 2800);
    if (finalCastle && this.checkCollision(this.player, finalCastle)) {
      setTimeout(() => {
        gameState.end();
      }, 1000);
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
      
      // Shadow beneath all platforms
      const gradient = this.ctx.createLinearGradient(px, py + ph, px, py + ph + 8);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(px, py + ph, pw, 8);
      
      if (platform.type === 'ground') {
        // Base dirt layer with gradient
        const dirtGradient = this.ctx.createLinearGradient(px, py, px, py + ph);
        dirtGradient.addColorStop(0, '#2d1b1b');
        dirtGradient.addColorStop(0.2, '#5d4037');
        dirtGradient.addColorStop(1, '#3e2723');
        this.ctx.fillStyle = dirtGradient;
        this.ctx.fillRect(px, py, pw, ph);
        
        // Grass layer with depth
        const grassGradient = this.ctx.createLinearGradient(px, py, px, py + 12);
        grassGradient.addColorStop(0, '#4caf50');
        grassGradient.addColorStop(0.6, '#388e3c');
        grassGradient.addColorStop(1, '#2e7d32');
        this.ctx.fillStyle = grassGradient;
        this.ctx.fillRect(px, py, pw, 12);
        
        // Individual grass blades with varying heights
        this.ctx.fillStyle = '#66bb6a';
        for (let i = 0; i < pw; i += 4) {
          const height = 3 + Math.sin(i * 0.1) * 2;
          this.ctx.fillRect(px + i, py - height, 1, height + 2);
          this.ctx.fillRect(px + i + 2, py - height + 1, 1, height);
        }
        
        // Highlight on grass edge
        this.ctx.fillStyle = '#81c784';
        this.ctx.fillRect(px, py, pw, 2);
        
        // Dirt particles and stones
        this.ctx.fillStyle = '#6d4c41';
        for (let i = 0; i < pw; i += 16) {
          for (let j = 12; j < ph; j += 12) {
            if (Math.random() > 0.7) {
              this.ctx.fillRect(px + i + (Math.random() * 8), py + j + (Math.random() * 6), 2, 2);
            }
          }
        }
      } 
      else if (platform.type === 'platform') {
        // Wooden platform with detailed grain
        const woodGradient = this.ctx.createLinearGradient(px, py, px, py + ph);
        woodGradient.addColorStop(0, '#d7ccc8');
        woodGradient.addColorStop(0.3, '#bcaaa4');
        woodGradient.addColorStop(0.7, '#8d6e63');
        woodGradient.addColorStop(1, '#5d4037');
        this.ctx.fillStyle = woodGradient;
        this.ctx.fillRect(px, py, pw, ph);
        
        // Wood planks
        for (let i = 0; i < pw; i += 32) {
          this.ctx.fillStyle = '#6d4c41';
          this.ctx.fillRect(px + i, py, 1, ph);
          this.ctx.fillRect(px + i + 31, py, 1, ph);
        }
        
        // Wood grain details
        this.ctx.fillStyle = '#5d4037';
        for (let i = 8; i < pw; i += 32) {
          for (let j = 2; j < ph - 2; j += 4) {
            this.ctx.fillRect(px + i, py + j, 16 + Math.sin(j * 0.3) * 4, 1);
          }
        }
        
        // Platform highlights and shadows
        this.ctx.fillStyle = '#efebe9';
        this.ctx.fillRect(px, py, pw, 1);
        this.ctx.fillStyle = '#3e2723';
        this.ctx.fillRect(px, py + ph - 1, pw, 1);
        
        // Metal supports
        this.ctx.fillStyle = '#424242';
        this.ctx.fillRect(px + 4, py + ph - 3, 4, 3);
        this.ctx.fillRect(px + pw - 8, py + ph - 3, 4, 3);
      }
      else if (platform.type === 'castle') {
        // Castle with detailed stonework
        const stoneGradient = this.ctx.createLinearGradient(px, py, px, py + ph);
        stoneGradient.addColorStop(0, '#90a4ae');
        stoneGradient.addColorStop(0.5, '#607d8b');
        stoneGradient.addColorStop(1, '#37474f');
        this.ctx.fillStyle = stoneGradient;
        this.ctx.fillRect(px, py, pw, ph);
        
        // Stone blocks with mortar lines
        this.ctx.fillStyle = '#546e7a';
        for (let i = 0; i < pw; i += 32) {
          for (let j = 0; j < ph; j += 16) {
            const blockWidth = 30;
            const blockHeight = 14;
            
            // Individual stone block
            const blockGradient = this.ctx.createLinearGradient(px + i, py + j, px + i + blockWidth, py + j + blockHeight);
            blockGradient.addColorStop(0, '#78909c');
            blockGradient.addColorStop(1, '#455a64');
            this.ctx.fillStyle = blockGradient;
            this.ctx.fillRect(px + i, py + j, blockWidth, blockHeight);
            
            // Block highlights
            this.ctx.fillStyle = '#90a4ae';
            this.ctx.fillRect(px + i, py + j, blockWidth, 1);
            this.ctx.fillRect(px + i, py + j, 1, blockHeight);
            
            // Block shadows
            this.ctx.fillStyle = '#37474f';
            this.ctx.fillRect(px + i, py + j + blockHeight - 1, blockWidth, 1);
            this.ctx.fillRect(px + i + blockWidth - 1, py + j, 1, blockHeight);
          }
        }
        
        // Castle battlements with detailed crenellations
        this.ctx.fillStyle = '#546e7a';
        for (let i = 0; i < pw; i += 32) {
          // Merlon (raised part)
          this.ctx.fillRect(px + i, py - 24, 20, 24);
          
          // Merlon details
          this.ctx.fillStyle = '#78909c';
          this.ctx.fillRect(px + i, py - 24, 20, 1);
          this.ctx.fillRect(px + i, py - 24, 1, 24);
          
          this.ctx.fillStyle = '#37474f';
          this.ctx.fillRect(px + i + 19, py - 24, 1, 24);
          this.ctx.fillRect(px + i, py - 1, 20, 1);
          
          // Arrow slit
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(px + i + 9, py - 16, 2, 12);
          
          this.ctx.fillStyle = '#546e7a';
        }
        
        // Castle windows with depth
        this.ctx.fillStyle = '#000000';
        for (let i = 24; i < pw - 24; i += 48) {
          // Window recess
          this.ctx.fillRect(px + i - 1, py + 16, 10, 16);
          this.ctx.fillRect(px + i, py + 15, 8, 18);
          
          // Window arch
          this.ctx.beginPath();
          this.ctx.arc(px + i + 4, py + 19, 4, Math.PI, 0, false);
          this.ctx.fill();
          
          // Window bars
          this.ctx.fillStyle = '#424242';
          this.ctx.fillRect(px + i + 3, py + 19, 1, 13);
          this.ctx.fillRect(px + i + 5, py + 19, 1, 13);
          this.ctx.fillRect(px + i + 1, py + 25, 6, 1);
          
          this.ctx.fillStyle = '#000000';
        }
        
        // Castle gate (if wide enough)
        if (pw > 100) {
          const gateX = px + pw/2 - 16;
          const gateY = py + ph - 32;
          
          // Gate arch
          this.ctx.fillStyle = '#1a1a1a';
          this.ctx.fillRect(gateX, gateY, 32, 32);
          this.ctx.beginPath();
          this.ctx.arc(gateX + 16, gateY + 16, 16, Math.PI, 0, false);
          this.ctx.fill();
          
          // Gate details
          this.ctx.fillStyle = '#8d6e63';
          for (let i = 0; i < 32; i += 8) {
            this.ctx.fillRect(gateX + i, gateY, 6, 32);
          }
          
          // Gate hardware
          this.ctx.fillStyle = '#424242';
          this.ctx.fillRect(gateX + 14, gateY + 12, 4, 2);
          this.ctx.fillRect(gateX + 14, gateY + 18, 4, 2);
        }
      }
      else if (platform.type === 'tree') {
        // Tree trunk with realistic bark texture
        const trunkX = px + pw/2 - 20;
        const trunkWidth = 40;
        
        // Trunk gradient
        const trunkGradient = this.ctx.createLinearGradient(trunkX, py, trunkX + trunkWidth, py);
        trunkGradient.addColorStop(0, '#3e2723');
        trunkGradient.addColorStop(0.3, '#5d4037');
        trunkGradient.addColorStop(0.7, '#4e342e');
        trunkGradient.addColorStop(1, '#3e2723');
        this.ctx.fillStyle = trunkGradient;
        this.ctx.fillRect(trunkX, py, trunkWidth, ph);
        
        // Bark texture with vertical lines
        this.ctx.fillStyle = '#2e2e2e';
        for (let i = 0; i < trunkWidth; i += 8) {
          for (let j = 0; j < ph; j += 12) {
            this.ctx.fillRect(trunkX + i + Math.sin(j * 0.1) * 2, py + j, 2, 8);
          }
        }
        
        // Tree rings and knots
        this.ctx.fillStyle = '#5d4037';
        for (let j = 20; j < ph; j += 30) {
          this.ctx.beginPath();
          this.ctx.ellipse(trunkX + trunkWidth/2 + Math.sin(j * 0.05) * 5, py + j, 6, 4, 0, 0, Math.PI * 2);
          this.ctx.fill();
        }
        
        // Tree crown with multiple layers for depth
        const crownLayers = [
          { x: px + pw/2, y: py - 30, rx: 60, ry: 35, color: '#1b5e20' },
          { x: px + pw/2 - 20, y: py - 25, rx: 45, ry: 30, color: '#2e7d32' },
          { x: px + pw/2 + 20, y: py - 25, rx: 45, ry: 30, color: '#2e7d32' },
          { x: px + pw/2, y: py - 35, rx: 35, ry: 25, color: '#388e3c' },
          { x: px + pw/2 - 15, y: py - 40, rx: 25, ry: 20, color: '#4caf50' },
          { x: px + pw/2 + 15, y: py - 40, rx: 25, ry: 20, color: '#4caf50' },
        ];
        
        crownLayers.forEach(layer => {
          this.ctx.fillStyle = layer.color;
          this.ctx.beginPath();
          this.ctx.ellipse(layer.x, layer.y, layer.rx, layer.ry, 0, 0, Math.PI * 2);
          this.ctx.fill();
        });
        
        // Tree highlights for 3D effect
        this.ctx.fillStyle = '#66bb6a';
        this.ctx.beginPath();
        this.ctx.ellipse(px + pw/2 - 20, py - 45, 15, 12, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Small branches
        this.ctx.fillStyle = '#4e342e';
        this.ctx.fillRect(trunkX + trunkWidth - 8, py + 10, 12, 3);
        this.ctx.fillRect(trunkX - 4, py + 25, 10, 2);
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
    
    // Head (properly proportioned)
    this.ctx.fillStyle = '#fdbcb4';
    this.ctx.beginPath();
    this.ctx.ellipse(px + 16, py + 10, 9, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Hair (stylish brown hair)
    this.ctx.fillStyle = '#8b4513';
    this.ctx.beginPath();
    this.ctx.ellipse(px + 16, py + 3, 10, 8, 0, 0, Math.PI);
    this.ctx.fill();
    
    // Hair details
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(px + 10, py + 2, 3, 6);
    this.ctx.fillRect(px + 19, py + 2, 3, 6);
    this.ctx.fillRect(px + 14, py + 1, 4, 4);
    
    // Eyebrows
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(px + 11, py + 6, 4, 1);
    this.ctx.fillRect(px + 17, py + 6, 4, 1);
    
    // Eyes (more realistic)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.ellipse(px + 13, py + 8, 2, 1.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(px + 19, py + 8, 2, 1.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Pupils
    this.ctx.fillStyle = '#4169e1';
    this.ctx.beginPath();
    this.ctx.ellipse(px + 13, py + 8, 1, 1, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(px + 19, py + 8, 1, 1, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Eye highlights
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 12, py + 7, 1, 1);
    this.ctx.fillRect(px + 18, py + 7, 1, 1);
    
    // Nose (properly shaped)
    this.ctx.fillStyle = '#e6a085';
    this.ctx.beginPath();
    this.ctx.moveTo(px + 16, py + 9);
    this.ctx.lineTo(px + 15, py + 11);
    this.ctx.lineTo(px + 17, py + 11);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Nostrils
    this.ctx.fillStyle = '#d4956b';
    this.ctx.fillRect(px + 15, py + 11, 1, 1);
    this.ctx.fillRect(px + 16, py + 11, 1, 1);
    
    // Mouth (friendly smile)
    this.ctx.fillStyle = '#8b4513';
    this.ctx.beginPath();
    this.ctx.arc(px + 16, py + 12, 2, 0, Math.PI);
    this.ctx.fill();
    
    // Subtle vampire fangs
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 14, py + 12, 1, 1);
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
  }
}

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
        // Collect item
        gameState.collectItem(collectible);
        this.collectibles.splice(i, 1);
        
        // Play success sound
        const audioState = useAudio.getState();
        audioState.playSuccess();
      }
    }

    // Update camera to follow player
    const targetCameraX = this.player.x - this.canvas.width / 2;
    this.cameraX += (targetCameraX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(this.cameraX, 2000 - this.canvas.width));

    // Update background offset for parallax effect
    this.backgroundOffset = this.cameraX * 0.3;

    // Update game state
    gameState.updatePlayerPosition(this.player.x, this.player.y);
    gameState.setCameraOffset(this.cameraX);

    // Check win condition
    if (this.collectibles.length === 0) {
      setTimeout(() => {
        gameState.end();
      }, 2000);
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

    // Restore context
    this.ctx.restore();
  }

  private drawBackground() {
    // Sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a0d2e');
    gradient.addColorStop(0.5, '#2d1b69');
    gradient.addColorStop(1, '#0f0f23');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(this.cameraX, 0, this.canvas.width, this.canvas.height);

    // Mountains in background (parallax)
    this.ctx.fillStyle = '#2a0845';
    for (let i = 0; i < 5; i++) {
      const x = i * 400 - this.backgroundOffset * 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.canvas.height);
      this.ctx.lineTo(x + 200, this.canvas.height - 150);
      this.ctx.lineTo(x + 400, this.canvas.height);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Add some stars
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 100) % 2000 - this.backgroundOffset * 0.2;
      const y = (i * 37) % 200;
      this.ctx.fillRect(x, y, 2, 2);
    }

    // Moon
    this.ctx.fillStyle = '#f4f4f4';
    this.ctx.beginPath();
    this.ctx.arc(1500 - this.backgroundOffset * 0.1, 80, 30, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPlatforms() {
    for (const platform of this.platforms) {
      this.ctx.fillStyle = this.getPlatformColor(platform.type);
      this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      
      // Add some texture/details based on platform type
      if (platform.type === 'castle') {
        // Add castle details
        this.ctx.fillStyle = '#4a0e4e';
        for (let i = 0; i < platform.width; i += 20) {
          this.ctx.fillRect(platform.x + i, platform.y, 10, -10);
        }
      } else if (platform.type === 'tree') {
        // Add tree crown
        this.ctx.fillStyle = '#0f4a0f';
        this.ctx.fillRect(platform.x - 10, platform.y - 30, platform.width + 20, 30);
      }
    }
  }

  private drawCollectibles() {
    for (const collectible of this.collectibles) {
      // Animate collectibles with floating effect
      const time = Date.now() * 0.005;
      const floatY = Math.sin(time + collectible.x * 0.01) * 5;
      
      this.ctx.fillStyle = this.getCollectibleColor(collectible.type);
      this.ctx.fillRect(
        collectible.x, 
        collectible.y + floatY, 
        collectible.width, 
        collectible.height
      );
      
      // Add glow effect
      this.ctx.shadowColor = this.getCollectibleColor(collectible.type);
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(
        collectible.x + 2, 
        collectible.y + floatY + 2, 
        collectible.width - 4, 
        collectible.height - 4
      );
      this.ctx.shadowBlur = 0;
    }
  }

  private drawPlayer() {
    // Player body
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    
    // Player head
    this.ctx.fillStyle = '#fdbcb4';
    this.ctx.fillRect(this.player.x + 8, this.player.y, 16, 16);
    
    // Vampire cape
    this.ctx.fillStyle = '#8b0000';
    if (this.player.direction === 'right') {
      this.ctx.fillRect(this.player.x - 8, this.player.y + 8, 12, 30);
    } else {
      this.ctx.fillRect(this.player.x + this.player.width - 4, this.player.y + 8, 12, 30);
    }
    
    // Simple face
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(this.player.x + 10, this.player.y + 4, 2, 2); // Left eye
    this.ctx.fillRect(this.player.x + 20, this.player.y + 4, 2, 2); // Right eye
    
    // Fangs
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(this.player.x + 12, this.player.y + 8, 1, 3);
    this.ctx.fillRect(this.player.x + 19, this.player.y + 8, 1, 3);
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

  cleanup() {
    // Clean up resources if needed
    this.keys.clear();
  }
}

export class Sprites {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private loaded: Set<string> = new Set();

  constructor() {
    // Initialize sprite loading if needed
    // For now, we'll use procedural drawing instead of actual sprite images
  }

  loadSprite(name: string, src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.sprites.has(name)) {
        resolve(this.sprites.get(name)!);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.sprites.set(name, img);
        this.loaded.add(name);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  getSprite(name: string): HTMLImageElement | null {
    return this.sprites.get(name) || null;
  }

  isLoaded(name: string): boolean {
    return this.loaded.has(name);
  }

  // Helper method to draw a simple procedural sprite
  drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, direction: 'left' | 'right') {
    // This is handled in the game engine for now
  }

  drawCollectible(ctx: CanvasRenderingContext2D, x: number, y: number, type: string) {
    // This is handled in the game engine for now
  }
}

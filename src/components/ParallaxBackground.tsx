import * as PIXI from 'pixi.js';

interface ParallaxBackgroundProps {
  app: PIXI.Application;
  gameContainer: PIXI.Container;
}

export class ParallaxBackground {
  private mountainLayer: PIXI.TilingSprite | null = null;
  private cloudLayer: PIXI.Container | null = null;
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private clouds: PIXI.Sprite[] = [];
  private lastDogX: number = 0;

  constructor({ app, gameContainer }: ParallaxBackgroundProps) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.setupBackground();
    this.setupClouds();
  }

  private createMountainTexture(): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = this.app.screen.width;
    canvas.height = this.app.screen.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, this.app.screen.height * 0.3);
      gradient.addColorStop(0, '#4a6b8a');
      gradient.addColorStop(1, '#2c3e50');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.app.screen.width, this.app.screen.height * 0.3);

      // Draw mountains
      ctx.fillStyle = '#34495e';
      const mountainHeight = this.app.screen.height * 0.2;
      const mountainCount = 5;
      const mountainWidth = this.app.screen.width / mountainCount;
      const mountainBaseY = this.app.screen.height * 0.3;

      for (let i = 0; i <= mountainCount; i++) {
        const x = i * mountainWidth;
        ctx.beginPath();
        ctx.moveTo(x, mountainBaseY);
        ctx.lineTo(x + mountainWidth * 0.5, mountainBaseY - mountainHeight);
        ctx.lineTo(x + mountainWidth, mountainBaseY);
        ctx.closePath();
        ctx.fill();
      }
    }
    return PIXI.Texture.from(canvas);
  }

  private createCloudTexture(): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create a fluffy cloud shape
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Increased opacity
      
      // Draw multiple circles to create a cloud shape
      const circles = [
        { x: 50, y: 50, r: 30 },
        { x: 80, y: 50, r: 25 },
        { x: 110, y: 50, r: 30 },
        { x: 65, y: 30, r: 20 },
        { x: 95, y: 30, r: 20 }
      ];

      circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    return PIXI.Texture.from(canvas);
  }

  private setupBackground() {
    const mountainTexture = this.createMountainTexture();
    
    // Create mountain layer
    this.mountainLayer = new PIXI.TilingSprite({
      texture: mountainTexture,
      width: this.app.screen.width,
      height: this.app.screen.height
    });
    
    this.mountainLayer.alpha = 0.8;
    this.gameContainer.addChildAt(this.mountainLayer, 0);
  }

  private setupClouds() {
    const cloudTexture = this.createCloudTexture();
    this.cloudLayer = new PIXI.Container();
    this.gameContainer.addChild(this.cloudLayer);

    // Create initial clouds
    for (let i = 0; i < 8; i++) {
      const cloud = new PIXI.Sprite(cloudTexture);
      cloud.scale.set(0.5 + Math.random() * 0.5); // Random size between 0.5 and 1
      cloud.alpha = 0.8 + Math.random() * 0.2; // Random opacity between 0.8 and 1.0
      cloud.x = Math.random() * this.app.screen.width;
      cloud.y = Math.random() * (this.app.screen.height * 0.2); // Only in top 20% of screen
      this.cloudLayer.addChild(cloud);
      this.clouds.push(cloud);
    }
  }

  public update(deltaTime: number, dogX: number) {
    // Calculate dog movement direction and speed
    const dogMovement = dogX - this.lastDogX;
    this.lastDogX = dogX;

    // Update mountain layer with dynamic parallax
    if (this.mountainLayer) {
      // Base speed + movement-based speed
      const mountainSpeed = 0.1 + (Math.abs(dogMovement) * 0.05);
      // Move in opposite direction of dog movement
      this.mountainLayer.tilePosition.x -= mountainSpeed * deltaTime * Math.sign(dogMovement);
    }

    // Update clouds with dynamic parallax
    this.clouds.forEach(cloud => {
      // Larger clouds move slower (more distant)
      const baseSpeed = 0.2 * (1 - (cloud.scale.x - 0.5) / 0.5);
      // Add movement-based speed
      const cloudSpeed = baseSpeed + (Math.abs(dogMovement) * 0.1);
      
      // Move clouds based on their size and dog movement
      cloud.x -= cloudSpeed * deltaTime * Math.sign(dogMovement);

      // Add subtle vertical movement
      cloud.y += Math.sin(cloud.x * 0.01) * 0.1 * deltaTime;

      // Reset cloud position when it goes off screen
      if (cloud.x < -cloud.width) {
        cloud.x = this.app.screen.width + cloud.width;
        cloud.y = Math.random() * (this.app.screen.height * 0.2);
        cloud.scale.set(0.5 + Math.random() * 0.5);
        cloud.alpha = 0.8 + Math.random() * 0.2;
      } else if (cloud.x > this.app.screen.width + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = Math.random() * (this.app.screen.height * 0.2);
        cloud.scale.set(0.5 + Math.random() * 0.5);
        cloud.alpha = 0.8 + Math.random() * 0.2;
      }
    });
  }

  public destroy() {
    if (this.mountainLayer) {
      this.gameContainer.removeChild(this.mountainLayer);
      this.mountainLayer = null;
    }
    if (this.cloudLayer) {
      this.gameContainer.removeChild(this.cloudLayer);
      this.cloudLayer = null;
    }
    this.clouds = [];
  }
} 
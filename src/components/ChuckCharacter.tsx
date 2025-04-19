import * as PIXI from 'pixi.js';

interface ChuckCharacterProps {
  app: PIXI.Application;
  gameContainer: PIXI.Container;
  runTextures: PIXI.Texture[];
  hurtTextures: PIXI.Texture[];
}

export class ChuckCharacter {
  private sprite: PIXI.AnimatedSprite | null = null;
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private runTextures: PIXI.Texture[];
  private hurtTextures: PIXI.Texture[];
  private direction: 'left' | 'right' | null = null;
  private readonly BASE_SPEED = 9;
  private speedMultiplier: number = 1;
  private isHurt: boolean = false;

  constructor({ app, gameContainer, runTextures, hurtTextures }: ChuckCharacterProps) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.runTextures = runTextures;
    this.hurtTextures = hurtTextures;
  }

  public spawn(dogX: number) {
    if (this.sprite) {
      this.gameContainer.removeChild(this.sprite);
    }

    this.sprite = new PIXI.AnimatedSprite(this.runTextures);
    this.sprite.animationSpeed = 0.3;
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(2);

    // Determine spawn position and direction based on player position
    const spawnFromRight = dogX < this.app.screen.width / 2;
    this.sprite.x = spawnFromRight ? this.app.screen.width + 20 : -20;
    this.sprite.y = Math.random() * (this.app.screen.height - 100) + 50;
    this.direction = spawnFromRight ? 'left' : 'right';
    
    // Flip sprite based on direction
    this.sprite.scale.x = spawnFromRight ? -2 : 2;
    
    this.gameContainer.addChild(this.sprite);
    this.isHurt = false;

    // Increase speed multiplier by 0.1 each spawn
    this.speedMultiplier += 0.1;
  }

  public update(deltaTime: number) {
    if (!this.sprite || !this.direction || this.isHurt) return;

    const currentSpeed = this.BASE_SPEED * this.speedMultiplier;
    this.sprite.x += this.direction === 'left' ? -currentSpeed : currentSpeed;
    
    // Remove chuck if it's off screen
    if (this.sprite.x < -50 || this.sprite.x > this.app.screen.width + 50) {
      this.destroy();
    }
  }

  public getBounds() {
    return this.sprite?.getBounds();
  }

  public playHurtAnimation() {
    if (!this.sprite || this.isHurt) return;

    this.isHurt = true;
    const hurtChuck = new PIXI.AnimatedSprite(this.hurtTextures);
    hurtChuck.animationSpeed = 0.2;
    hurtChuck.loop = false;
    hurtChuck.anchor.set(0.5);
    hurtChuck.scale.set(this.sprite.scale.x, this.sprite.scale.y);
    hurtChuck.x = this.sprite.x;
    hurtChuck.y = this.sprite.y;
    
    this.gameContainer.addChild(hurtChuck);
    this.destroy();
    
    hurtChuck.onComplete = () => {
      this.gameContainer.removeChild(hurtChuck);
    };
    hurtChuck.play();
  }

  public destroy() {
    if (this.sprite) {
      this.gameContainer.removeChild(this.sprite);
      this.sprite = null;
      this.direction = null;
    }
  }
} 
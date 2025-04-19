import * as PIXI from 'pixi.js';

interface ChuckCharacterProps {
  app: PIXI.Application;
  gameContainer: PIXI.Container;
}

export class ChuckCharacter {
  private sprite: PIXI.AnimatedSprite | null = null;
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;
  private runTextures: PIXI.Texture[] = [];
  private hurtTextures: PIXI.Texture[] = [];
  private direction: 'left' | 'right' | null = null;
  private readonly BASE_SPEED = 9;
  private speedMultiplier: number = 1;
  private isHurt: boolean = false;
  private readonly chuckFrameWidth = 48;
  private readonly chuckFrameHeight = 48;

  constructor({ app, gameContainer }: ChuckCharacterProps) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.initializeTextures();
  }

  private async initializeTextures() {
    try {
      // Load textures
      const [chuckTexture, chuckHurtTexture] = await Promise.all([
        PIXI.Assets.load('assets/sprites/chuck_run.png'),
        PIXI.Assets.load('assets/sprites/chuck_hit.png')
      ]);

      // Create Chuck spritesheet
      const chuckSpritesheet = new PIXI.Spritesheet(chuckTexture.source, {
        frames: {
          run0: { frame: { x: 0, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          run1: { frame: { x: this.chuckFrameWidth, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          run2: { frame: { x: this.chuckFrameWidth * 2, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          run3: { frame: { x: this.chuckFrameWidth * 3, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          run4: { frame: { x: this.chuckFrameWidth * 4, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          run5: { frame: { x: this.chuckFrameWidth * 5, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } }
        },
        meta: {
          scale: "0.9"
        }
      });

      // Create Chuck hurt spritesheet
      const chuckHurtSpritesheet = new PIXI.Spritesheet(chuckHurtTexture.source, {
        frames: {
          hurt0: { frame: { x: 0, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          hurt1: { frame: { x: this.chuckFrameWidth, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } },
          hurt2: { frame: { x: this.chuckFrameWidth * 2, y: 0, w: this.chuckFrameWidth, h: this.chuckFrameHeight } }
        },
        meta: {
          scale: "0.9"
        }
      });

      await Promise.all([chuckSpritesheet.parse(), chuckHurtSpritesheet.parse()]);

      // Create arrays of textures for animations
      this.runTextures = [
        chuckSpritesheet.textures.run0,
        chuckSpritesheet.textures.run1,
        chuckSpritesheet.textures.run2,
        chuckSpritesheet.textures.run3,
        chuckSpritesheet.textures.run4,
        chuckSpritesheet.textures.run5
      ];

      this.hurtTextures = [
        chuckHurtSpritesheet.textures.hurt0,
        chuckHurtSpritesheet.textures.hurt1,
        chuckHurtSpritesheet.textures.hurt2
      ];
    } catch (error) {
      console.error('Error loading Chuck textures:', error);
    }
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
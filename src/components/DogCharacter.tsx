import * as PIXI from 'pixi.js';

interface DogCharacterProps {
  app: PIXI.Application;
  gameContainer: PIXI.Container;
  texture: PIXI.Texture;
}

export class DogCharacter {
  private sprite: PIXI.AnimatedSprite | null = null;
  private currentX: number;
  private currentY: number;
  private currentAnimation: 'run' | 'idle' = 'run';
  private lastDirection: number = 1; // 1 for right, -1 for left
  private runTextures: PIXI.Texture[] = [];
  private idleTextures: PIXI.Texture[] = [];
  private app: PIXI.Application;
  private gameContainer: PIXI.Container;

  // Stamina and dash properties
  private stamina: number = 1; // 0 to 1
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private staminaRecoveryTimer: number = 0;
  private readonly DASH_DURATION = 1.0; // 1000ms
  private readonly DASH_SPEED_MULTIPLIER = 2;
  private readonly STAMINA_RECOVERY_TIME = 6;
  private readonly STAMINA_COOLDOWN = 1.5; // 1500ms cooldown before regeneration starts
  private readonly NORMAL_SPEED: number = 5;
  private readonly DASH_SPEED: number = this.NORMAL_SPEED * this.DASH_SPEED_MULTIPLIER;

  constructor({ app, gameContainer, texture }: DogCharacterProps) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.currentX = app.screen.width / 2;
    this.currentY = app.screen.height / 2;
    this.setupSpritesheet(texture);
  }

  private async setupSpritesheet(texture: PIXI.Texture) {
    const frameWidth = 60;
    const frameHeight = 39;
    
    const spritesheet = new PIXI.Spritesheet(texture.source, {
      frames: {
        run0: { frame: { x: 0, y: frameHeight * 2, w: frameWidth, h: frameHeight } },
        run1: { frame: { x: frameWidth, y: frameHeight * 2, w: frameWidth, h: frameHeight } },
        run2: { frame: { x: frameWidth * 2, y: frameHeight * 2, w: frameWidth, h: frameHeight } },
        run3: { frame: { x: frameWidth * 3, y: frameHeight * 2, w: frameWidth, h: frameHeight } },
        run4: { frame: { x: frameWidth * 4, y: frameHeight * 2, w: frameWidth, h: frameHeight } },
        idleSit0: { frame: { x: 0, y: frameHeight * 4, w: frameWidth, h: frameHeight } },
        idleSit1: { frame: { x: frameWidth, y: frameHeight * 4, w: frameWidth, h: frameHeight } },
        idleSit2: { frame: { x: frameWidth * 2, y: frameHeight * 4, w: frameWidth, h: frameHeight } },
        idleSit3: { frame: { x: frameWidth * 3, y: frameHeight * 4, w: frameWidth, h: frameHeight } }
      },
      meta: {
        scale: "1"
      }
    });

    await spritesheet.parse();

    this.runTextures = [
      spritesheet.textures.run0,
      spritesheet.textures.run1,
      spritesheet.textures.run2,
      spritesheet.textures.run3,
      spritesheet.textures.run4
    ];

    this.idleTextures = [
      spritesheet.textures.idleSit0,
      spritesheet.textures.idleSit1,
      spritesheet.textures.idleSit2,
      spritesheet.textures.idleSit3
    ];

    this.createSprite();
  }

  private createSprite() {
    this.sprite = new PIXI.AnimatedSprite(this.runTextures);
    this.sprite.animationSpeed = 0.25;
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.x = this.currentX;
    this.sprite.y = this.currentY;
    this.sprite.scale.set(2);
    this.gameContainer.addChild(this.sprite);
  }

  public update(keys: { [key: string]: boolean }, deltaTime: number) {
    if (!this.sprite) return;

    // Handle stamina recovery
    if (!this.isDashing) {
      if (this.stamina < 1) {
        // Add cooldown period before regeneration starts
        if (this.staminaRecoveryTimer < this.STAMINA_COOLDOWN) {
          this.staminaRecoveryTimer += deltaTime;
        } else {
          this.stamina += deltaTime / this.STAMINA_RECOVERY_TIME;
          if (this.stamina > 1) {
            this.stamina = 1;
          }
        }
      }
    }

    // Handle dash
    if (keys[' '] && this.stamina === 1 && !this.isDashing) {
      this.startDash();
    }

    if (this.isDashing) {
      this.dashTimer += deltaTime;
      if (this.dashTimer >= this.DASH_DURATION) {
        this.endDash();
      }
    }

    const speed = this.isDashing ? this.DASH_SPEED : this.NORMAL_SPEED;
    let moved = false;
    let isMoving = false;
    
    if (keys['ArrowLeft']) {
      this.currentX -= speed;
      moved = true;
      isMoving = true;
      this.lastDirection = 1;
      this.sprite.scale.set(2, 2);
    }
    if (keys['ArrowRight']) {
      this.currentX += speed;
      moved = true;
      isMoving = true;
      this.lastDirection = -1;
      this.sprite.scale.set(-2, 2);
    }
    if (keys['ArrowUp']) {
      this.currentY -= speed;
      moved = true;
      isMoving = true;
    }
    if (keys['ArrowDown']) {
      this.currentY += speed;
      moved = true;
      isMoving = true;
    }

    if (moved) {
      this.sprite.x = this.currentX;
      this.sprite.y = this.currentY;
    }

    // Switch animations based on movement state
    if (isMoving && this.currentAnimation !== 'run') {
      this.switchAnimation('run');
    } else if (!isMoving && this.currentAnimation !== 'idle') {
      this.switchAnimation('idle');
    }

    // Keep the dog within the screen bounds
    this.currentX = Math.max(this.sprite.width / 2, Math.min(this.app.screen.width - this.sprite.width / 2, this.currentX));
    this.currentY = Math.max(this.sprite.height / 2, Math.min(this.app.screen.height - this.sprite.height / 2, this.currentY));
  }

  private startDash() {
    this.isDashing = true;
    this.dashTimer = 0;
    this.stamina = 0;
    this.staminaRecoveryTimer = 0; // Reset cooldown timer
  }

  private endDash() {
    this.isDashing = false;
    this.dashTimer = 0;
  }

  public getStamina(): number {
    return this.stamina;
  }

  public isDashingActive(): boolean {
    return this.isDashing;
  }

  private switchAnimation(animation: 'run' | 'idle') {
    if (!this.sprite) return;

    this.currentAnimation = animation;
    this.gameContainer.removeChild(this.sprite);
    
    this.sprite = new PIXI.AnimatedSprite(animation === 'run' ? this.runTextures : this.idleTextures);
    this.sprite.animationSpeed = animation === 'run' ? 0.2 : 0.1;
    this.sprite.play();
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(this.lastDirection * 2, 2);
    this.sprite.x = this.currentX;
    this.sprite.y = this.currentY;
    
    this.gameContainer.addChild(this.sprite);
  }

  public getBounds() {
    return this.sprite?.getBounds();
  }

  public destroy() {
    if (this.sprite) {
      this.gameContainer.removeChild(this.sprite);
      this.sprite = null;
    }
  }
} 
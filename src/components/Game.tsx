import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { DogCharacter } from './DogCharacter';
import { GameUI } from './GameUI';

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const isInitializedRef = useRef(false);
  const gameLoopRef = useRef<() => void | undefined>(() => {});
  const dogRef = useRef<DogCharacter | null>(null);
  const gameUIRef = useRef<GameUI | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!gameRef.current) return;

    console.log('Initializing game...');

    // Handle keyboard input
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        keys[e.key] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        keys[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const setupGame = async () => {
      try {
        // Create the application with explicit settings
        const app = new PIXI.Application();
        console.log('PIXI Application created');

        // Store the app reference
        appRef.current = app;

        // Initialize with options
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          background: 0x87CEEB,
          resolution: window.devicePixelRatio || 1,
          antialias: true,
          autoDensity: true,
          resizeTo: gameRef.current || window,
        });
        isInitializedRef.current = true;
        
        // Add the canvas to the DOM
        if (gameRef.current) {
          const canvas = app.canvas;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block';
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.margin = '0';
          canvas.style.padding = '0';
          canvas.style.border = 'none';
          gameRef.current.appendChild(canvas);

          // Add CSS to body to prevent scrolling
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';

          // Create a container for all game objects
          const gameContainer = new PIXI.Container();
          app.stage.addChild(gameContainer);

          // Load textures
          const textures = await Promise.all([
              PIXI.Assets.load('assets/sprites/dog_medium.png'),
              PIXI.Assets.load('assets/sprites/Pataepollo.png'),
              PIXI.Assets.load('assets/sprites/grass_2.jpg'),
              PIXI.Assets.load('assets/sprites/chuck_run.png'),
              PIXI.Assets.load('assets/sprites/chuck_hit.png')
          ]);

          const [dogTexture, treatTexture, grassTexture, chuckTexture, chuckHurtTexture] = textures;

          // Create tiling background
          const background = new PIXI.TilingSprite({
              texture: grassTexture,
              width: app.screen.width,
              height: app.screen.height
          });
          background.tileScale.set(0.5); // Adjust scale as needed
          gameContainer.addChildAt(background, 0); // Add at bottom of container

          // Create game UI
          gameUIRef.current = new GameUI({ app });

          // Initialize game variables
          let frameCount = 0;
          let animationFrameId: number;
          let treatTimer = 0;
          let treatVisible = false;
          let treat: PIXI.Sprite | null = null;
          let nextTreatDelay = 5; // Initial delay of 5 seconds
          let chuckTimer = 0;
          let chuck: PIXI.AnimatedSprite | null = null;
          let chuckDirection: 'left' | 'right' | null = null;
          const CHUCK_SPEED = 9;
          const CHUCK_SPAWN_INTERVAL = 10;
          
          // Create dog character
          dogRef.current = new DogCharacter({
            app,
            gameContainer,
            texture: dogTexture
          });
          
          // Function to get random delay between treats
          const getNextTreatDelay = () => {
              return Math.random() * 7 + 5; // Random number between 5 and 12
          };

          // Function to check collision between dog and treat
          const checkCollision = () => {
              if (!treat || !dogRef.current) return false;

              const dogBounds = dogRef.current.getBounds();
              if (!dogBounds) return false;
              const treatBounds = treat.getBounds();

              const dogCenterX = dogBounds.x + dogBounds.width / 2;
              const dogCenterY = dogBounds.y + dogBounds.height / 2;
              const treatCenterX = treatBounds.x + treatBounds.width / 2;
              const treatCenterY = treatBounds.y + treatBounds.height / 2;

              const distance = Math.sqrt(
                  Math.pow(dogCenterX - treatCenterX, 2) + 
                  Math.pow(dogCenterY - treatCenterY, 2)
              );

              // Collision radius (adjust as needed)
              const collisionRadius = 30;
              return distance < collisionRadius;
          };

          // Function to create a new treat
          const createTreat = () => {
              if (treat) {
                  gameContainer.removeChild(treat);
              }

              treat = new PIXI.Sprite(treatTexture);
              treat.anchor.set(0.5);
              treat.scale.set(1.0);
              
              // Calculate the treat's dimensions after scaling
              const treatWidth = treat.width;
              const treatHeight = treat.height;
              
              // Random position within screen bounds, accounting for treat size
              const x = Math.random() * (app.screen.width - treatWidth) + treatWidth/2;
              const y = Math.random() * (app.screen.height - treatHeight) + treatHeight/2;
              treat.x = x;
              treat.y = y;
              
              gameContainer.addChild(treat);
              treatVisible = true;
              
              // Force a render update
              app.stage.updateTransform(app.stage);
              app.render();
          };

          // Create Chuck spritesheet
          const chuckFrameWidth = 48;
          const chuckFrameHeight = 48;
          const chuckSpritesheet = new PIXI.Spritesheet(chuckTexture.source, {
              frames: {
                  run0: { frame: { x: 0, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  run1: { frame: { x: chuckFrameWidth, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  run2: { frame: { x: chuckFrameWidth * 2, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  run3: { frame: { x: chuckFrameWidth * 3, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  run4: { frame: { x: chuckFrameWidth * 4, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  run5: { frame: { x: chuckFrameWidth * 5, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } }
              },
              meta: {
                  scale: "0.9"
              }
          });

          // Create Chuck hurt spritesheet
          const chuckHurtSpritesheet = new PIXI.Spritesheet(chuckHurtTexture.source, {
              frames: {
                  hurt0: { frame: { x: 0, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  hurt1: { frame: { x: chuckFrameWidth, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } },
                  hurt2: { frame: { x: chuckFrameWidth * 2, y: 0, w: chuckFrameWidth, h: chuckFrameHeight } }
              },
              meta: {
                  scale: "0.9"
              }
          });

          await Promise.all([chuckSpritesheet.parse(), chuckHurtSpritesheet.parse()]);

          // Create arrays of textures for animations
          const chuckRunTextures = [
              chuckSpritesheet.textures.run0,
              chuckSpritesheet.textures.run1,
              chuckSpritesheet.textures.run2,
              chuckSpritesheet.textures.run3,
              chuckSpritesheet.textures.run4,
              chuckSpritesheet.textures.run5
          ];

          const chuckHurtTextures = [
              chuckHurtSpritesheet.textures.hurt0,
              chuckHurtSpritesheet.textures.hurt1,
              chuckHurtSpritesheet.textures.hurt2
          ];

          let isGameOver = false;

          // Function to handle game over
          const handleGameOver = () => {
              isGameOver = true;
              if (gameUIRef.current) {
                gameUIRef.current.showGameOver();
                gameUIRef.current.resetScore();
              }
              
              // Remove dog
              if (dogRef.current) {
                  dogRef.current.destroy();
                  dogRef.current = null;
              }

              // Show hurt animation for Chuck
              if (chuck) {
                  const hurtChuck = new PIXI.AnimatedSprite(chuckHurtTextures);
                  hurtChuck.animationSpeed = 0.2;
                  hurtChuck.loop = false;
                  hurtChuck.anchor.set(0.5);
                  hurtChuck.scale.set(chuck.scale.x, chuck.scale.y);
                  hurtChuck.x = chuck.x;
                  hurtChuck.y = chuck.y;
                  gameContainer.addChild(hurtChuck);
                  
                  // Remove original Chuck
                  gameContainer.removeChild(chuck);
                  chuck = null;
                  
                  // Remove hurt animation after it plays
                  hurtChuck.onComplete = () => {
                      gameContainer.removeChild(hurtChuck);
                  };
                  hurtChuck.play();
              }
          };

          // Function to check collision between dog and Chuck
          const checkChuckCollision = () => {
              if (!chuck || !dogRef.current) return false;

              const dogBounds = dogRef.current.getBounds();
              if (!dogBounds) return false;
              const chuckBounds = chuck.getBounds();

              return dogBounds.x < chuckBounds.x + chuckBounds.width &&
                     dogBounds.x + dogBounds.width > chuckBounds.x &&
                     dogBounds.y < chuckBounds.y + chuckBounds.height &&
                     dogBounds.y + dogBounds.height > chuckBounds.y;
          };

          // Function to spawn chuck
          const spawnChuck = () => {
              if (chuck) {
                  gameContainer.removeChild(chuck);
              }

              chuck = new PIXI.AnimatedSprite(chuckRunTextures);
              chuck.animationSpeed = 0.3;
              chuck.play();
              chuck.anchor.set(0.5);
              chuck.scale.set(2);

              // Determine spawn position and direction based on player position
              const spawnFromRight = dogRef.current?.getBounds()?.x || 0 < app.screen.width / 2;
              chuck.x = spawnFromRight ? app.screen.width + 20 : -20;
              chuck.y = Math.random() * (app.screen.height - 100) + 50; // Random Y position
              chuckDirection = spawnFromRight ? 'left' : 'right';
              
              // Flip sprite based on direction - reversed the logic
              chuck.scale.x = spawnFromRight ? -2 : 2;
              
              gameContainer.addChild(chuck);
          };

          // Game loop
          const gameLoop = (currentTime: number) => {
              frameCount++;

              if (isGameOver) {
                  animationFrameId = requestAnimationFrame(gameLoop);
                  return;
              }

              // Calculate delta time
              const deltaTime = (currentTime - lastTimeRef.current) / 1000;
              lastTimeRef.current = currentTime;

              // Update dog character
              if (dogRef.current) {
                  dogRef.current.update(keys, deltaTime);
                  // Update stamina bar
                  if (gameUIRef.current) {
                      gameUIRef.current.updateStamina(dogRef.current.getStamina());
                  }
              }

              // Handle treat spawning and collision
              treatTimer += deltaTime;
              if (treatTimer >= nextTreatDelay && !treatVisible) {
                  createTreat();
                  treatTimer = 0;
                  nextTreatDelay = getNextTreatDelay();
              }

              // Handle chuck spawning and movement
              chuckTimer += deltaTime;
              if (chuckTimer >= CHUCK_SPAWN_INTERVAL) {
                  spawnChuck();
                  chuckTimer = 0;
              }

              // Move chuck if it exists
              if (chuck && chuckDirection) {
                  chuck.x += chuckDirection === 'left' ? -CHUCK_SPEED : CHUCK_SPEED;
                  
                  // Check for collision with dog
                  if (checkChuckCollision()) {
                      handleGameOver();
                      return;
                  }
                  
                  // Remove chuck if it's off screen
                  if (chuck.x < -50 || chuck.x > app.screen.width + 50) {
                      gameContainer.removeChild(chuck);
                      chuck = null;
                      chuckDirection = null;
                  }

                  // Force a render update for the chuck
                  app.stage.updateTransform(app.stage);
                  app.render();
              }

              // Handle treat collision and removal
              if (treatVisible) {
                  if (checkCollision()) {
                      if (treat) {
                          gameContainer.removeChild(treat);
                          treat = null;
                      }
                      treatVisible = false;
                      treatTimer = 0;
                      if (gameUIRef.current) {
                        gameUIRef.current.updateScore(1);
                      }
                  } else if (treatTimer >= 3) {
                      if (treat) {
                          gameContainer.removeChild(treat);
                          treat = null;
                      }
                      treatVisible = false;
                      treatTimer = 0;
                  }
              }

              // Request next frame
              animationFrameId = requestAnimationFrame(gameLoop);
          };

          // Start the game loop
          lastTimeRef.current = performance.now();
          animationFrameId = requestAnimationFrame(gameLoop);

          // Store the animation frame ID for cleanup
          const animationFrameIdRef = { current: animationFrameId };
          gameLoopRef.current = () => {
            if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
            }
          };
        }
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    setupGame();

    return () => {
      // Clean up event listeners and resources
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (appRef?.current) {
        try {
          // Remove the game loop if it exists
          if (gameLoopRef.current) {
            gameLoopRef.current();
          }
          // Destroy the PIXI application
          const app = appRef.current;
          if (app && app.destroy) {
            app.destroy(true, true);
          }
          appRef.current = null;
          isInitializedRef.current = false;
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, []);

  return (
    <div 
      ref={gameRef} 
      style={{ 
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    />
  );
};

export default Game;
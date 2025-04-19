import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { DogCharacter } from './DogCharacter';
import { GameUI } from './GameUI';
import { ChuckCharacter } from './ChuckCharacter';
import { ParallaxBackground } from './ParallaxBackground';

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const isInitializedRef = useRef(false);
  const gameLoopRef = useRef<() => void | undefined>(() => {});
  const dogRef = useRef<DogCharacter | null>(null);
  const gameUIRef = useRef<GameUI | null>(null);
  const lastTimeRef = useRef<number>(0);
  const chuckRef = useRef<ChuckCharacter | null>(null);
  const chuckTimerRef = useRef<number>(0);
  const chuckSpawnIntervalRef = useRef<number>(10);
  const isFirstSpawnRef = useRef<boolean>(true);
  const parallaxRef = useRef<ParallaxBackground | null>(null);

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

          // Create parallax background
          parallaxRef.current = new ParallaxBackground({
            app,
            gameContainer
          });

          // Load textures
          const textures = await Promise.all([
              PIXI.Assets.load('assets/sprites/dog_medium.png'),
              PIXI.Assets.load('assets/sprites/Pataepollo.png'),
              PIXI.Assets.load('assets/sprites/grass_2.jpg')
          ]);

          const [dogTexture, treatTexture, grassTexture] = textures;

          // Create tiling background
          const background = new PIXI.TilingSprite({
              texture: grassTexture,
              width: app.screen.width,
              height: app.screen.height
          });
          background.tileScale.set(0.5);
          gameContainer.addChildAt(background, 0);

          // Create game UI
          gameUIRef.current = new GameUI({ app });

          // Initialize game variables
          let frameCount = 0;
          let animationFrameId: number;
          let treatTimer = 0;
          let treatVisible = false;
          let treat: PIXI.Sprite | null = null;
          let nextTreatDelay = 5;

          // Create Chuck character
          chuckRef.current = new ChuckCharacter({
            app,
            gameContainer
          });
          
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
              
              // Add border margin (50 pixels from each edge)
              const borderMargin = 50;
              
              // Random position within screen bounds, accounting for treat size and border margin
              const x = Math.random() * (app.screen.width - treatWidth - (borderMargin * 2)) + treatWidth/2 + borderMargin;
              const y = Math.random() * (app.screen.height - treatHeight - (borderMargin * 2)) + treatHeight/2 + borderMargin;
              treat.x = x;
              treat.y = y;
              
              gameContainer.addChild(treat);
              treatVisible = true;
              
              // Force a render update
              app.stage.updateTransform(app.stage);
              app.render();
          };

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
              if (chuckRef.current) {
                chuckRef.current.playHurtAnimation();
              }
          };

          // Function to check collision between dog and Chuck
          const checkChuckCollision = () => {
              if (!chuckRef.current || !dogRef.current) return false;

              const dogBounds = dogRef.current.getBounds();
              if (!dogBounds) return false;
              const chuckBounds = chuckRef.current.getBounds();
              if (!chuckBounds) return false;

              return dogBounds.x < chuckBounds.x + chuckBounds.width &&
                     dogBounds.x + dogBounds.width > chuckBounds.x &&
                     dogBounds.y < chuckBounds.y + chuckBounds.height &&
                     dogBounds.y + dogBounds.height > chuckBounds.y;
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

              // Update parallax background
              if (parallaxRef.current && dogRef.current) {
                const dogBounds = dogRef.current.getBounds();
                if (dogBounds) {
                  parallaxRef.current.update(deltaTime, dogBounds.x);
                }
              }

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
              chuckTimerRef.current += deltaTime;
              if (chuckTimerRef.current >= chuckSpawnIntervalRef.current) {
                  if (dogRef.current) {
                    const dogBounds = dogRef.current.getBounds();
                    if (dogBounds) {
                      chuckRef.current?.spawn(dogBounds.x);
                    }
                  }
                  chuckTimerRef.current = 0;
                  
                  // After first spawn, randomize the interval between 5 and 10 seconds
                  if (isFirstSpawnRef.current) {
                    isFirstSpawnRef.current = false;
                  } else {
                    chuckSpawnIntervalRef.current = Math.random() * 5 + 5; // Random number between 5 and 10
                  }
              }

              // Update chuck if it exists
              if (chuckRef.current) {
                chuckRef.current.update(deltaTime);
                
                // Check for collision with dog
                if (checkChuckCollision()) {
                    handleGameOver();
                    return;
                }
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
          if (parallaxRef.current) {
            parallaxRef.current.destroy();
            parallaxRef.current = null;
          }
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
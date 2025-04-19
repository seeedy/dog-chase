import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const isInitializedRef = useRef(false);
  const gameLoopRef = useRef<() => void | undefined>(() => {});

  useEffect(() => {
    if (!gameRef.current) return;

    console.log('Initializing game...');

    // Handle keyboard input
    const keys: { [key: string]: boolean } = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        keys[e.key] = true;
        console.log('Key pressed:', e.key, 'Current keys state:', keys);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        keys[e.key] = false;
        console.log('Key released:', e.key, 'Current keys state:', keys);
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
        console.log('PIXI Application initialized');
        isInitializedRef.current = true;
        
        // Add the canvas to the DOM
        if (gameRef.current) {
          const canvas = app.canvas;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block'; // Prevent scrollbars
          gameRef.current.appendChild(canvas);
          console.log('Canvas added to DOM');

          // Create a container for all game objects
          const gameContainer = new PIXI.Container();
          app.stage.addChild(gameContainer);

          // Load the dog sprite sheet using PIXI.Assets
          try {
            const dogTexture = await PIXI.Assets.load('assets/sprites/dog_medium.png');
            console.log('Dog texture loaded');
            
            // Sprite sheet dimensions
            const frameWidth = 60;
            const frameHeight = 39;
            
            // Create a spritesheet from the loaded texture
            const spritesheet = new PIXI.Spritesheet(dogTexture.source, {
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

            // Parse the spritesheet
            await spritesheet.parse();
            console.log('Spritesheet parsed');

            // Create arrays of textures for animations
            const runTextures = [
              spritesheet.textures.run0,
              spritesheet.textures.run1,
              spritesheet.textures.run2,
              spritesheet.textures.run3,
              spritesheet.textures.run4
            ];

            const idleTextures = [
              spritesheet.textures.idleSit0,
              spritesheet.textures.idleSit1,
              spritesheet.textures.idleSit2,
              spritesheet.textures.idleSit3
            ];

            // Create animated sprite
            let dog = new PIXI.AnimatedSprite(runTextures);
            console.log('Created animated sprite with textures:', runTextures);
            
            // Set animation properties
            dog.animationSpeed = 0.2;
            dog.play();
            console.log('Started animation');
            
            let currentX = app.screen.width / 2;
            let currentY = app.screen.height / 2;
            let currentAnimation = 'run';
            let lastDirection = 1; // 1 for right, -1 for left
            
            // Center the sprite
            dog.anchor.set(0.5);
            dog.x = currentX;
            dog.y = currentY;
            dog.scale.set(2);

            // Add the dog to the game container
            gameContainer.addChild(dog);
            console.log('Added dog to game container');

            let frameCount = 0;
            let animationFrameId: number;

            // Game loop
            const gameLoop = () => {
              frameCount++;

              const speed = 5;
              let moved = false;
              let isMoving = false;
              
              if (keys['ArrowLeft']) {
                currentX -= speed;
                moved = true;
                isMoving = true;
                lastDirection = 1; // Store direction for idle
                dog.scale.set(2, 2);
                console.log('Moving left, new position:', { x: currentX, y: currentY });
              }
              if (keys['ArrowRight']) {
                currentX += speed;
                moved = true;
                isMoving = true;
                lastDirection = -1; // Store direction for idle
                dog.scale.set(-2, 2);
                console.log('Moving right, new position:', { x: currentX, y: currentY });
              }
              if (keys['ArrowUp']) {
                currentY -= speed;
                moved = true;
                isMoving = true;
                console.log('Moving up, new position:', { x: currentX, y: currentY });
              }
              if (keys['ArrowDown']) {
                currentY += speed;
                moved = true;
                isMoving = true;
                console.log('Moving down, new position:', { x: currentX, y: currentY });
              }

              if (moved) {
                // Update positions
                dog.x = currentX;
                dog.y = currentY;
                
                // Force a render update
                app.stage.updateTransform(app.stage);
                app.render();
              }

              // Switch animations based on movement state
              if (isMoving && currentAnimation !== 'run') {
                currentAnimation = 'run';
                gameContainer.removeChild(dog);
                dog = new PIXI.AnimatedSprite(runTextures);
                dog.animationSpeed = 0.2;
                dog.play();
                dog.anchor.set(0.5);
                dog.scale.set(lastDirection * 2, 2); // Use last direction
                dog.x = currentX;
                dog.y = currentY;
                gameContainer.addChild(dog);
              } else if (!isMoving && currentAnimation !== 'idle') {
                currentAnimation = 'idle';
                gameContainer.removeChild(dog);
                dog = new PIXI.AnimatedSprite(idleTextures);
                dog.animationSpeed = 0.1;
                dog.play();
                dog.anchor.set(0.5);
                dog.scale.set(lastDirection * 2, 2); // Use last direction
                dog.x = currentX;
                dog.y = currentY;
                gameContainer.addChild(dog);
              }

              // Keep the dog within the screen bounds
              currentX = Math.max(dog.width / 2, Math.min(app.screen.width - dog.width / 2, currentX));
              currentY = Math.max(dog.height / 2, Math.min(app.screen.height - dog.height / 2, currentY));

              // Request next frame
              animationFrameId = requestAnimationFrame(gameLoop);
            };

            // Start the game loop
            animationFrameId = requestAnimationFrame(gameLoop);

            // Store the animation frame ID for cleanup
            const animationFrameIdRef = { current: animationFrameId };
            gameLoopRef.current = () => {
              if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
              }
            };
          } catch (error) {
            console.error('Error loading dog sprite sheet:', error);
          }
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
      
      if (appRef.current) {
        try {
          // Remove the game loop if it exists
          if (gameLoopRef.current) {
            gameLoopRef.current();
          }
          // Destroy the PIXI application
          appRef.current.destroy(true, true);
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
        padding: 0
      }}
    />
  );
};

export default Game;
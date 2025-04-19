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
          canvas.style.display = 'block';
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.margin = '0';
          canvas.style.padding = '0';
          canvas.style.border = 'none';
          gameRef.current.appendChild(canvas);
          console.log('Canvas added to DOM');

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
              PIXI.Assets.load('assets/sprites/grass_1.jpg')
          ]);

          const [dogTexture, treatTexture, grassTexture] = textures;
          console.log('All textures loaded');

          // Create tiling background
          const background = new PIXI.TilingSprite({
              texture: grassTexture,
              width: app.screen.width,
              height: app.screen.height
          });
          background.tileScale.set(0.5); // Adjust scale as needed
          gameContainer.addChildAt(background, 0); // Add at bottom of container

          // Create score display
          const scoreText = new PIXI.Text({
              text: 'Score: 0',
              style: {
                  fontFamily: 'Arial',
                  fontSize: 24,
                  fill: 0x000000,
                  align: 'right'
              }
          });
          scoreText.x = app.screen.width - 150;
          scoreText.y = 20;
          app.stage.addChild(scoreText);

          // Initialize game variables
          let frameCount = 0;
          let animationFrameId: number;
          let treatTimer = 0;
          let treatVisible = false;
          let treat: PIXI.Sprite | null = null;
          let score = 0;
          let nextTreatDelay = 5; // Initial delay of 5 seconds

          // Function to get random delay between treats
          const getNextTreatDelay = () => {
              return Math.random() * 7 + 5; // Random number between 5 and 12
          };

          // Function to update score
          const updateScore = (points: number) => {
              score += points;
              scoreText.text = `Score: ${score}`;
          };

          // Function to check collision between dog and treat
          const checkCollision = () => {
              if (!treat || !dog) return false;

              // Simple circle collision detection
              const dogBounds = dog.getBounds();
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
              console.log('Creating new treat...');
              if (treat) {
                  console.log('Removing existing treat');
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
              
              console.log('Adding treat to container at position:', { 
                  x, 
                  y,
                  width: treatWidth,
                  height: treatHeight,
                  screenWidth: app.screen.width,
                  screenHeight: app.screen.height
              });
              gameContainer.addChild(treat);
              treatVisible = true;
              
              // Force a render update
              app.stage.updateTransform(app.stage);
              app.render();
          };

          // Create dog sprite sheet
          const frameWidth = 60;
          const frameHeight = 39;
          
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
          dog.animationSpeed = 0.25;
          dog.play();
          dog.anchor.set(0.5);
          dog.x = app.screen.width / 2;
          dog.y = app.screen.height / 2;
          dog.scale.set(2);
          gameContainer.addChild(dog);

          let currentX = app.screen.width / 2;
          let currentY = app.screen.height / 2;
          let currentAnimation = 'run';
          let lastDirection = 1; // 1 for right, -1 for left
          
          // Game loop
          const gameLoop = () => {
              frameCount++;

              // Handle treat spawning and collision
              treatTimer += 1/60; // Assuming 60 FPS
              if (treatTimer >= nextTreatDelay && !treatVisible) {
                  console.log('Time to spawn treat! Timer:', treatTimer);
                  createTreat();
                  treatTimer = 0;
                  nextTreatDelay = getNextTreatDelay(); // Set next random delay
                  console.log('Next treat will appear in:', nextTreatDelay, 'seconds');
              } else if (treatVisible) {
                  // Check for collision
                  if (checkCollision()) {
                      console.log('Treat collected!');
                      if (treat) {
                          gameContainer.removeChild(treat);
                          treat = null;
                      }
                      treatVisible = false;
                      treatTimer = 0;
                      updateScore(1);
                  } else if (treatTimer >= 3) {
                      console.log('Time to remove treat! Timer:', treatTimer);
                      if (treat) {
                          gameContainer.removeChild(treat);
                          treat = null;
                      }
                      treatVisible = false;
                      treatTimer = 0;
                  }
              }

              // Log treat state periodically
              if (frameCount % 60 === 0) { // Log every second
                  console.log('Treat state:', {
                      visible: treatVisible,
                      timer: treatTimer,
                      exists: !!treat
                  });
              }

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
        padding: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    />
  );
};

export default Game;
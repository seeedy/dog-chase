import * as PIXI from 'pixi.js';
import { StaminaBar } from './StaminaBar';

interface GameUIProps {
  app: PIXI.Application;
}

export class GameUI {
  private staminaBar: StaminaBar;
  private scoreText: PIXI.Text;
  private gameOverText: PIXI.Text;
  private score: number = 0;

  constructor({ app }: GameUIProps) {
    // Create stamina bar
    this.staminaBar = new StaminaBar({ app });

    // Create score display
    this.scoreText = new PIXI.Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0x000000,
        align: 'right'
      }
    });
    this.scoreText.x = app.screen.width - 150;
    this.scoreText.y = 20;
    app.stage.addChild(this.scoreText);

    // Create game over text
    this.gameOverText = new PIXI.Text({
      text: 'Game Over',
      style: {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xFF0000,
        align: 'center'
      }
    });
    this.gameOverText.anchor.set(0.5);
    this.gameOverText.x = app.screen.width / 2;
    this.gameOverText.y = 50;
    this.gameOverText.visible = false;
    app.stage.addChild(this.gameOverText);
  }

  public updateStamina(stamina: number) {
    this.staminaBar.update(stamina);
  }

  public updateScore(points: number) {
    this.score += points;
    this.scoreText.text = `Score: ${this.score}`;
  }

  public resetScore() {
    this.score = 0;
    this.scoreText.text = 'Score: 0';
  }

  public showGameOver() {
    this.gameOverText.visible = true;
  }

  public hideGameOver() {
    this.gameOverText.visible = false;
  }

  public destroy() {
    this.staminaBar.destroy();
    this.scoreText.destroy();
    this.gameOverText.destroy();
  }
} 
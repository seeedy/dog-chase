import * as PIXI from 'pixi.js';

interface StaminaBarProps {
  app: PIXI.Application;
}

export class StaminaBar {
  private container: PIXI.Container;
  private background: PIXI.Graphics;
  private fill: PIXI.Graphics;
  private readonly width: number = 200;
  private readonly height: number = 20;
  private readonly padding: number = 2;

  constructor({ app }: StaminaBarProps) {
    this.container = new PIXI.Container();
    this.container.x = 20;
    this.container.y = 20;

    // Create background
    this.background = new PIXI.Graphics();
    this.background.beginFill(0x000000, 0.5);
    this.background.drawRoundedRect(0, 0, this.width, this.height, 4);
    this.background.endFill();

    // Create fill
    this.fill = new PIXI.Graphics();
    this.updateFill(1);

    this.container.addChild(this.background);
    this.container.addChild(this.fill);
    app.stage.addChild(this.container);
  }

  public update(stamina: number) {
    this.updateFill(stamina);
  }

  private updateFill(stamina: number) {
    this.fill.clear();
    this.fill.beginFill(stamina === 1 ? 0x00FF00 : 0xFFFF00);
    this.fill.drawRoundedRect(
      this.padding,
      this.padding,
      (this.width - this.padding * 2) * stamina,
      this.height - this.padding * 2,
      2
    );
    this.fill.endFill();
  }

  public destroy() {
    this.container.destroy({ children: true });
  }
} 
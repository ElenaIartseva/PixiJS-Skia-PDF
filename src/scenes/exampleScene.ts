import { Container, Graphics } from '@/lib/pixi';

export function exampleScene(): Container {
  const container = new Container();
  const subContainer = new Container();
  const g1 = new Graphics();
  const g2 = new Graphics();
  const g3 = new Graphics();
  const g4 = new Graphics();

  g1.beginFill(0xff0000);
  g1.drawEllipse(0, 0, 200, 100);
  g1.endFill();
  g1.position.set(200, 100);
  g1.angle = 30;
  g1.interactive = true;
  g1.cursor = 'grab';
  g1.on('pointerdown', () => console.log('g1 pointerdown!'));

  g2.beginFill(0x0000ff);
  g2.drawRect(-50, -75, 100, 150);
  g2.endFill();
  g2.position.set(120, 60);
  g2.angle = 15;
  g2.scale.set(1.5, 1.7);
  g2.interactive = true;
  g2.cursor = 'grab';
  g2.on('pointerup', () => console.log('g2 pointerup!'));

  g3.lineStyle(10, 0xffffff, 1);
  g3.moveTo(0, 0).lineTo(150, 100);
  g3.angle = -20;
  g3.interactive = true;
  g3.cursor = 'grab';

  g4.lineStyle(10, 0xffff00, 1);
  g4.moveTo(0, 70).lineTo(150, -30);
  g4.angle = 20;
  g4.interactive = true;
  g4.cursor = 'grab';

  subContainer.position.set(75, 50);
  subContainer.addChild(g3, g4);
  container.addChild(subContainer, g1, g2);
  
  return container;
}
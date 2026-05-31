import { Container, Graphics } from '@/lib/pixi';

export function geometryScene(): Container {
  const container = new Container();

  const g1 = new Graphics();
  g1.beginFill(0xff0000);
  g1.drawRect(50, 50, 200, 150);
  g1.endFill();
  g1.interactive = true;
  g1.cursor = 'grab';
  container.addChild(g1);

  const g2 = new Graphics();
  g2.beginFill(0x00ff00);
  g2.drawEllipse(350, 150, 120, 80);
  g2.endFill();
  g2.interactive = true;
  g2.cursor = 'grab';
  container.addChild(g2);

  const g3 = new Graphics();
  g3.beginFill(0x336699, 0.7);
  g3.lineStyle(4, 0x00ffff, 1);
  g3.moveTo(500, 50)
    .lineTo(650, 80)
    .lineTo(620, 180)
    .lineTo(520, 200)
    .lineTo(480, 130)
    .closePath();
  g3.endFill();
  g3.interactive = true;
  g3.cursor = 'grab';
  container.addChild(g3);

  const g4 = new Graphics();
  g4.beginFill(0xffcc00, 0.8);
  g4.lineStyle(6, 0x663300, 1);
  g4.drawRoundedRect(90, 280, 180, 110, 28);
  g4.endFill();
  g4.angle = -8;
  g4.interactive = true;
  g4.cursor = 'grab';
  container.addChild(g4);

  const g5 = new Graphics();
  g5.beginFill(0xff66aa, 0.75);
  g5.lineStyle(5, 0xffffff, 1);
  g5.drawCircle(430, 360, 65);
  g5.endFill();
  g5.interactive = true;
  g5.cursor = 'grab';
  container.addChild(g5);

  const g6 = new Graphics();
  g6.lineStyle(8, 0x222222, 1);
  g6.moveTo(560, 320)
    .bezierCurveTo(650, 230, 720, 430, 610, 470);
  g6.interactive = true;
  g6.cursor = 'grab';
  container.addChild(g6);

  return container;
}
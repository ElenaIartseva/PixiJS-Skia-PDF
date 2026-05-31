import { Container, Text, TextStyle } from '@/lib/pixi';

export function textScene(): Container {
  const container = new Container();

  const text1 = new Text(
    'Векторный текст',
    new TextStyle({
      fontFamily: 'Aeonik Pro Trial',
      fontSize: 40,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 3,
    }),
  );
  text1.position.set(200, 150);
  text1.angle = -5;
  text1.interactive = true;
  text1.cursor = 'grab';
  container.addChild(text1);

  const text2 = new Text(
    'Градиентный текст',
    new TextStyle({
      fontFamily: 'Aeonik Pro Trial',
      fontSize: 30,
      fill: [0xff0000, 0x00ff00],
    }),
  );
  text2.position.set(100, 300);
  text2.interactive = true;
  text2.cursor = 'grab';
  container.addChild(text2);

  return container;
}
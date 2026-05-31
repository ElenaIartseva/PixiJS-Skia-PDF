'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Graphics } from '@/lib/pixi';
import { loadCanvasKit, CanvasKit } from '@/lib/load-canvaskit';
import { convertPixiContainerToSkia } from '@/lib/pixi-to-skia';
import { exportToPdf } from '@/lib/skia-pdf-exporter';
import { addCanvasPointerEvents } from '@/lib/event-handler';
import { SkiaRendererCache } from '@/lib/skia-cache';
import { DragHandler } from '@/lib/drag-handler';
import { SceneSwitcher } from '@/components/SceneSwitcher/SceneSwitcher';
import { exampleScene } from '@/scenes/exampleScene';
import { geometryScene } from '@/scenes/geometryScene';
import { spriteScene } from '@/scenes/spriteScene';
import { textScene } from '@/scenes/textScene';
import styles from './page.module.scss';

type SceneFactory = () => Container;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const SCENES: Record<string, SceneFactory> = {
  example: exampleScene,
  geometry: geometryScene,
  textScene,
  sprites: spriteScene,
};

export default function HomePage() {
  const pixiCanvasRef = useRef<HTMLCanvasElement>(null);
  const skiaCanvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const mainContainerRef = useRef<Container | null>(null);
  const [ck, setCk] = useState<CanvasKit | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [skiaStatus, setSkiaStatus] = useState('CanvasKit загружается...');
  const skiaCacheRef = useRef<SkiaRendererCache | null>(null);
  const dragHandlerRef = useRef<DragHandler | null>(null);
  const reportInitError = useCallback((message: string) => {
    queueMicrotask(() => setInitError(message));
  }, []);

  useEffect(() => {
    if (!pixiCanvasRef.current || !skiaCanvasRef.current) return;

    let pixiApp: Application | null = null;

    try {
      pixiApp = new Application({
        view: pixiCanvasRef.current,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0xd7cfc6,
        antialias: true,
        forceCanvas: true,
      });
      appRef.current = pixiApp;

      const mainContainer = new Container();
      mainContainer.pivot.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      mainContainer.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      mainContainerRef.current = mainContainer;
      pixiApp.stage.addChild(mainContainer);
      mainContainer.addChild(SCENES.example());

      const animate = () => {
        mainContainer.angle += 0.06;
        skiaCacheRef.current?.renderNow();
      };
      pixiApp.ticker.add(animate);

      loadCanvasKit()
        .then((ckInstance) => {
          setSkiaStatus('CanvasKit загружен, создаю Skia surface...');
          setCk(ckInstance);
        })
        .catch((error) => {
          console.error(error);
          setSkiaStatus('CanvasKit не загрузился');
          reportInitError('CanvasKit не загрузился. Skia-канвас и PDF недоступны.');
        });
    } catch (error) {
      console.error(error);
      reportInitError(
        error instanceof Error ? error.message : 'Не удалось инициализировать Pixi',
      );
    }

    return () => {
      pixiApp?.destroy(true, { children: true, texture: false, baseTexture: false });
      appRef.current = null;
      mainContainerRef.current = null;
    };
  }, [reportInitError]);

  useEffect(() => {
    if (!ck || !pixiCanvasRef.current || !skiaCanvasRef.current || !mainContainerRef.current) return;

    const pixiCanvasEl = pixiCanvasRef.current;
    const skCanvasEl = skiaCanvasRef.current;
    skCanvasEl.width = CANVAS_WIDTH;
    skCanvasEl.height = CANVAS_HEIGHT;

    const cache = new SkiaRendererCache(
      ck,
      skCanvasEl,
      mainContainerRef.current,
      (ckInstance, canvas, container) =>
        convertPixiContainerToSkia(ckInstance, canvas, container),
      setSkiaStatus,
    );
    skiaCacheRef.current = cache;
    cache.start();

    const removePixiPointerEvents = addCanvasPointerEvents(pixiCanvasEl, mainContainerRef.current);
    const removeSkiaPointerEvents = addCanvasPointerEvents(skCanvasEl, mainContainerRef.current);

    dragHandlerRef.current = new DragHandler(
      mainContainerRef.current,
      pixiCanvasEl,
      skCanvasEl,
      () => {
        cache.markDirty();
        appRef.current?.render();
      },
    );

    return () => {
      cache.stop();
      removePixiPointerEvents();
      removeSkiaPointerEvents();
      dragHandlerRef.current?.destroy();
      skiaCacheRef.current = null;
    };
  }, [ck]);

  const handleSceneChange = useCallback((sceneKey: string) => {
    const factory = SCENES[sceneKey];
    const main = mainContainerRef.current;
    if (!factory || !main) return;

    main.removeChildren();
    main.addChild(factory());
    skiaCacheRef.current?.markDirty();
    appRef.current?.render();
  }, []);

  const addRandomShape = () => {
    const main = mainContainerRef.current;
    if (!main) return;

    const g = new Graphics();
    const rand = Math.random();
    if (rand < 0.3) {
      g.beginFill(0x00ff00);
      g.drawRect(-30, -20, 60, 40);
      g.endFill();
    } else if (rand < 0.6) {
      g.beginFill(0xff00ff);
      g.drawEllipse(0, 0, 50, 30);
      g.endFill();
    } else {
      g.lineStyle(5, 0xffffff, 1);
      g.moveTo(0, 0).lineTo(80, 0).lineTo(40, 60).lineTo(0, 0);
    }
    g.position.set(400 + Math.random() * 200, 100 + Math.random() * 400);
    g.angle = Math.random() * 360;
    g.interactive = true;
    g.cursor = 'grab';
    g.on('pointerdown', () => console.log('random shape'));
    main.addChild(g);
    skiaCacheRef.current?.markDirty();
    appRef.current?.render();
  };

  const handleExportPdf = () => {
    if (!mainContainerRef.current) {
      alert('Сцена ещё не инициализирована');
      return;
    }
    if (!ck) {
      alert('CanvasKit ещё не загружен');
      return;
    }
    try {
      exportToPdf(ck, mainContainerRef.current);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'PDF export failed');
    }
  };

  return (
    <main className={styles.main}>
      {initError && <p className={styles.error}>{initError}</p>}

      <div className={styles.workspace}>
        <div className={styles.canvases}>
          <div className={styles.canvasBlock}>
            <h2 className={styles.title}>Canvas Pixi.js</h2>
            <canvas
              ref={pixiCanvasRef}
              className={styles.canvas}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          </div>
          <div className={styles.canvasBlock}>
            <h2 className={styles.title}>Canvas Skia</h2>
            <canvas
              id="skia-output-canvas"
              ref={skiaCanvasRef}
              className={styles.canvas}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
            <p className={styles.status}>{skiaStatus}</p>
          </div>
        </div>

        <div className={styles.controls}>
          <SceneSwitcher scenes={Object.keys(SCENES)} onSwitch={handleSceneChange} />

          <div className={styles.buttons}>
            <button type="button" onClick={addRandomShape} className={styles.btn}>
              Сгенерировать случайную линию / фигуру
            </button>
            <button type="button" onClick={handleExportPdf} className={styles.btn}>
              Экспорт в PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

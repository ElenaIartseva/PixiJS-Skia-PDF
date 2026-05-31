import { Container } from '@/lib/pixi';
import type { CanvasKit, Surface, Canvas as SkCanvas } from 'canvaskit-wasm';

type RenderFn = (ck: CanvasKit, canvas: SkCanvas, container: Container) => void;

const SKIA_BACKGROUND = [0xd7 / 255, 0xcf / 255, 0xc6 / 255, 1] as const;

export class SkiaRendererCache {
  private dirty = true;
  private surface: Surface | null = null;
  private animationFrameId: number | null = null;
  private renderErrorReported = false;

  constructor(
    private ck: CanvasKit,
    private canvasEl: HTMLCanvasElement,
    private container: Container,
    private renderFn: RenderFn,
    private onStatus?: (message: string) => void,
  ) {
    this.surface = this.createSurface();
    if (!this.surface) {
      console.error('SkiaRendererCache: CanvasKit не смог создать поверхность канваса');
      this.onStatus?.('CanvasKit загружен, но поверхность Skia не создана');
      this.drawFallbackMessage('Поверхность Skia не создана');
    } else {
      this.onStatus?.('Поверхность Skia готова');
    }
    this.attachObservers();
    this.markDirty();
  }

  private createSurface() {
    const ckWithSurface = this.ck as CanvasKit & {
      MakeSWCanvasSurface?: (canvas: HTMLCanvasElement | string) => Surface | null;
      MakeCanvasSurface?: (canvas: HTMLCanvasElement | string) => Surface | null;
    };
    const canvasId = this.canvasEl.id || 'skia-output-canvas';
    this.canvasEl.id = canvasId;

    const attempts: Array<() => Surface | null | undefined> = [
      () => ckWithSurface.MakeSWCanvasSurface?.(this.canvasEl),
      () => ckWithSurface.MakeSWCanvasSurface?.(canvasId),
      () => ckWithSurface.MakeCanvasSurface?.(this.canvasEl),
      () => ckWithSurface.MakeCanvasSurface?.(canvasId),
    ];

    for (const attempt of attempts) {
      try {
        const surface = attempt();
        if (surface) return surface;
      } catch (error) {
        console.warn('Не удалось создать поверхность CanvasKit', error);
      }
    }

    return null;
  }

  private drawFallbackMessage(message: string) {
    const context = this.canvasEl.getContext('2d');
    if (!context) return;

    context.fillStyle = '#332222';
    context.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    context.fillStyle = '#ffdddd';
    context.font = '20px sans-serif';
    context.fillText(message, 24, 48);
  }

  private attachObservers() {
    const mark = () => this.markDirty();

    this.container.on('childAdded', mark);
    this.container.on('childRemoved', mark);
  }

  markDirty() {
    this.dirty = true;
  }

  renderNow() {
    if (!this.surface) return;

    const skCanvas = this.surface.getCanvas();
    if (!skCanvas) return;

    try {
      skCanvas.clear(this.ck.Color4f(...SKIA_BACKGROUND));
      this.container.updateTransform();
      this.renderFn(this.ck, skCanvas, this.container);
      this.onStatus?.('Рендер Skia обновлён');
      this.renderErrorReported = false;
    } catch (error) {
      console.error('Не удалось выполнить рендер Skia', error);
      if (!this.renderErrorReported) {
        this.onStatus?.('Не удалось выполнить рендер Skia. Проверьте консоль браузера.');
        this.renderErrorReported = true;
      }
    } finally {
      this.surface.flush();
    }

    this.dirty = false;
  }

  start() {
    const loop = () => {
      if (this.dirty && this.surface) {
        this.renderNow();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.container.off('childAdded');
    this.container.off('childRemoved');
  }
}
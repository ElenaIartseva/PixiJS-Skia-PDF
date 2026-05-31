import { Container, Point, type ContainerChild } from '@/lib/pixi';
import { findDisplayObjectAt } from './hit-test';

export class DragHandler {
  private dragged: ContainerChild | null = null;
  private offset = new Point();
  private activeCanvas: HTMLCanvasElement | null = null;
  private activePointerId: number | null = null;
  private onMove = (e: PointerEvent) => this.handleMove(e);
  private onUp = (e: PointerEvent) => this.endDrag(e);
  private boundStartDragPixi: (e: PointerEvent) => void;
  private boundStartDragSkia: (e: PointerEvent) => void;
  private boundHoverPixi: (e: PointerEvent) => void;
  private boundHoverSkia: (e: PointerEvent) => void;
  private boundLeavePixi: () => void;
  private boundLeaveSkia: () => void;

  constructor(
    private container: Container,
    private pixiCanvas: HTMLCanvasElement,
    private skiaCanvas: HTMLCanvasElement,
    private markDirty?: () => void,
  ) {
    this.boundStartDragPixi = (e: PointerEvent) => this.startDrag(e, this.pixiCanvas);
    this.boundStartDragSkia = (e: PointerEvent) => this.startDrag(e, this.skiaCanvas);
    this.boundHoverPixi = (e: PointerEvent) => this.updateHoverCursor(e, this.pixiCanvas);
    this.boundHoverSkia = (e: PointerEvent) => this.updateHoverCursor(e, this.skiaCanvas);
    this.boundLeavePixi = () => this.clearHoverCursor(this.pixiCanvas);
    this.boundLeaveSkia = () => this.clearHoverCursor(this.skiaCanvas);

    this.pixiCanvas.addEventListener('pointerdown', this.boundStartDragPixi);
    this.pixiCanvas.addEventListener('pointermove', this.boundHoverPixi);
    this.pixiCanvas.addEventListener('pointerleave', this.boundLeavePixi);
    this.skiaCanvas.addEventListener('pointerdown', this.boundStartDragSkia);
    this.skiaCanvas.addEventListener('pointermove', this.boundHoverSkia);
    this.skiaCanvas.addEventListener('pointerleave', this.boundLeaveSkia);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  private getCanvasCoords(e: PointerEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;

    return new Point(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
    );
  }

  private startDrag(e: PointerEvent, canvas: HTMLCanvasElement) {
    this.container.updateTransform();
    const pos = this.getCanvasCoords(e, canvas);
    const hit = findDisplayObjectAt(this.container, pos.x, pos.y, { interactiveOnly: true });
    if (!hit) return;

    const parent = hit.parent;
    if (!parent) return;

    const localPos = parent.worldTransform.applyInverse(pos);
    this.dragged = hit;
    this.activeCanvas = canvas;
    this.offset.set(localPos.x - hit.position.x, localPos.y - hit.position.y);
    this.activePointerId = e.pointerId;
    this.setCanvasCursor(canvas, 'grabbing');
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  }

  private handleMove(e: PointerEvent) {
    if (!this.dragged || !this.activeCanvas) return;
    this.container.updateTransform();
    const pos = this.getCanvasCoords(e, this.activeCanvas);
    const parent = this.dragged.parent;

    if (parent) {
      const localPos = parent.worldTransform.applyInverse(pos);
      this.dragged.position.set(
        localPos.x - this.offset.x,
        localPos.y - this.offset.y,
      );
    }
    this.markDirty?.();
  }

  private endDrag(e?: PointerEvent) {
    const canvas = this.activeCanvas;
    const pointerId = this.activePointerId;

    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }

    this.dragged = null;
    this.activeCanvas = null;
    this.activePointerId = null;

    if (canvas) {
      if (e) {
        this.updateHoverCursor(e, canvas);
      } else {
        this.clearHoverCursor(canvas);
      }
    }
  }

  private updateHoverCursor(e: PointerEvent, canvas: HTMLCanvasElement) {
    if (this.dragged && this.activeCanvas === canvas) {
      this.setCanvasCursor(canvas, 'grabbing');
      return;
    }

    this.container.updateTransform();
    const pos = this.getCanvasCoords(e, canvas);
    const hit = findDisplayObjectAt(this.container, pos.x, pos.y, { interactiveOnly: true });
    this.setCanvasCursor(canvas, hit ? 'grab' : '');
  }

  private clearHoverCursor(canvas: HTMLCanvasElement) {
    if (this.activeCanvas === canvas) return;
    this.setCanvasCursor(canvas, '');
  }

  private setCanvasCursor(canvas: HTMLCanvasElement, cursor: string) {
    canvas.style.cursor = cursor;
  }

  destroy() {
    this.pixiCanvas.removeEventListener('pointerdown', this.boundStartDragPixi);
    this.pixiCanvas.removeEventListener('pointermove', this.boundHoverPixi);
    this.pixiCanvas.removeEventListener('pointerleave', this.boundLeavePixi);
    this.skiaCanvas.removeEventListener('pointerdown', this.boundStartDragSkia);
    this.skiaCanvas.removeEventListener('pointermove', this.boundHoverSkia);
    this.skiaCanvas.removeEventListener('pointerleave', this.boundLeaveSkia);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.setCanvasCursor(this.pixiCanvas, '');
    this.setCanvasCursor(this.skiaCanvas, '');
  }
}
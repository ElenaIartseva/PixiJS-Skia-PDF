import { Container } from '@/lib/pixi';
import { findDisplayObjectAt } from './hit-test';

export function addCanvasPointerEvents(
  canvasElement: HTMLCanvasElement,
  container: Container,
) {
  const getPos = (e: PointerEvent) => {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = rect.width ? canvasElement.width / rect.width : 1;
    const scaleY = rect.height ? canvasElement.height / rect.height : 1;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const emitPointerEvent = (
    e: PointerEvent,
    lowerCaseEventName: 'pointerdown' | 'pointerup',
    camelCaseEventName: 'pointerDown' | 'pointerUp',
  ) => {
    const { x, y } = getPos(e);
    container.updateTransform();
    const hit = findDisplayObjectAt(container, x, y, { interactiveOnly: true });
    if (hit?.interactive) {
      hit.emit(lowerCaseEventName, e);
      hit.emit(camelCaseEventName, e);
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    emitPointerEvent(e, 'pointerdown', 'pointerDown');
  };

  const handlePointerUp = (e: PointerEvent) => {
    emitPointerEvent(e, 'pointerup', 'pointerUp');
  };

  canvasElement.addEventListener('pointerdown', handlePointerDown);
  canvasElement.addEventListener('pointerup', handlePointerUp);

  return () => {
    canvasElement.removeEventListener('pointerdown', handlePointerDown);
    canvasElement.removeEventListener('pointerup', handlePointerUp);
  };
}
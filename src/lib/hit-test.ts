/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, Graphics, Point, type ContainerChild } from '@/lib/pixi';

type HitTestOptions = {
  interactiveOnly?: boolean;
};

const SHAPES = {
  POLY: 0,
  RECT: 1,
  CIRC: 2,
  ELIP: 3,
  RREC: 4,
} as const;

export function findDisplayObjectAt(
  container: Container,
  x: number,
  y: number,
  options: HitTestOptions = {},
): ContainerChild | null {
  const children = [...container.children].reverse();

  for (const child of children) {
    if (!child.visible || !child.renderable) continue;

    if (child instanceof Container) {
      const nestedHit = findDisplayObjectAt(child, x, y, options);
      if (nestedHit) return nestedHit;
    }

    if (options.interactiveOnly && !child.interactive) continue;

    if (hitDisplayObject(child, x, y)) {
      return child;
    }
  }

  return null;
}

function hitDisplayObject(child: ContainerChild, x: number, y: number) {
  const hitArea = (child as any).hitArea;
  if (hitArea?.contains) {
    const localPoint = child.worldTransform.applyInverse(new Point(x, y), new Point());
    return hitArea.contains(localPoint.x, localPoint.y);
  }

  if (child instanceof Graphics) {
    return hitGraphics(child, x, y);
  }

  const containsPoint = (child as { containsPoint?: (point: Point) => boolean }).containsPoint;
  if (containsPoint) {
    return containsPoint.call(child, new Point(x, y));
  }

  const bounds = child.getBounds();
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

function hitGraphics(graphics: Graphics, x: number, y: number) {
  const geometry = (graphics as any).geometry;
  if (!geometry?.graphicsData) return hitDisplayObjectBounds(graphics, x, y);

  const localPoint = graphics.worldTransform.applyInverse(new Point(x, y), new Point());

  for (const data of geometry.graphicsData) {
    const shapePoint = data.matrix?.applyInverse
      ? data.matrix.applyInverse(localPoint, new Point())
      : localPoint;

    if (data.fillStyle?.visible && data.shape?.contains?.(shapePoint.x, shapePoint.y)) {
      return true;
    }

    if (data.lineStyle?.visible && isPointOnShapeStroke(data.shape, shapePoint, data.lineStyle.width)) {
      return true;
    }
  }

  return false;
}

function hitDisplayObjectBounds(child: ContainerChild, x: number, y: number) {
  const bounds = child.getBounds();
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

function isPointOnShapeStroke(shape: any, point: Point, strokeWidth = 1) {
  const halfWidth = Math.max(strokeWidth / 2, 1);

  switch (shape?.type) {
    case SHAPES.POLY:
      return isPointNearPolyline(
        point,
        shape.points,
        halfWidth,
        shape.closeStroke === true || shape.closed === true,
      );
    case SHAPES.RECT:
      return isPointNearRectStroke(point, shape.x, shape.y, shape.width, shape.height, halfWidth);
    case SHAPES.CIRC:
      return isPointNearEllipseStroke(point, shape.x, shape.y, shape.radius, shape.radius, halfWidth);
    case SHAPES.ELIP:
      return isPointNearEllipseStroke(point, shape.x, shape.y, shape.width, shape.height, halfWidth);
    case SHAPES.RREC:
      return isPointNearRoundedRectStroke(point, shape.x, shape.y, shape.width, shape.height, shape.radius, halfWidth);
    default:
      if (Array.isArray(shape?.points) && shape.points.length >= 4) {
        return isPointNearPolyline(
          point,
          shape.points,
          halfWidth,
          shape.closeStroke === true || shape.closed === true,
        );
      }

      if (typeof shape?.radius === 'number') {
        return isPointNearEllipseStroke(point, shape.x, shape.y, shape.radius, shape.radius, halfWidth);
      }
  }

  return false;
}

function isPointNearPolyline(point: Point, points: number[], maxDistance: number, closed: boolean) {
  for (let i = 0; i < points.length - 2; i += 2) {
    if (
      distanceToSegment(point.x, point.y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= maxDistance
    ) {
      return true;
    }
  }

  if (closed) {
    return (
      distanceToSegment(
        point.x,
        point.y,
        points[points.length - 2],
        points[points.length - 1],
        points[0],
        points[1],
      ) <= maxDistance
    );
  }

  return false;
}

function isPointNearRectStroke(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number,
  maxDistance: number,
) {
  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const top = Math.min(y, y + height);
  const bottom = Math.max(y, y + height);

  if (
    point.x < left - maxDistance ||
    point.x > right + maxDistance ||
    point.y < top - maxDistance ||
    point.y > bottom + maxDistance
  ) {
    return false;
  }

  const dx = Math.min(Math.abs(point.x - left), Math.abs(point.x - right));
  const dy = Math.min(Math.abs(point.y - top), Math.abs(point.y - bottom));

  return dx <= maxDistance || dy <= maxDistance;
}

function isPointNearRoundedRectStroke(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  maxDistance: number,
) {
  const clampedRadius = Math.max(0, Math.min(radius, Math.min(Math.abs(width), Math.abs(height)) / 2));

  if (isPointNearRectStroke(point, x + clampedRadius, y, width - clampedRadius * 2, height, maxDistance)) {
    return true;
  }

  if (isPointNearRectStroke(point, x, y + clampedRadius, width, height - clampedRadius * 2, maxDistance)) {
    return true;
  }

  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const top = Math.min(y, y + height);
  const bottom = Math.max(y, y + height);
  const cornerCenters = [
    [left + clampedRadius, top + clampedRadius],
    [right - clampedRadius, top + clampedRadius],
    [right - clampedRadius, bottom - clampedRadius],
    [left + clampedRadius, bottom - clampedRadius],
  ];

  return cornerCenters.some(([centerX, centerY]) =>
    isPointNearEllipseStroke(point, centerX, centerY, clampedRadius, clampedRadius, maxDistance),
  );
}

function isPointNearEllipseStroke(
  point: Point,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  maxDistance: number,
) {
  if (radiusX <= 0 || radiusY <= 0) return false;

  const normalizedDistance = Math.hypot((point.x - centerX) / radiusX, (point.y - centerY) / radiusY);
  const averageRadius = (radiusX + radiusY) / 2;

  return Math.abs(normalizedDistance - 1) * averageRadius <= maxDistance;
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;

  return Math.hypot(px - closestX, py - closestY);
}

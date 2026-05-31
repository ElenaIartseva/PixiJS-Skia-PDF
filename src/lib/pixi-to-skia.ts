/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CanvasKit, Canvas as SkCanvas, Paint } from 'canvaskit-wasm';
import { Container, Graphics, Sprite, Text } from '@/lib/pixi';
import { publicPath } from './public-path';

const SHAPES = {
  POLY: 0,
  RECT: 1,
  CIRC: 2,
  ELIP: 3,
  RREC: 4,
} as const;

let fontLoaded = false;
let fontMgr: any = null;

export function convertPixiContainerToSkia(
  ck: CanvasKit,
  canvas: SkCanvas,
  container: Container,
) {
  canvas.save();
  applyTransform(canvas, container.localTransform);

  renderContainerChildren(ck, canvas, container);

  canvas.restore();
}

function renderContainerChildren(
  ck: CanvasKit,
  canvas: SkCanvas,
  container: Container,
) {
  const children = container.children as any[];
  
  for (const child of children) {
    canvas.save();
    applyTransform(canvas, child.localTransform);
    
    if (child instanceof Graphics) {
      renderGraphics(ck, canvas, child);
    } else if (child instanceof Sprite) {
      renderSprite(ck, canvas, child);
    } else if (child instanceof Text) {
      renderText(ck, canvas, child);
    } else if (child instanceof Container) {
      renderContainerChildren(ck, canvas, child);
    }
    
    canvas.restore();
  }
}

function applyTransform(canvas: SkCanvas, wt: any) {
  canvas.concat([wt.a, wt.c, wt.tx, wt.b, wt.d, wt.ty, 0, 0, 1]);
}

function renderGraphics(ck: CanvasKit, canvas: SkCanvas, graphics: Graphics) {
  const geom = (graphics as any).geometry;
  if (!geom?.graphicsData) return;

  for (const data of geom.graphicsData) {
    const { shape, lineStyle, fillStyle } = data;

    if (fillStyle?.visible) {
      const paint = createPaintFromStyle(ck, fillStyle, false);
      if (paint) drawShape(ck, canvas, shape, paint, data);
    }
    
    if (lineStyle?.visible) {
      const paint = createPaintFromStyle(ck, lineStyle, true);
      if (paint) {
        paint.setStrokeWidth(lineStyle.width);
        applyStrokeStyle(ck, paint, lineStyle);
        drawShape(ck, canvas, shape, paint, data);
      }
    }
  }
}

function applyStrokeStyle(ck: CanvasKit, paint: Paint, lineStyle: any) {
  const ckAny = ck as any;
  const paintAny = paint as any;

  if (lineStyle.cap && ckAny.StrokeCap && paintAny.setStrokeCap) {
    paintAny.setStrokeCap(ckAny.StrokeCap[capitalize(lineStyle.cap)] ?? ckAny.StrokeCap.Butt);
  }

  if (lineStyle.join && ckAny.StrokeJoin && paintAny.setStrokeJoin) {
    paintAny.setStrokeJoin(ckAny.StrokeJoin[capitalize(lineStyle.join)] ?? ckAny.StrokeJoin.Miter);
  }

  if (typeof lineStyle.miterLimit === 'number' && paintAny.setStrokeMiter) {
    paintAny.setStrokeMiter(lineStyle.miterLimit);
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createPaintFromStyle(ck: CanvasKit, style: any, isStroke: boolean): Paint | null {
  const paint = new ck.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(isStroke ? ck.PaintStyle.Stroke : ck.PaintStyle.Fill);

  const fill = style.fill;
  if (fill?.colorStops) {
    const { x0, y0, x1, y1 } = fill;
    const colors = fill.colorStops.map((stop: any) =>
      ck.Color4f(
        ((stop.color >> 16) & 0xff) / 255,
        ((stop.color >> 8) & 0xff) / 255,
        (stop.color & 0xff) / 255,
        stop.alpha,
      ),
    );
    const positions = fill.colorStops.map((stop: any) => stop.offset);
    const shader = ck.Shader.MakeLinearGradient(
      [x0, y0], [x1, y1], colors, positions, ck.TileMode.Clamp,
    );
    paint.setShader(shader);
  } else if (typeof style.color === 'number') {
    const c = style.color;
    paint.setColor(
      ck.Color4f(
        ((c >> 16) & 0xff) / 255,
        ((c >> 8) & 0xff) / 255,
        (c & 0xff) / 255,
        style.alpha ?? 1,
      ),
    );
  } else {
    return null;
  }
  
  return paint;
}

function drawShape(ck: CanvasKit, canvas: SkCanvas, shape: any, paint: Paint, data?: any) {
  if (!shape) return;

  if (data?.holes?.length && isFillPaint(ck, paint)) {
    drawFilledShapeWithHoles(ck, canvas, shape, paint, data);
    return;
  }

  canvas.save();
  if (data?.matrix) applyTransform(canvas, data.matrix);

  if (shape.type === SHAPES.RECT) {
    canvas.drawRect(toRect(shape.x, shape.y, shape.width, shape.height), paint);
  } else {
    const path = shapeToPath(ck, shape);
    if (path) {
      canvas.drawPath(path, paint);
      deleteSkiaObject(path);
    }
  }

  canvas.restore();
}

function drawFilledShapeWithHoles(
  ck: CanvasKit,
  canvas: SkCanvas,
  shape: any,
  paint: Paint,
  data: any,
) {
  const path = shapeToPath(ck, shape, data.matrix);
  if (!path) return;

  for (const hole of data.holes) {
    const holePath = shapeToPath(ck, hole.shape, hole.matrix);
    if (!holePath) continue;
    (path as any).addPath?.(holePath);
    deleteSkiaObject(holePath);
  }

  const fillType = (ck as any).FillType?.EvenOdd;
  if (fillType !== undefined) {
    (path as any).setFillType?.(fillType);
  }

  canvas.drawPath(path, paint);
  deleteSkiaObject(path);
}

function isFillPaint(ck: CanvasKit, paint: Paint) {
  const paintStyle = (paint as any).getStyle?.();

  return paintStyle === undefined || paintStyle === ck.PaintStyle.Fill;
}

function shapeToPath(ck: CanvasKit, shape: any, matrix?: any) {
  const pathBuilder = createPathBuilder(ck);

  switch (shape.type) {
    case SHAPES.POLY:
      addPolygonToPath(pathBuilder, shape);
      break;
    case SHAPES.RECT:
      pathBuilder.addRect(toRect(shape.x, shape.y, shape.width, shape.height));
      break;
    case SHAPES.CIRC:
      pathBuilder.addCircle(shape.x, shape.y, shape.radius);
      break;
    case SHAPES.ELIP:
      pathBuilder.addOval(toRect(shape.x - shape.width, shape.y - shape.height, shape.width * 2, shape.height * 2));
      break;
    case SHAPES.RREC:
      pathBuilder.addRoundRect(toRect(shape.x, shape.y, shape.width, shape.height), shape.radius);
      break;
    default:
      if (Array.isArray(shape.points)) {
        addPolygonToPath(pathBuilder, shape);
      } else if (typeof shape.radius === 'number') {
        pathBuilder.addCircle(shape.x, shape.y, shape.radius);
      } else {
        return null;
      }
  }

  const path = pathBuilder.snapshot();
  transformPath(path, matrix);

  return path;
}

function addPolygonToPath(pathBuilder: ReturnType<typeof createPathBuilder>, shape: any) {
  const points = shape.points;
  if (!Array.isArray(points) || points.length < 4) return;

  pathBuilder.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    pathBuilder.lineTo(points[i], points[i + 1]);
  }
  if (shape.closeStroke === true || shape.closed === true) pathBuilder.close();
}

function transformPath(path: unknown, matrix?: any) {
  if (!matrix) return;

  (path as any).transform?.([
    matrix.a, matrix.c, matrix.tx,
    matrix.b, matrix.d, matrix.ty,
    0, 0, 1,
  ]);
}

function toRect(x: number, y: number, width: number, height: number): [number, number, number, number] {
  return [x, y, x + width, y + height];
}

function deleteSkiaObject(value: unknown) {
  (value as { delete?: () => void }).delete?.();
}

function createPathBuilder(ck: CanvasKit) {
  const path = new ck.Path();

  return {
    moveTo: (x: number, y: number) => path.moveTo(x, y),
    lineTo: (x: number, y: number) => path.lineTo(x, y),
    close: () => path.close(),
    addOval: (rect: [number, number, number, number]) => path.addOval(rect),
    addRect: (rect: [number, number, number, number]) => {
      if ((path as any).addRect) {
        (path as any).addRect(rect);
        return;
      }

      path.moveTo(rect[0], rect[1]);
      path.lineTo(rect[2], rect[1]);
      path.lineTo(rect[2], rect[3]);
      path.lineTo(rect[0], rect[3]);
      path.close();
    },
    addCircle: (x: number, y: number, radius: number) => path.addCircle(x, y, radius),
    addRoundRect: (rect: [number, number, number, number], radius: number) => {
      if ((path as any).addRoundRect) {
        path.addRoundRect(rect, radius, radius);
        return;
      }

      if ((path as any).addRect) {
        (path as any).addRect(rect);
        return;
      }

      path.moveTo(rect[0], rect[1]);
      path.lineTo(rect[2], rect[1]);
      path.lineTo(rect[2], rect[3]);
      path.lineTo(rect[0], rect[3]);
      path.close();
    },
    snapshot: () => path,
  };
}

function renderSprite(ck: CanvasKit, canvas: SkCanvas, sprite: Sprite) {
  const texture = sprite.texture;
  if (!texture) return;
  
  const source =
    (texture as any).baseTexture?.resource?.source ??
    (texture as any).source?.resource ??
    (texture as any).source;
  if (!(source instanceof HTMLImageElement) && !(source instanceof HTMLCanvasElement)) return;

  const img = ck.MakeImageFromCanvasImageSource(source);
  if (!img) return;

  const orig = texture.orig;
  const frame = texture.frame;
  const destRect = [0, 0, orig.width, orig.height];
  const srcRect = [frame.x, frame.y, frame.width, frame.height];

  const anchor = sprite.anchor;
  canvas.save();
  canvas.translate(-anchor.x * orig.width, -anchor.y * orig.height);
  (canvas as any).drawImageRectOptions?.(
    img, srcRect, destRect, ck.FilterMode.Nearest, ck.MipmapMode.None
  );
  canvas.restore();
}

function renderText(ck: CanvasKit, canvas: SkCanvas, text: Text) {
  const style = text.style as any;
  if (!style) return;

  if (!fontLoaded) {
    fetch(publicPath('/fonts/aeonikprotrial-regular.otf'))
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const fontData = ck.MakeFontFromData(new Uint8Array(buffer));
        if (fontData) {
          fontMgr = ck.FontMgr.FromData(fontData)!;
          fontLoaded = true;
        }
      });
    return;
  }

  if (!fontMgr) return;

  const font = fontMgr.makeFont({
    family: 'Arial',
    style: style.fontWeight === 'bold' ? 'Bold' : 'Normal',
  });
  if (!font) return;

  const blob = ck.MakeTextBlob(text.text, {
    font: font,
    size: style.fontSize,
  });
  if (!blob) return;

  const paint = new ck.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(ck.PaintStyle.Fill);

  const fillStyle = style.fill;
  if (Array.isArray(fillStyle)) {
    const color = fillStyle[0];
    paint.setColor(ck.Color4f(
      ((color >> 16) & 0xff) / 255,
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255,
      1
    ));
  } else if (typeof fillStyle === 'number') {
    paint.setColor(ck.Color4f(
      ((fillStyle >> 16) & 0xff) / 255,
      ((fillStyle >> 8) & 0xff) / 255,
      (fillStyle & 0xff) / 255,
      1
    ));
  }

  canvas.drawTextBlob(blob, 0, 0, paint);

  if (style.stroke && style.strokeThickness) {
    const strokePaint = new ck.Paint();
    strokePaint.setAntiAlias(true);
    strokePaint.setStyle(ck.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(style.strokeThickness);
    if (typeof style.stroke === 'number') {
      strokePaint.setColor(ck.Color4f(
        ((style.stroke >> 16) & 0xff) / 255,
        ((style.stroke >> 8) & 0xff) / 255,
        (style.stroke & 0xff) / 255,
        1
      ));
    }
    canvas.drawTextBlob(blob, 0, 0, strokePaint);
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CanvasKit } from 'canvaskit-wasm';
import { Container } from '@/lib/pixi';
import { convertPixiContainerToSkia } from './pixi-to-skia';

export function exportToPdf(ck: CanvasKit, container: Container) {
  const ckAny = ck as any;

  if (typeof ckAny.MakePDFDocument !== 'function') {
    throw new Error(
      'PDF backend недоступен: загрузите CanvasKit PDF build (canvaskit-pdf.js/wasm).',
    );
  }

  const pdf = ckAny.MakePDFDocument({
    title: 'PixiJS Skia scene',
    creator: 'PixiJS + Skia PDF',
    producer: 'Skia PDF backend',
    rasterDPI: 72,
    rootTag: { id: 1, type: 'Document', children: [] },
    compressionLevel: ckAny.PDFCompressionLevel?.Default,
  });
  const pdfCanvas = pdf.beginPage(800, 600, [0, 0, 800, 600]);

  drawWhiteBackground(ck, pdfCanvas);
  convertPixiContainerToSkia(ck, pdfCanvas, container);
  pdf.endPage();

  const pdfBytes = pdf.close();
  if (!pdfBytes) {
    throw new Error('Failed to export PDF: no binary output from CanvasKit PDF document.');
  }
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `scene-${Date.now()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function drawWhiteBackground(ck: CanvasKit, canvas: any) {
  const paint = new ck.Paint();
  paint.setStyle(ck.PaintStyle.Fill);
  paint.setColor(ck.Color4f(1, 1, 1, 1));
  canvas.drawRect([0, 0, 800, 600], paint);
  (paint as { delete?: () => void }).delete?.();
}
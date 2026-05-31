declare module 'canvaskit-wasm' {
  export interface CanvasKit {
    Color4f: (r: number, g: number, b: number, a: number) => Float32Array;
    Paint: new () => Paint;
    Path: new () => Path;
    PaintStyle: { Fill: number; Stroke: number };
    TileMode: { Clamp: number };
    FilterMode: { Nearest: number };
    MipmapMode: { None: number };
    Shader: { MakeLinearGradient: (start: number[], end: number[], colors: Float32Array[], pos: number[], mode: number) => Shader };
    MakeCanvasSurface: (canvas: HTMLCanvasElement) => Surface | null;
    MakeImageFromCanvasImageSource: (source: HTMLImageElement | HTMLCanvasElement) => Image | null;
    FontMgr: { FromData: (data: unknown) => FontMgr | null };
    TextBlob: new () => TextBlob;
    MakeFontFromData: (data: Uint8Array) => unknown;
    MakeTextBlob: (text: string, options: { font: unknown; size: number }) => TextBlob;
    PDFDocument: { create: () => PDFDocument };
  }

  export interface Paint {
    setAntiAlias: (aa: boolean) => void;
    setStyle: (style: number) => void;
    setColor: (color: Float32Array) => void;
    setStrokeWidth: (width: number) => void;
    setShader: (shader: Shader) => void;
  }

  export interface Path {
    addOval: (rect: number[]) => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    close: () => void;
    addCircle: (x: number, y: number, radius: number) => void;
    addRoundRect: (rect: number[], rx: number, ry: number) => void;
  }

  export interface Surface {
    getCanvas: () => Canvas | null;
    flush: () => void;
  }

  export interface Canvas {
    save: () => void;
    restore: () => void;
    concat: (matrix: number[]) => void;
    translate: (x: number, y: number) => void;
    clear: (color: Float32Array) => void;
    drawRect: (rect: number[], paint: Paint) => void;
    drawPath: (path: Path, paint: Paint) => void;
    drawTextBlob: (blob: TextBlob, x: number, y: number, paint: Paint) => void;
    drawImageRectOptions: (img: Image, src: number[], dest: number[], filter: number, mipmap: number) => void;
  }

  export interface FontMgr {
    makeFont: (options: { family: string; style: string }) => unknown;
  }
  
  export interface PDFDocument {
    beginPage: (width: number, height: number) => PDFPage;
    close: () => void;
    toData: () => Uint8Array;
  }
  export interface PDFPage {
    getCanvas: () => Canvas;
    close: () => void;
  }
}
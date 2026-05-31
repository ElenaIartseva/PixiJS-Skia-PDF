declare namespace GlobalMixins {
  interface DisplayObject {
    interactive?: boolean;
    cursor?: string;
  }

  interface DisplayObjectEvents {
    pointerdown: [event: PointerEvent];
    pointerDown: [event: PointerEvent];
    pointerup: [event: PointerEvent];
    pointerUp: [event: PointerEvent];
  }
}

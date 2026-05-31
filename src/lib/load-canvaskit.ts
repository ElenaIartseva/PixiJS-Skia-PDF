/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CanvasKit } from 'canvaskit-wasm';
import { publicPath } from './public-path';

let loadPromise: Promise<CanvasKit> | null = null;

export async function loadCanvasKit(): Promise<CanvasKit> {
  if (loadPromise) return loadPromise;
  
  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject('CanvasKit требует окружение браузера');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reject(new Error('Время инициализации CanvasKit истекло'));
    }, 10000);

    const scriptId = 'canvaskit-pdf-script';
    
    if (document.getElementById(scriptId)) {
      initCanvasKit();
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = publicPath('/canvaskit/canvaskit-pdf.js');
      script.onload = () => initCanvasKit();
      script.onerror = () => reject(new Error('Не удалось загрузить canvaskit-pdf.js'));
      document.head.appendChild(script);
    }

    function initCanvasKit() {
      const checkCanvasKit = () => {
        if ((window as any).CanvasKitInit) {
          (window as any).CanvasKitInit({
            locateFile: (file: string) => {
              const pdfBuildFile = file === 'canvaskit.wasm' ? 'canvaskit-pdf.wasm' : file;

              return publicPath(`/canvaskit/${pdfBuildFile}`);
            },
          })
            .then((ck: CanvasKit) => {
              window.clearTimeout(timeoutId);
              resolve(ck);
            })
            .catch((error: unknown) => {
              window.clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          setTimeout(checkCanvasKit, 100);
        }
      };
      checkCanvasKit();
    }
  });

  return loadPromise;
}

export type { CanvasKit };
const PRODUCTION_BASE_PATH = '/pixi-skia-pdf';

export function publicPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = process.env.NODE_ENV === 'production' ? PRODUCTION_BASE_PATH : '';

  return `${basePath}${normalizedPath}`;
}

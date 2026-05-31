export function publicPath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/pixi-skia-pdf' : '',
  images: { unoptimized: true },
  transpilePackages: ['pixi.js', 'pixi.js-legacy'],
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ canvas: 'commonjs canvas' });
    return config;
  },
};

export default nextConfig;
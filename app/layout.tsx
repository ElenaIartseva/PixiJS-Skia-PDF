import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'PixiJS + Skia PDF',
  description: 'PixiJS + Skia PDF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
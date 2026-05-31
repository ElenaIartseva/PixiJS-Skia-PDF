![Image alt](./public/images/for_readme.webp)

## PixiJS + Skia (CanvasKit) + PDF

Проект на TypeScript: рендер сцены из `PIXI.Container` в CanvasKit (Skia), поддержка интерактивности и экспорт в PDF

## ЧТО РЕАЛИЗОВАНО

- Два канваса: Pixi (source of truth) и Skia (рендер через обёртку).
- Поддержка `PIXI.Graphics` (линии/фигуры) и `PIXI.Sprite` (png).
- Учёт трансформаций (`translate`, `rotate`, `scale`) в дереве контейнеров.
- События `pointerdown` / `pointerup` на обоих канвасах.
- UI:
  - переключение сцен;
  - добавление случайной фигуры;
  - экспорт в PDF

## ЗАПУСК ПРОЕКТА

```bash
npm install
npm run dev
```

Открыть http://localhost:3000

## Link:

https://my-project-2025-ten.vercel.app/

---

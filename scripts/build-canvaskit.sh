#!/bin/bash
# Скрипт для сборки canvaskit с PDF backend (wasm)
# Необходимые зависимости: git, python, ninja, clang, cmake (см. https://skia.org/docs/user/build/)
# Поместите этот скрипт в корень репозитория и запустите: bash scripts/build-canvaskit.sh

set -e

SKIA_REPO="https://github.com/google/skia.git"
SKIA_DIR=".skia-build"

if [ ! -d "$SKIA_DIR" ]; then
  echo "Клонируем Skia..."
  git clone "$SKIA_REPO" "$SKIA_DIR"
fi

cd "$SKIA_DIR"
echo "Синхронизируем зависимости..."
python tools/git-sync-deps

echo "Генерируем ninja-файлы для wasm с PDF..."
bin/gn gen out/wasm --args='
  is_official_build=true
  is_component_build=false
  target_cpu="wasm"
  skia_use_pdf=true
  skia_use_piex=false
  skia_use_webp=false
  skia_use_dng_sdk=false
  skia_enable_pdf=true
'

echo "Собираем canvaskit..."
ninja -C out/wasm canvaskit

echo "Копируем CanvasKit PDF backend в public/canvaskit/"
cd ..
mkdir -p public/canvaskit
cp "$SKIA_DIR/out/wasm/canvaskit.js" public/canvaskit/canvaskit-pdf.js
cp "$SKIA_DIR/out/wasm/canvaskit.wasm" public/canvaskit/canvaskit-pdf.wasm

# Keep non-PDF filenames as aliases for local debugging/backward compatibility.
cp "$SKIA_DIR/out/wasm/canvaskit.js" public/canvaskit/canvaskit.js
cp "$SKIA_DIR/out/wasm/canvaskit.wasm" public/canvaskit/canvaskit.wasm

echo "Готово. PDF backend доступен как public/canvaskit/canvaskit-pdf.js и canvaskit-pdf.wasm"
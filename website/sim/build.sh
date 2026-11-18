#!/usr/bin/env bash
# Baut den Bilal-Simulator für den Browser (WebAssembly) aus src/ui.
# Voraussetzung: Emscripten in ~/emsdk und einmal "pio run" (für LVGL in .pio/libdeps).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
source "$HOME/emsdk/emsdk_env.sh" >/dev/null 2>&1

LVGL="$ROOT/.pio/libdeps/esp32-s3/lvgl"
OBJ=build/obj
OUT=out
mkdir -p "$OBJ/lvgl" "$OBJ/ui" "$OUT"

FLAGS=(-O2 -DLV_CONF_INCLUDE_SIMPLE -I"$PWD/stubs" -I"$ROOT/include" -I"$ROOT/src" -I"$ROOT/src/ui" -I"$LVGL")
export FLAGS_STR="${FLAGS[*]}"

# LVGL nur einmal übersetzen (dauert am längsten)
compile_c() { src=$1; out=$2; [ -f "$out" ] && [ "$out" -nt "$src" ] || emcc $FLAGS_STR -c "$src" -o "$out"; }
export -f compile_c
find "$LVGL/src" -name '*.c' | while read -r f; do
  echo "$f $OBJ/lvgl/$(echo "${f#$LVGL/src/}" | tr / _ | sed 's/\.c$/.o/')"
done | xargs -P "$(nproc)" -n 2 bash -c 'compile_c "$0" "$1"'

# Bilder und Schriften der Oberfläche
for f in "$ROOT"/src/ui/assets/*.c; do
  echo "$f $OBJ/ui/$(basename "${f%.c}").o"
done | xargs -P "$(nproc)" -n 2 bash -c 'compile_c "$0" "$1"'

# Oberfläche und Simulator immer neu
UI_SRC=("$ROOT"/src/ui/*.cpp sim_main.cpp "$ROOT/src/model.cpp")

em++ "${FLAGS[@]}" -std=gnu++17 "${UI_SRC[@]}" "$OBJ"/lvgl/*.o "$OBJ"/ui/*.o \
  --preload-file "$ROOT/data/bg/noir.bin@/bg/noir.bin" \
  -sMODULARIZE=1 -sEXPORT_NAME=BilalSim -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS=_sim_init,_sim_tick,_sim_touch,_sim_page,_sim_azan,_sim_frame,_sim_dirty \
  -sEXPORTED_RUNTIME_METHODS=ccall,HEAPU8 \
  -o "$OUT/bilal-sim.js"

ls -la "$OUT"

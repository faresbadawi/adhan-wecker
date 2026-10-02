// LVGL-Speicher (Objekte, Stile, Texte) im PSRAM anlegen, damit der knappe interne RAM
// für WLAN und TLS frei bleibt. Fällt auf internen RAM zurück, falls PSRAM fehlt.
#pragma once
#include <stddef.h>
#include "esp_heap_caps.h"

static inline void *lv_psram_malloc(size_t size)
{
    void *p = heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    return p ? p : heap_caps_malloc(size, MALLOC_CAP_8BIT);
}

static inline void *lv_psram_realloc(void *ptr, size_t size)
{
    void *p = heap_caps_realloc(ptr, size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    return p ? p : heap_caps_realloc(ptr, size, MALLOC_CAP_8BIT);
}

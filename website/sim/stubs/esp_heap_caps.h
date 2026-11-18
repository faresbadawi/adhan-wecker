// Ersatz: PSRAM gibt es im Browser nicht, alles kommt aus dem normalen Speicher.
#pragma once
#include <stdlib.h>
#define MALLOC_CAP_SPIRAM 1
#define MALLOC_CAP_8BIT 2
#define MALLOC_CAP_INTERNAL 4
static inline void *heap_caps_malloc(size_t n, int) { return malloc(n); }
static inline void *heap_caps_calloc(size_t n, size_t s, int) { return calloc(n, s); }
static inline void *heap_caps_realloc(void *p, size_t n, int) { return realloc(p, n); }
static inline void heap_caps_free(void *p) { free(p); }

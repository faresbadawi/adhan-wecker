// Ersatz für die Arduino-Umgebung im Browser-Simulator (nur was die Oberfläche braucht).
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "esp_heap_caps.h"

// Auch von LVGL (C) eingebunden: dort nur millis()
#ifdef __cplusplus
extern "C" {
#endif
uint32_t millis(void);
#ifdef __cplusplus
}
#include <string>
static inline void delay(uint32_t) {}

template <class A, class B> static inline auto min(A a, B b) -> decltype(a + b) { return a < b ? a : b; }
template <class A, class B> static inline auto max(A a, B b) -> decltype(a + b) { return a > b ? a : b; }
#define constrain(v, lo, hi) ((v) < (lo) ? (lo) : (v) > (hi) ? (hi) : (v))

static inline void *ps_malloc(size_t n) { return malloc(n); }

struct SerialStub
{
    template <class... T> void printf(const char *f, T... a) { ::printf(f, a...); }
    void println(const char *s = "") { puts(s); }
    void print(const char *s) { fputs(s, stdout); }
};
extern SerialStub Serial;

class String
{
  public:
    String(const char *s = "") : v(s ? s : "") {}
    String(const std::string &s) : v(s) {}
    const char *c_str() const { return v.c_str(); }
    unsigned length() const { return v.size(); }
    int indexOf(char c, unsigned from = 0) const { auto p = v.find(c, from); return p == std::string::npos ? -1 : (int)p; }
    String substring(unsigned a, unsigned b) const { return String(v.substr(a, b - a)); }
    bool operator==(const char *o) const { return v == o; }
    bool operator==(const String &o) const { return v == o.v; }
  private:
    std::string v;
};
#endif

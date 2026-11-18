// Ersatz: Dateien kommen aus dem mitgelieferten Dateisystem des Simulators (data/ -> /).
#pragma once
#include <stdio.h>
#include <stddef.h>

class File
{
  public:
    File(FILE *f = nullptr) : f(f) {}
    explicit operator bool() const { return f != nullptr; }
    bool operator!() const { return f == nullptr; }
    size_t size()
    {
        if (!f) return 0;
        long at = ftell(f);
        fseek(f, 0, SEEK_END);
        long n = ftell(f);
        fseek(f, at, SEEK_SET);
        return (size_t)n;
    }
    size_t read(void *buf, size_t n) { return f ? fread(buf, 1, n, f) : 0; }
    void close()
    {
        if (f) fclose(f);
        f = nullptr;
    }
  private:
    FILE *f;
};

struct LittleFSStub
{
    File open(const char *path, const char *mode) { return File(fopen(path, mode[0] == 'w' ? "wb" : "rb")); }
    bool exists(const char *path)
    {
        FILE *f = fopen(path, "rb");
        if (f) fclose(f);
        return f != nullptr;
    }
};
extern LittleFSStub LittleFS;

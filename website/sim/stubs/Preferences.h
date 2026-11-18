// Ersatz: Einstellungen nur im Speicher; die Sprache setzt die Webseite vor dem Start.
#pragma once
#include "Arduino.h"

extern char g_simLang[4];

class Preferences
{
  public:
    bool begin(const char *, bool = false) { return true; }
    void end() {}
    void clear() {}
    String getString(const char *key, const char *def)
    {
        if (strcmp(key, "lang") == 0) return String(g_simLang);
        return String(def);
    }
    size_t putString(const char *key, const char *v)
    {
        if (strcmp(key, "lang") == 0) snprintf(g_simLang, sizeof(g_simLang), "%s", v);
        return strlen(v);
    }
};

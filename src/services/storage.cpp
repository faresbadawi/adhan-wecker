#include "storage.h"
#include <LittleFS.h>
#include <Preferences.h>
#include <SD_MMC.h>

namespace storage
{
    // microSD im 4-Bit-SDIO-Modus
    static constexpr int SD_CLK = 5, SD_CMD = 4, SD_D0 = 6, SD_D1 = 7, SD_D2 = 2, SD_D3 = 3;
    static constexpr const char *NVS_NAMESPACE = "adhan";

    static bool s_sd = false;
    static bool s_flash = false;

    void begin()
    {
        if (SD_MMC.setPins(SD_CLK, SD_CMD, SD_D0, SD_D1, SD_D2, SD_D3))
            s_sd = SD_MMC.begin("/sdcard", false);
        Serial.printf("Speicher: SD-Karte %s\n", s_sd ? "OK" : "nicht gefunden");

        // Partition "spiffs" aus partitions.csv, beim ersten Start formatieren
        s_flash = LittleFS.begin(true, "/littlefs", 10, "spiffs");
        Serial.printf("Speicher: LittleFS %s (%u kB frei)\n", s_flash ? "OK" : "FEHLER",
                      s_flash ? (unsigned)((LittleFS.totalBytes() - LittleFS.usedBytes()) / 1024) : 0);
    }

    bool sdAvailable() { return s_sd; }
    bool flashAvailable() { return s_flash; }

    static bool tryFs(fs::FS &fs, const char *dir, const char *name, char *path, size_t pathLen)
    {
        const size_t n = strlen(dir);
        snprintf(path, pathLen, "%s%s%s", dir, (n && dir[n - 1] == '/') ? "" : "/", name);
        return fs.exists(path);
    }

    fs::FS *find(const char *dirSd, const char *dirFlash, const char *name, char *path, size_t pathLen)
    {
        if (s_sd && tryFs(SD_MMC, dirSd, name, path, pathLen))
            return &SD_MMC;
        if (s_flash && tryFs(LittleFS, dirFlash, name, path, pathLen))
            return &LittleFS;
        return nullptr;
    }

    bool saveBlob(const char *key, const void *data, size_t len)
    {
        Preferences p;
        if (!p.begin(NVS_NAMESPACE, false))
            return false;
        bool ok = p.putBytes(key, data, len) == len;
        p.end();
        return ok;
    }

    bool loadBlob(const char *key, void *data, size_t len)
    {
        Preferences p;
        if (!p.begin(NVS_NAMESPACE, true))
            return false;
        bool ok = p.getBytesLength(key) == len && p.getBytes(key, data, len) == len;
        p.end();
        return ok;
    }
}

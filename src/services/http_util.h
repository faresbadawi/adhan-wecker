// Hilfen für HTTP-Abrufe aus Hintergrund-Tasks.
#pragma once
#include <HTTPClient.h>
#include <FS.h>
#include <WiFi.h>

namespace httputil
{
    // Liest den Antwort-Body vollständig, gibt dabei aber regelmäßig Rechenzeit ab.
    // HTTPClient::getString() wartet sonst ohne Pause auf Daten und löst bei langsamer
    // Gegenstelle den Task-Watchdog aus. Vor GET() http.useHTTP10(true) setzen (kein Chunked).
    inline bool readBody(HTTPClient &http, String &out, uint32_t timeoutMs = 15000)
    {
        WiFiClient *stream = http.getStreamPtr();
        const int total = http.getSize(); // -1, wenn unbekannt
        out = "";
        if (total > 0)
            out.reserve(total);

        char buf[512];
        uint32_t lastData = millis();
        while (total < 0 || (int)out.length() < total)
        {
            const int avail = stream->available();
            if (avail > 0)
            {
                const int n = stream->readBytes(buf, min(avail, (int)sizeof(buf)));
                out.concat(buf, n);
                lastData = millis();
            }
            else if (!stream->connected())
            {
                break; // Gegenstelle hat die Verbindung geschlossen
            }
            else if (millis() - lastData > timeoutMs)
            {
                return false;
            }
            else
            {
                vTaskDelay(pdMS_TO_TICKS(5));
            }
        }
        return total < 0 || (int)out.length() == total;
    }

    // Wie readBody, schreibt aber direkt in eine Datei (für größere Binärdaten, z. B. MP3).
    inline bool readBodyToFile(HTTPClient &http, File &file, uint32_t timeoutMs = 20000)
    {
        WiFiClient *stream = http.getStreamPtr();
        const int total = http.getSize();
        uint8_t buf[1024];
        int written = 0;
        uint32_t lastData = millis();
        while (total < 0 || written < total)
        {
            const int avail = stream->available();
            if (avail > 0)
            {
                const int n = stream->readBytes(buf, min(avail, (int)sizeof(buf)));
                if (file.write(buf, n) != (size_t)n)
                    return false;
                written += n;
                lastData = millis();
            }
            else if (!stream->connected())
                break;
            else if (millis() - lastData > timeoutMs)
                return false;
            else
                vTaskDelay(pdMS_TO_TICKS(5));
        }
        return written > 0 && (total < 0 || written == total);
    }
}

#include "mawaqit.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "http_util.h"
#include "net_lock.h"

namespace mawaqit
{
    // HTTPS-Abruf in body (landet bei Bedarf im PSRAM)
    static bool get(const String &url, String &body)
    {
        netlock::Guard net; // nicht gleichzeitig mit anderen Abrufen
        WiFiClientSecure client;
        client.setInsecure(); // öffentliche Daten, kein Zertifikat hinterlegt
        HTTPClient http;
        http.useHTTP10(true);
        http.setTimeout(15000);
        http.setUserAgent("Mozilla/5.0 (Adhan-Wecker)");
        if (!http.begin(client, url))
            return false;
        const int code = http.GET();
        if (code != 200)
        {
            Serial.printf("Mawaqit: HTTP %d fuer %s\n", code, url.c_str());
            http.end();
            return false;
        }
        const bool ok = httputil::readBody(http, body);
        http.end();
        return ok;
    }

    static String urlEncode(const char *s)
    {
        String out;
        for (; *s; s++)
        {
            const uint8_t c = *s;
            if (isalnum(c) || c == '-' || c == '_' || c == '.')
                out += (char)c;
            else
            {
                char buf[4];
                snprintf(buf, sizeof(buf), "%%%02X", c);
                out += buf;
            }
        }
        return out;
    }

    // Findet das JSON-Objekt hinter "confData =" (Klammern zählen, Zeichenketten beachten)
    static bool findConfData(const String &html, int &start, int &end)
    {
        const int key = html.indexOf("confData");
        if (key < 0)
            return false;
        start = html.indexOf('{', key);
        if (start < 0)
            return false;
        int depth = 0;
        bool inString = false, escaped = false;
        for (int i = start; i < (int)html.length(); i++)
        {
            const char c = html[i];
            if (inString)
            {
                if (escaped)
                    escaped = false;
                else if (c == '\\')
                    escaped = true;
                else if (c == '"')
                    inString = false;
            }
            else if (c == '"')
                inString = true;
            else if (c == '{')
                depth++;
            else if (c == '}' && --depth == 0)
            {
                end = i + 1;
                return true;
            }
        }
        return false;
    }

    static int parseHHMM(const char *s)
    {
        if (!s || strlen(s) < 5 || s[2] != ':')
            return -1;
        return atoi(s) * 60 + atoi(s + 3);
    }

    bool fetchMonth(const char *slug, int month, uint16_t minutes[31][6], int &days)
    {
        if (!slug || !slug[0] || month < 1 || month > 12)
            return false;
        String html;
        if (!get("https://mawaqit.net/de/" + urlEncode(slug), html))
            return false;

        int start, end;
        if (!findConfData(html, start, end))
        {
            Serial.println("Mawaqit: Kalender auf der Moscheeseite nicht gefunden");
            return false;
        }

        // Nur den Kalender auswerten: calendar[Monat]["Tag"] = [Fajr, Shuruq, Dhuhr, Asr, Maghrib, Isha]
        JsonDocument filter;
        filter["calendar"] = true;
        JsonDocument doc;
        const DeserializationError err =
            deserializeJson(doc, html.c_str() + start, end - start, DeserializationOption::Filter(filter));
        html = String(); // Speicher früh freigeben
        if (err)
        {
            Serial.printf("Mawaqit: JSON-Fehler %s\n", err.c_str());
            return false;
        }

        JsonObject cal = doc["calendar"][month - 1];
        if (cal.isNull())
            return false;
        days = 0;
        for (JsonPair day : cal)
        {
            const int d = atoi(day.key().c_str());
            JsonArray t = day.value();
            const int n = t.size();
            if (d < 1 || d > 31 || n < 6)
                return false;
            // Meist 6 Zeiten [Fajr, Shuruq, Dhuhr, Asr, Maghrib, Isha]; manche Moscheen (z. B. Türkei) haben 7 mit einer
            // zusätzlichen Zeit nach Fajr. Deshalb: Fajr = erste, Sonnenaufgang und die vier Gebete = die letzten fünf.
            const int idx[6] = {0, n - 5, n - 4, n - 3, n - 2, n - 1};
            for (int p = 0; p < 6; p++)
            {
                const int m = parseHHMM(t[idx[p]]);
                if (m < 0)
                    return false;
                minutes[d - 1][p] = m;
            }
            days = max(days, d);
        }
        return days >= 28;
    }

    bool resolve(const char *slug, const char *id, Info &out)
    {
        String url = "https://mawaqit.net/de/";
        if (id && id[0])
            url += "id/" + urlEncode(id);
        else if (slug && slug[0])
            url += urlEncode(slug);
        else
            return false;
        String html;
        if (!get(url, html))
            return false;

        // Kennung aus <link rel="canonical" href="https://mawaqit.net/xx/<slug>"> (der App-Link enthält nur eine Nummer)
        out.slug = slug && slug[0] ? String(slug) : String();
        const int c = html.indexOf("rel=\"canonical\"");
        if (c >= 0)
        {
            const int h = html.indexOf("href=\"", c);
            const int e = h >= 0 ? html.indexOf('"', h + 6) : -1;
            if (h >= 0 && e > h)
            {
                const String href = html.substring(h + 6, e);
                const int last = href.lastIndexOf('/');
                const String tail = href.substring(last + 1);
                if (tail.length() && tail != "id")
                    out.slug = tail;
            }
        }

        int start, end;
        if (!out.slug.length() || !findConfData(html, start, end) || html.indexOf("\"calendar\"", start) < 0)
            return false;
        JsonDocument filter;
        filter["name"] = filter["latitude"] = filter["longitude"] = filter["countryCode"] = filter["timezone"] = true;
        JsonDocument doc;
        const DeserializationError err = deserializeJson(doc, html.c_str() + start, end - start, DeserializationOption::Filter(filter));
        html = String();
        if (err)
            return false;
        out.name = doc["name"] | "";
        out.country = doc["countryCode"] | "";
        out.timezone = doc["timezone"] | "";
        out.latitude = doc["latitude"] | 0.0f;
        out.longitude = doc["longitude"] | 0.0f;
        out.name.trim();
        if (!out.name.length())
            out.name = out.slug;
        return true;
    }
}

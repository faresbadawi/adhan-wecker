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

    bool search(const char *query, float lat, float lon, String &outJson)
    {
        String url = "https://mawaqit.net/api/2.0/mosque/search?";
        if (query && query[0])
            url += "word=" + urlEncode(query);
        else
            url += "lat=" + String(lat, 4) + "&lon=" + String(lon, 4);

        String body;
        if (!get(url, body))
            return false;

        JsonDocument filter;
        JsonObject f = filter.add<JsonObject>();
        f["name"] = f["slug"] = f["localisation"] = f["proximity"] = true;
        JsonDocument doc;
        if (deserializeJson(doc, body, DeserializationOption::Filter(filter)))
            return false;

        JsonDocument out;
        JsonArray list = out.to<JsonArray>();
        for (JsonObject m : doc.as<JsonArray>())
        {
            if (list.size() >= 15)
                break;
            JsonObject o = list.add<JsonObject>();
            o["name"] = m["name"];
            o["slug"] = m["slug"];
            o["address"] = m["localisation"];
            o["distance"] = m["proximity"] | 0;
        }
        serializeJson(out, outJson);
        return true;
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
            if (d < 1 || d > 31 || t.size() < 6)
                return false;
            for (int p = 0; p < 6; p++)
            {
                const int m = parseHHMM(t[p]);
                if (m < 0)
                    return false;
                minutes[d - 1][p] = m;
            }
            days = max(days, d);
        }
        return days >= 28;
    }
}

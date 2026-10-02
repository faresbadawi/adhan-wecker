#include "model.h"

namespace model
{
    const char *prayerName(Prayer p)
    {
        static const char *NAMES[PRAYER_COUNT] = {"Fajr", "Shuruq", "Dhuhr", "Asr", "Maghrib", "Isha"};
        return p < PRAYER_COUNT ? NAMES[p] : "";
    }

    const char *skyText(Sky s)
    {
        switch (s)
        {
        case Sky::CLEAR: return "Klar";
        case Sky::PARTLY_CLOUDY: return "Teils bewölkt";
        case Sky::CLOUDY: return "Bewölkt";
        case Sky::FOG: return "Nebel";
        case Sky::DRIZZLE: return "Nieselregen";
        case Sky::RAIN: return "Regen";
        case Sky::SNOW: return "Schnee";
        case Sky::THUNDER: return "Gewitter";
        }
        return "";
    }
}

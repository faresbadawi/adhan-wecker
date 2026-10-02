#include "weather.h"

namespace weather
{
    static model::Weather s_data;
    static uint32_t s_version = 0;

    void begin(bool demo)
    {
        if (!demo)
            return; // Echtdaten folgen im nächsten Schritt

        model::Weather w;
        w.valid = true;
        w.isDay = true;
        w.sky = model::Sky::CLOUDY;
        w.temp = 18;
        w.feelsLike = 17;
        w.humidity = 72;
        w.windKmh = 14;
        w.tempMax = 20;
        w.tempMin = 11;
        w.forecast[0] = {model::Sky::CLOUDY, 20, 11};
        w.forecast[1] = {model::Sky::RAIN, 16, 10};
        w.forecast[2] = {model::Sky::PARTLY_CLOUDY, 19, 9};
        s_data = w;
        s_version = 1;
    }

    bool get(model::Weather &out)
    {
        out = s_data;
        return s_data.valid;
    }

    uint32_t version() { return s_version; }
}

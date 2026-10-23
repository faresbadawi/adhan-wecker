package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Azan und Gebet: nächstes Gebet mit Symbol, Zeit und Azan-Status (an oder aus). Öffnet die Azan-Einstellungen. */
public class AzanWidget extends BaseWidget {
    private static int icon(String k) {
        switch (k) {
            case "fajr": return R.drawable.ic_p_fajr;
            case "dhuhr": return R.drawable.ic_p_dhuhr;
            case "asr": return R.drawable.ic_p_asr;
            case "maghrib": return R.drawable.ic_p_maghrib;
            default: return R.drawable.ic_p_isha;
        }
    }

    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_azan);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/azan", 15));
        JSONObject n = d.prayer(d.nextIndex());
        if (n == null) {
            v.setTextViewText(R.id.w_name, c.getString(R.string.app_name));
            v.setTextViewText(R.id.w_time, "");
            v.setTextViewText(R.id.w_sub, "");
            return v;
        }
        v.setImageViewResource(R.id.w_icon, icon(n.optString("k")));
        v.setTextViewText(R.id.w_name, n.optString("name"));
        v.setTextViewText(R.id.w_time, n.optString("time"));
        v.setTextViewText(R.id.w_sub, n.optBoolean("azan") ? "🔔 " + d.label("azanOn", "") : "🔕 " + d.label("azanOff", ""));
        return v;
    }
}

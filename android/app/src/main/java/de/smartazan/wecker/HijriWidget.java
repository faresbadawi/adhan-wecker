package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Hidschri-Datum: Tag groß, Monat und Jahr, darunter das gregorianische Datum. Öffnet den Hidschri-Kalender. */
public class HijriWidget extends BaseWidget {
    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_hijri);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/calendar", 14));
        JSONObject t = d.today();
        if (t == null || t.optInt("hd") <= 0) {
            v.setTextViewText(R.id.w_day, "");
            v.setTextViewText(R.id.w_month, c.getString(R.string.app_name));
            v.setTextViewText(R.id.w_date, "");
            return v;
        }
        v.setTextViewText(R.id.w_day, String.valueOf(t.optInt("hd")));
        v.setTextViewText(R.id.w_month, t.optString("hm") + " " + t.optInt("hy"));
        v.setTextViewText(R.id.w_date, t.optString("gs", t.optString("greg")));
        return v;
    }
}

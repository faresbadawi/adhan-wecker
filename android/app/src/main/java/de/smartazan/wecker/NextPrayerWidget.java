package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Kleines Widget: nächstes Gebet mit Uhrzeit und Countdown bis zum Azan. Öffnet die Gebetszeiten. */
public class NextPrayerWidget extends BaseWidget {
    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_next);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/prayer", 12));
        JSONObject n = d.prayer(d.nextIndex());
        if (n == null) {
            v.setTextViewText(R.id.w_name, c.getString(R.string.app_name));
            v.setTextViewText(R.id.w_time, "");
            v.setViewVisibility(R.id.w_cd, android.view.View.GONE);
            return v;
        }
        v.setTextViewText(R.id.w_name, n.optString("name"));
        v.setTextViewText(R.id.w_time, n.optString("time"));
        d.countdown(v, R.id.w_cd, n.optLong("t"));
        return v;
    }
}

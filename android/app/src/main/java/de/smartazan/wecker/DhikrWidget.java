package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Dhikr des Tages mit Datum. Öffnet die Seite "Adhkar". */
public class DhikrWidget extends BaseWidget {
    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_dhikr);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/adhkar", 16));
        JSONObject t = d.today();
        v.setTextViewText(R.id.w_label, d.label("dhikr", ""));
        v.setTextViewText(R.id.w_text, t == null ? c.getString(R.string.app_name) : t.optString("dhikr"));
        v.setTextViewText(R.id.w_date, t == null ? "" : t.optString("hijri"));
        return v;
    }
}

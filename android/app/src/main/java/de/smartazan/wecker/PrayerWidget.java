package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Große Gebetszeiten: die fünf Gebete des Tages, das nächste hervorgehoben mit Countdown, darunter das Datum. Öffnet die Gebetszeiten. */
public class PrayerWidget extends BaseWidget {
    private static final int[] NAMES = {R.id.w_n1, R.id.w_n2, R.id.w_n3, R.id.w_n4, R.id.w_n5};
    private static final int[] TIMES = {R.id.w_t1, R.id.w_t2, R.id.w_t3, R.id.w_t4, R.id.w_t5};
    private static final int GOLD = 0xFFD4AF6A, IVORY = 0xFFF8F4EA, DIM = 0xFF8F8672;

    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_prayer);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/prayer", 11));
        int next = d.nextIndex();
        if (!d.ok() || next < 0) {
            v.setTextViewText(R.id.w_name, c.getString(R.string.app_name));
            v.setTextViewText(R.id.w_label, c.getString(R.string.widget_open));
            v.setTextViewText(R.id.w_time, "");
            v.setViewVisibility(R.id.w_cd, android.view.View.GONE);
            for (int i = 0; i < 5; i++) { v.setTextViewText(NAMES[i], ""); v.setTextViewText(TIMES[i], ""); }
            v.setTextViewText(R.id.w_date, "");
            return v;
        }
        JSONObject n = d.prayer(next);
        JSONObject today = d.today();
        v.setTextViewText(R.id.w_label, d.label("next", "") + (today == null || today.optString("hijri").isEmpty() ? "" : " · " + today.optString("hijri")));
        v.setTextViewText(R.id.w_name, n.optString("name"));
        v.setTextViewText(R.id.w_time, n.optString("time"));
        d.countdown(v, R.id.w_cd, n.optLong("t"));
        JSONObject[] list = new JSONObject[5];
        d.dayList(next, list);
        for (int i = 0; i < 5; i++) {
            JSONObject p = list[i];
            boolean isNext = p != null && p.optLong("t") == n.optLong("t");
            boolean past = p != null && p.optLong("t") <= d.now;
            v.setTextViewText(NAMES[i], p == null ? "" : p.optString("name"));
            v.setTextViewText(TIMES[i], p == null ? "" : p.optString("time"));
            int col = isNext ? GOLD : past ? DIM : IVORY;
            v.setTextColor(NAMES[i], col);
            v.setTextColor(TIMES[i], col);
        }
        v.setTextViewText(R.id.w_date, "");
        v.setViewVisibility(R.id.w_date, android.view.View.GONE);
        return v;
    }
}

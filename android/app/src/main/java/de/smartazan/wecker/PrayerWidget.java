package de.smartazan.wecker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget für den Startbildschirm: nächstes Gebet mit Countdown und die vier danach. Daten kommen aus dem Zeitplan der App. */
public class PrayerWidget extends AppWidgetProvider {
    private static final int GOLD = Color.rgb(0xd4, 0xaf, 0x6a);
    private static final int IVORY = Color.rgb(0xf8, 0xf4, 0xea);
    private static final int DIM = Color.rgb(0x8f, 0x86, 0x72);

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, PrayerWidget.class));
        for (int id : ids) m.updateAppWidget(id, build(c));
    }

    private static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_prayer);
        Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 3, open,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)));
        int[] names = {R.id.w_n1, R.id.w_n2, R.id.w_n3, R.id.w_n4};
        int[] times = {R.id.w_t1, R.id.w_t2, R.id.w_t3, R.id.w_t4};
        JSONObject o = Schedule.load(c);
        long now = System.currentTimeMillis();
        try {
            JSONArray pr = o == null ? null : o.optJSONArray("prayers");
            int next = -1;
            if (pr != null) for (int i = 0; i < pr.length(); i++) if (pr.getJSONObject(i).getLong("t") > now) { next = i; break; }
            if (next < 0) {
                v.setTextViewText(R.id.w_name, c.getString(R.string.app_name));
                v.setTextViewText(R.id.w_time, "");
                v.setTextViewText(R.id.w_label, c.getString(R.string.widget_open));
                v.setViewVisibility(R.id.w_cd, android.view.View.GONE);
                for (int i = 0; i < 4; i++) { v.setTextViewText(names[i], ""); v.setTextViewText(times[i], ""); }
                return v;
            }
            JSONObject n = pr.getJSONObject(next);
            v.setTextViewText(R.id.w_label, o.optJSONObject("labels") != null ? o.getJSONObject("labels").optString("next", "") : "");
            v.setTextViewText(R.id.w_name, n.optString("name"));
            v.setTextViewText(R.id.w_time, n.optString("time"));
            v.setViewVisibility(R.id.w_cd, android.view.View.VISIBLE);
            v.setChronometerCountDown(R.id.w_cd, true);
            v.setChronometer(R.id.w_cd, SystemClock.elapsedRealtime() + (n.getLong("t") - now), null, true);
            for (int i = 0; i < 4; i++) {
                int idx = next + 1 + i;
                if (idx < pr.length()) {
                    JSONObject p = pr.getJSONObject(idx);
                    v.setTextViewText(names[i], p.optString("name"));
                    v.setTextViewText(times[i], p.optString("time"));
                } else {
                    v.setTextViewText(names[i], "");
                    v.setTextViewText(times[i], "");
                }
            }
        } catch (Exception e) {
            v.setTextViewText(R.id.w_name, c.getString(R.string.app_name));
        }
        return v;
    }
}

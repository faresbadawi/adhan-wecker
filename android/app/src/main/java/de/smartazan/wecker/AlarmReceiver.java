package de.smartazan.wecker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/** Wird vom AlarmManager zur Gebetszeit geweckt: startet den Azan oder zeigt die Erinnerung und meldet den nächsten Termin an. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        JSONObject o = Schedule.load(c);
        if (o == null) return;
        long now = System.currentTimeMillis();
        long last = Schedule.prefs(c).getLong("lastFired", 0);
        long newest = last;
        try {
            JSONArray ev = o.getJSONArray("events");
            for (int i = 0; i < ev.length(); i++) {
                JSONObject e = ev.getJSONObject(i);
                long t = e.getLong("t");
                if (t <= last || t > now + 3000) continue;
                newest = Math.max(newest, t);
                boolean azan = "azan".equals(e.optString("kind"));
                if (now - t > (azan ? 3 * 60_000L : 60_000L)) continue; // zu spät (Handy war aus)
                if (azan) {
                    Intent s = new Intent(c, AzanService.class)
                            .putExtra("title", e.optString("title"))
                            .putExtra("text", e.optString("text"))
                            .putExtra("vol", e.optInt("vol", 90))
                            .putExtra("fajr", "fajr".equals(e.optString("k")))
                            .putExtra("voice", o.optString("voice", "alafasy"));
                    if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
                } else {
                    Notif.remind(c, e.optString("title"), e.optString("text"));
                }
            }
        } catch (Exception e) {
            Log.w("Bilal", "Alarm: " + e);
        }
        Schedule.prefs(c).edit().putLong("lastFired", newest).apply();
        Schedule.armNext(c);
        PrayerWidget.updateAll(c);
    }
}

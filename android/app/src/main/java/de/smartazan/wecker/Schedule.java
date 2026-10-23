package de.smartazan.wecker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Zeitplan der Alarme (Azan und Erinnerung). Die Web-App berechnet die Gebetszeiten und übergibt die nächsten Wochen
 * als Liste; hier wird immer nur der nächste Termin beim AlarmManager angemeldet. Das funktioniert ohne Internet
 * und ohne Uhr und überlebt einen Neustart des Handys (BootReceiver).
 */
final class Schedule {
    private static final String TAG = "Bilal";
    private static final long GRACE_AZAN = 3 * 60_000L;   // so spät darf ein verpasster Azan noch ertönen
    private static final long GRACE_REMIND = 60_000L;

    private Schedule() { }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("bilal", Context.MODE_PRIVATE);
    }

    static JSONObject load(Context c) {
        try {
            String s = prefs(c).getString("schedule", null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            Log.w(TAG, "Zeitplan unlesbar: " + e);
            return null;
        }
    }

    static void save(Context c, String json) {
        try {
            new JSONObject(json); // nur gültige Listen übernehmen
        } catch (Exception e) {
            Log.w(TAG, "Zeitplan ungültig: " + e);
            return;
        }
        prefs(c).edit().putString("schedule", json).apply();
        armNext(c);
        PrayerWidget.updateAll(c);
    }

    private static PendingIntent pending(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction("de.smartazan.wecker.ALARM");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(c, 1, i, flags);
    }

    static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am.canScheduleExactAlarms();
    }

    /** Meldet den nächsten fälligen Termin an (und löscht den bisherigen). */
    static void armNext(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(c);
        am.cancel(pi);
        JSONObject o = load(c);
        if (o == null || !o.optBoolean("alerts", true)) return;
        long now = System.currentTimeMillis();
        long last = prefs(c).getLong("lastFired", 0);
        try {
            JSONArray ev = o.getJSONArray("events");
            for (int i = 0; i < ev.length(); i++) {
                JSONObject e = ev.getJSONObject(i);
                long t = e.getLong("t");
                if (t <= last) continue;
                long grace = "azan".equals(e.optString("kind")) ? GRACE_AZAN : GRACE_REMIND;
                if (t < now - grace) continue; // verpasst (Handy war aus)
                long at = Math.max(t, now + 1000);
                if (canExact(c)) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi); // ohne Recht: ungefähr, Android entscheidet
                }
                Log.i(TAG, "nächster Alarm: " + e.optString("kind") + " " + e.optString("k") + " um " + new java.util.Date(at));
                return;
            }
            Log.i(TAG, "keine weiteren Termine im Zeitplan");
        } catch (Exception e) {
            Log.w(TAG, "Zeitplan: " + e);
        }
    }
}

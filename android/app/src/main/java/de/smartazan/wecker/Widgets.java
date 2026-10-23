package de.smartazan.wecker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/** Alle Widgets zusammen aktualisieren und bei jedem Gebet (und um Mitternacht) neu zeichnen lassen. */
final class Widgets {
    static final String ACTION_REFRESH = "de.smartazan.wecker.REFRESH";
    private Widgets() { }

    static void updateAll(Context c) {
        new PrayerWidget().updateAll(c);
        new NextPrayerWidget().updateAll(c);
        new LastThirdWidget().updateAll(c);
        new HijriWidget().updateAll(c);
        new AzanWidget().updateAll(c);
        new DhikrWidget().updateAll(c);
    }

    /** Nächster Zeitpunkt, an dem sich ein Widget ändert: Gebet, Beginn oder Ende des letzten Drittels, Tageswechsel. */
    static void armRefresh(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_REFRESH);
        PendingIntent pi = PendingIntent.getBroadcast(c, 5, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        am.cancel(pi);
        JSONObject o = Schedule.load(c);
        if (o == null) return;
        long now = System.currentTimeMillis(), best = now + 6 * 3_600_000L; // spätestens alle 6 Stunden
        try {
            JSONArray pr = o.optJSONArray("prayers");
            if (pr != null) for (int k = 0; k < pr.length(); k++) { long t = pr.getJSONObject(k).getLong("t"); if (t > now) { best = Math.min(best, t); break; } }
            JSONArray n = o.optJSONArray("nights");
            if (n != null) for (int k = 0; k < n.length(); k++) {
                JSONObject x = n.getJSONObject(k);
                for (String key : new String[]{"last", "end"}) { long t = x.getLong(key); if (t > now) best = Math.min(best, t); }
            }
            JSONArray dd = o.optJSONArray("days");
            if (dd != null) for (int k = 0; k < dd.length(); k++) { long t = dd.getJSONObject(k).getLong("t0"); if (t > now) { best = Math.min(best, t); break; } }
        } catch (Exception ignored) { }
        am.setAndAllowWhileIdle(AlarmManager.RTC, best + 1500, pi);
    }
}

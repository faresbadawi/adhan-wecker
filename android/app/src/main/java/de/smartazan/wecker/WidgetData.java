package de.smartazan.wecker;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Gemeinsame Daten und Hilfen für alle Widgets (liest den Zeitplan, den die Web-App der App übergeben hat). */
final class WidgetData {
    final Context ctx;
    final JSONObject sched;
    final long now = System.currentTimeMillis();

    WidgetData(Context c) {
        ctx = c;
        sched = Schedule.load(c);
    }

    boolean ok() { return sched != null; }

    String label(String key, String def) {
        JSONObject l = sched == null ? null : sched.optJSONObject("labels");
        return l == null ? def : l.optString(key, def);
    }

    /** Nächstes Gebet (Index in "prayers") oder -1. */
    int nextIndex() {
        JSONArray pr = sched == null ? null : sched.optJSONArray("prayers");
        if (pr == null) return -1;
        for (int i = 0; i < pr.length(); i++) if (pr.optJSONObject(i).optLong("t") > now) return i;
        return -1;
    }

    JSONObject prayer(int i) {
        JSONArray pr = sched == null ? null : sched.optJSONArray("prayers");
        return pr != null && i >= 0 && i < pr.length() ? pr.optJSONObject(i) : null;
    }

    int prayerCount() {
        JSONArray pr = sched == null ? null : sched.optJSONArray("prayers");
        return pr == null ? 0 : pr.length();
    }

    /** Eintrag des heutigen Tages (Datum, Hidschri, Dhikr). */
    JSONObject today() {
        JSONArray d = sched == null ? null : sched.optJSONArray("days");
        if (d == null) return null;
        for (int i = 0; i < d.length(); i++) {
            JSONObject o = d.optJSONObject(i);
            long t0 = o.optLong("t0");
            if (now >= t0 && now < t0 + 86_400_000L + 3_600_000L) { // Sommerzeit: Tag kann 23 oder 25 Stunden haben
                JSONObject nx = i + 1 < d.length() ? d.optJSONObject(i + 1) : null;
                if (nx != null && now >= nx.optLong("t0")) continue;
                return o;
            }
        }
        return null;
    }

    /** Aktuelle oder nächste Nacht (Maghrib bis Fajr). */
    JSONObject night() {
        JSONArray n = sched == null ? null : sched.optJSONArray("nights");
        if (n == null) return null;
        for (int i = 0; i < n.length(); i++) if (n.optJSONObject(i).optLong("end") > now) return n.optJSONObject(i);
        return null;
    }

    /** Gebet, das die Zeiten der Anzeige bestimmt: Tag des nächsten Gebets. */
    void dayList(int next, JSONObject[] out) {
        // die fünf Gebete des Tages, zu dem das nächste Gebet gehört (Fajr bis Isha stehen aufeinanderfolgend)
        int start = next;
        while (start > 0 && !"fajr".equals(prayer(start).optString("k"))) start--;
        for (int i = 0; i < out.length; i++) out[i] = prayer(start + i);
    }

    /** Beim Antippen die passende Seite der App öffnen (route z. B. "/calendar"). */
    PendingIntent open(String route, int req) {
        Intent i = new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP).putExtra("route", route);
        i.setData(android.net.Uri.parse("bilal://open" + route)); // eigener Intent je Seite
        return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    }

    /** Countdown bis zum Zeitpunkt t (läuft im Widget von selbst weiter). */
    void countdown(RemoteViews v, int id, long t) {
        v.setViewVisibility(id, android.view.View.VISIBLE);
        v.setChronometerCountDown(id, true);
        v.setChronometer(id, SystemClock.elapsedRealtime() + Math.max(0, t - now), null, true);
    }
}

package de.smartazan.wecker;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

/**
 * Brücke zwischen der Web-App und der Android-App (window.BilalNative): Handy-Daten speichern, Alarme planen,
 * Azan vorhören, Rechte prüfen, Moscheeseiten laden. Wird nur aus den eigenen Seiten benutzt
 * (Bündel in der App und Weboberfläche der Uhr).
 */
public class Bridge {
    private static final Pattern VOICE = Pattern.compile("[a-z0-9_]{1,32}");
    private final MainActivity act;
    private final WebView web;
    private MediaPlayer preview;

    Bridge(MainActivity act, WebView web) {
        this.act = act;
        this.web = web;
    }

    // ---------- Daten
    @JavascriptInterface
    public String getState(String key) {
        return act.getSharedPreferences("state", Activity.MODE_PRIVATE).getString(key, "");
    }

    @JavascriptInterface
    public void setState(String key, String value) {
        if (key == null || key.length() > 120 || (value != null && value.length() > 2_000_000)) return;
        android.content.SharedPreferences.Editor e = act.getSharedPreferences("state", Activity.MODE_PRIVATE).edit();
        if (value == null || value.isEmpty()) e.remove(key); else e.putString(key, value);
        e.apply();
    }

    @JavascriptInterface
    public void setSchedule(String json) {
        Schedule.save(act, json);
    }

    // ---------- Webseiten laden (CORS umgehen); nur Mawaqit
    @JavascriptInterface
    public void fetchText(final int id, final String url) {
        new Thread(() -> {
            String result;
            boolean ok = false;
            try {
                if (url == null || !url.startsWith("https://mawaqit.net/")) throw new SecurityException("Adresse nicht erlaubt");
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(20000);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Bilal)");
                if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                try (InputStream in = c.getInputStream()) {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        if (out.size() > 4_000_000) throw new Exception("zu groß");
                    }
                    result = out.toString("UTF-8");
                    ok = true;
                }
                c.disconnect();
            } catch (Exception e) {
                result = String.valueOf(e);
            }
            final String js = "window.__bilalCb(" + id + "," + ok + "," + JSONObject.quote(result) + ")";
            act.runOnUiThread(() -> web.evaluateJavascript(js, null));
        }).start();
    }

    // ---------- Azan vorhören
    @JavascriptInterface
    public void previewVoice(final String id, final boolean fajr) {
        if (id == null || !VOICE.matcher(id).matches()) return;
        act.runOnUiThread(() -> {
            stopPreview();
            String[] names = fajr ? new String[]{"azans/" + id + "_fajr.mp3", "azans/" + id + ".mp3"} : new String[]{"azans/" + id + ".mp3"};
            for (String n : names) {
                try (AssetFileDescriptor afd = act.getAssets().openFd(n)) {
                    MediaPlayer p = new MediaPlayer();
                    p.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
                    p.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                    p.setOnCompletionListener(m -> stopPreview());
                    p.prepare();
                    p.start();
                    preview = p;
                    return;
                } catch (Exception e) {
                    Log.w("Bilal", "Vorhören " + n + ": " + e);
                }
            }
        });
    }

    @JavascriptInterface
    public void stopPreview() {
        act.runOnUiThread(() -> {
            if (preview != null) {
                try { preview.stop(); } catch (Exception ignored) { }
                preview.release();
                preview = null;
            }
        });
    }

    // ---------- Rechte
    @JavascriptInterface
    public String permissions() {
        boolean notif = Build.VERSION.SDK_INT < 33 || act.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        PowerManager pm = (PowerManager) act.getSystemService(Activity.POWER_SERVICE);
        boolean battery = pm.isIgnoringBatteryOptimizations(act.getPackageName());
        try {
            return new JSONObject().put("notifications", notif).put("exactAlarms", Schedule.canExact(act)).put("battery", battery).toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void requestPermission(final String kind) {
        act.runOnUiThread(() -> {
            try {
                if ("notifications".equals(kind)) {
                    if (Build.VERSION.SDK_INT >= 33) act.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7);
                    else act.startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, act.getPackageName()));
                } else if ("exactAlarms".equals(kind)) {
                    if (Build.VERSION.SDK_INT >= 31)
                        act.startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + act.getPackageName())));
                } else if ("battery".equals(kind)) {
                    act.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + act.getPackageName())));
                }
            } catch (Exception e) {
                Log.w("Bilal", "Recht " + kind + ": " + e);
                try { act.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + act.getPackageName()))); } catch (Exception ignored) { }
            }
        });
    }

    // ---------- Uhr
    @JavascriptInterface
    public void findClock() {
        act.runOnUiThread(() -> act.findClock(true));
    }

    @JavascriptInterface
    public boolean onClock() {
        return act.onClock();
    }
}

package de.smartazan.wecker;

import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

/** Spielt den Azan ab (Vordergrunddienst, damit Android ihn nicht beendet). Die Stimme liegt als MP3 in der App. */
public class AzanService extends Service {
    static final String ACTION_STOP = "de.smartazan.wecker.STOP";
    private MediaPlayer player;
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private PowerManager.WakeLock wake;

    @Override
    public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            finish();
            return START_NOT_STICKY;
        }
        String title = intent != null && intent.getStringExtra("title") != null ? intent.getStringExtra("title") : getString(R.string.app_name);
        String text = intent != null && intent.getStringExtra("text") != null ? intent.getStringExtra("text") : "";
        int vol = intent != null ? intent.getIntExtra("vol", 90) : 90;
        boolean fajr = intent != null && intent.getBooleanExtra("fajr", false);
        String voice = intent != null && intent.getStringExtra("voice") != null ? intent.getStringExtra("voice") : "alafasy";

        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(Notif.ID_AZAN, Notif.azan(this, title, text), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(Notif.ID_AZAN, Notif.azan(this, title, text));
        }
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (wake == null) {
            wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bilal:azan");
            wake.acquire(10 * 60_000L);
        }
        handler.removeCallbacksAndMessages(null);
        play(voice, fajr, vol);
        int maxSec = intent != null ? intent.getIntExtra("maxSec", 0) : 0;
        if (maxSec >= 5) handler.postDelayed(this::finish, maxSec * 1000L); // kurzer Azan: nach der eingestellten Dauer beenden
        return START_NOT_STICKY;
    }

    private void play(String voice, boolean fajr, int vol) {
        release();
        String[] names = fajr
                ? new String[]{"azans/" + voice + "_fajr.mp3", "azans/" + voice + ".mp3", "azans/alafasy.mp3"}
                : new String[]{"azans/" + voice + ".mp3", "azans/alafasy.mp3"};
        for (String n : names) {
            try (AssetFileDescriptor afd = getAssets().openFd(n)) {
                MediaPlayer p = new MediaPlayer();
                p.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
                p.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                float v = Math.max(0f, Math.min(1f, vol / 100f));
                p.setVolume(v, v);
                p.setOnCompletionListener(m -> finish());
                p.setOnErrorListener((m, w, x) -> { finish(); return true; });
                p.prepare();
                p.start();
                player = p;
                Log.i("Bilal", "Azan läuft: " + n);
                return;
            } catch (Exception e) {
                Log.w("Bilal", "Azan " + n + ": " + e);
            }
        }
        finish(); // keine Datei gefunden
    }

    private void release() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            player.release();
            player = null;
        }
    }

    private void finish() {
        handler.removeCallbacksAndMessages(null);
        release();
        if (wake != null && wake.isHeld()) wake.release();
        wake = null;
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        release();
        if (wake != null && wake.isHeld()) wake.release();
        super.onDestroy();
    }
}

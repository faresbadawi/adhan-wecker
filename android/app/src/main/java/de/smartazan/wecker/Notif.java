package de.smartazan.wecker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Benachrichtigungen: Erinnerung vor dem Gebet und die laufende Azan-Anzeige. */
final class Notif {
    static final String CH_REMIND = "remind";
    static final String CH_AZAN = "azan";
    static final int ID_AZAN = 100;
    private static int nextId = 200;

    private Notif() { }

    static void ensureChannels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel r = new NotificationChannel(CH_REMIND, c.getString(R.string.ch_remind), NotificationManager.IMPORTANCE_HIGH);
        r.setDescription(c.getString(R.string.ch_remind_desc));
        nm.createNotificationChannel(r);
        NotificationChannel a = new NotificationChannel(CH_AZAN, c.getString(R.string.ch_azan), NotificationManager.IMPORTANCE_LOW);
        a.setDescription(c.getString(R.string.ch_azan_desc));
        a.setSound(null, null);
        nm.createNotificationChannel(a);
    }

    private static PendingIntent open(Context c) {
        Intent i = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    }

    @SuppressWarnings("deprecation")
    static Notification.Builder builder(Context c, String channel) {
        return Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, channel) : new Notification.Builder(c);
    }

    /** Hinweis vor dem Gebet (verschwindet nach ein paar Minuten von selbst). */
    static void remind(Context c, String title, String text) {
        ensureChannels(c);
        Notification.Builder b = builder(c, CH_REMIND)
                .setSmallIcon(R.drawable.ic_stat_bilal)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(open(c))
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setTimeoutAfter(15 * 60_000L);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_SOUND);
        ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(nextId++, b.build());
    }

    /** Anzeige während der Azan läuft (mit Knopf zum Beenden). */
    static Notification azan(Context c, String title, String text) {
        ensureChannels(c);
        Intent stop = new Intent(c, AzanService.class).setAction(AzanService.ACTION_STOP);
        PendingIntent sp = PendingIntent.getService(c, 2, stop, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        return builder(c, CH_AZAN)
                .setSmallIcon(R.drawable.ic_stat_bilal)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(open(c))
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .addAction(new Notification.Action.Builder(null, c.getString(R.string.stop), sp).build())
                .build();
    }
}

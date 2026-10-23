package de.smartazan.wecker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Nach Neustart, App-Update oder Zeitumstellung die Alarme neu anmelden. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        Schedule.armNext(c);
        Widgets.updateAll(c);
        Widgets.armRefresh(c);
    }
}

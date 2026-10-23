package de.smartazan.wecker;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Letztes Drittel der Nacht: Beginn und Ende, Countdown bis zum Beginn (oder "läuft"). Öffnet die Seite "Nacht". */
public class LastThirdWidget extends BaseWidget {
    @Override
    RemoteViews build(Context c, WidgetData d) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_third);
        v.setOnClickPendingIntent(R.id.w_root, d.open("/night", 13));
        JSONObject n = d.night();
        v.setTextViewText(R.id.w_label, d.label("third", ""));
        if (n == null) {
            v.setTextViewText(R.id.w_time, c.getString(R.string.app_name));
            v.setViewVisibility(R.id.w_cd, android.view.View.GONE);
            v.setTextViewText(R.id.w_sub, "");
            return v;
        }
        v.setTextViewText(R.id.w_time, n.optString("lastT") + " – " + n.optString("endT"));
        if (d.now < n.optLong("last")) {
            v.setTextViewText(R.id.w_sub, d.label("begins", "") + " " + d.label("inn", ""));
            d.countdown(v, R.id.w_cd, n.optLong("last"));
        } else {
            v.setTextViewText(R.id.w_sub, d.label("running", ""));
            d.countdown(v, R.id.w_cd, n.optLong("end"));
        }
        return v;
    }
}

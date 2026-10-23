package de.smartazan.wecker;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.widget.RemoteViews;

/** Grundlage der Widgets: jedes baut seine Ansicht aus dem Zeitplan und öffnet beim Antippen seine Seite in der App. */
abstract class BaseWidget extends AppWidgetProvider {
    abstract RemoteViews build(Context c, WidgetData d);

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        WidgetData d = new WidgetData(c);
        for (int id : ids) m.updateAppWidget(id, build(c, d));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, android.os.Bundle o) {
        m.updateAppWidget(id, build(c, new WidgetData(c)));
    }

    void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, getClass()));
        if (ids.length == 0) return;
        WidgetData d = new WidgetData(c);
        for (int id : ids) m.updateAppWidget(id, build(c, d));
    }
}

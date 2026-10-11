package de.smartazan.wecker;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Bilal für Android: zeigt die Web-App der Uhr ohne Browserleiste (Statusleiste bleibt sichtbar).
 * Die Oberfläche kommt immer von der Uhr selbst, App-Updates kommen also mit jedem Update der Uhr.
 *
 * Uhr finden, in dieser Reihenfolge: zuletzt benutzte Adresse, http://azan-clock.local, mDNS-Dienstsuche
 * (NsdManager, Dienst "azan-clock" vom Typ _http._tcp), sonst Adresse von Hand eingeben.
 */
public class MainActivity extends Activity {
    private static final String HOST = "azan-clock.local";
    private static final int BG = Color.rgb(11, 12, 12);
    private static final int FILE_REQUEST = 1;

    private WebView web;
    private View splash;
    private TextView splashText;
    private String base;                       // z. B. http://192.168.178.72
    private String pendingShare;               // geteilter Text, wird nach dem Finden der Uhr übergeben
    private ValueCallback<Uri[]> fileCallback; // Dateiauswahl (Hintergrundbild, Update-Datei)
    private final Handler main = new Handler(Looper.getMainLooper());
    private NsdManager nsd;
    private NsdManager.DiscoveryListener discovery;
    private WifiManager.MulticastLock multicast;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.setStatusBarColor(BG);
        w.setNavigationBarColor(BG);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        root.setFitsSystemWindows(true); // Inhalt unter der Statusleiste, nicht dahinter

        web = new WebView(this);
        web.setBackgroundColor(BG);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " AzanWeckerApp/1.1"); // die Web-App blendet damit Installationshinweise aus
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setVisibility(View.INVISIBLE);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        // Startbildschirm, solange die Uhr gesucht wird
        FrameLayout sp = new FrameLayout(this);
        sp.setBackgroundColor(BG);
        android.widget.LinearLayout col = new android.widget.LinearLayout(this);
        col.setOrientation(android.widget.LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        // großer Name wie auf dem Startbildschirm der Uhr
        TextView title = new TextView(this);
        title.setText("بلال");
        title.setTextColor(Color.rgb(233, 162, 124));
        title.setTextSize(64);
        title.setTypeface(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        TextView latin = new TextView(this);
        latin.setText("B I L A L");
        latin.setTextColor(Color.rgb(246, 243, 238));
        latin.setTextSize(18);
        latin.setLetterSpacing(0.2f);
        latin.setGravity(Gravity.CENTER);
        latin.setPadding(0, 0, 0, 56);
        col.addView(title);
        col.addView(latin);
        ProgressBar bar = new ProgressBar(this);
        splashText = new TextView(this);
        splashText.setTextColor(Color.rgb(185, 179, 173));
        splashText.setTextSize(16);
        splashText.setGravity(Gravity.CENTER);
        splashText.setPadding(48, 32, 48, 0);
        splashText.setText(R.string.searching);
        col.addView(bar);
        col.addView(splashText);
        sp.addView(col, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        splash = sp;
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        takeShare(getIntent());
        if (state != null && state.getString("base") != null) {
            base = state.getString("base");
            show(null);
        } else {
            findClock();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (base != null) out.putString("base", base);
    }

    // ---------- Teilen aus der Mawaqit-App: Text an die Web-App übergeben (sie fragt "Diese Moschee übernehmen?")
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        takeShare(intent);
        if (pendingShare != null && base != null) show(null);
    }

    private void takeShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (text == null) return;
        try {
            pendingShare = "text=" + URLEncoder.encode(text, "UTF-8")
                    + (subject != null ? "&title=" + URLEncoder.encode(subject, "UTF-8") : "");
        } catch (Exception e) {
            pendingShare = null;
        }
    }

    // ---------- Uhr finden
    private void findClock() {
        splashText.setText(R.string.searching);
        splash.setVisibility(View.VISIBLE);
        final String saved = getSharedPreferences("clock", MODE_PRIVATE).getString("base", null);
        new Thread(() -> {
            if (saved != null && reachable(saved)) { main.post(() -> show(saved)); return; }
            if (reachable("http://" + HOST)) { main.post(() -> show("http://" + HOST)); return; }
            main.post(this::discover);
        }).start();
    }

    // Die Uhr antwortet bei Last (Gebetszeiten laden, Azan) manchmal erst nach einigen Sekunden
    private static boolean reachable(String b) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(b + "/api/status").openConnection();
            c.setConnectTimeout(6000);
            c.setReadTimeout(10000);
            int code = c.getResponseCode();
            c.disconnect();
            Log.i("AzanWecker", b + " -> HTTP " + code);
            return code == 200;
        } catch (Exception e) {
            Log.w("AzanWecker", b + " nicht erreichbar: " + e);
            return false;
        }
    }

    // mDNS-Dienstsuche: die Uhr meldet sich als "azan-clock" (_http._tcp)
    private void discover() {
        final AtomicBoolean done = new AtomicBoolean(false);
        try {
            WifiManager wifi = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            multicast = wifi.createMulticastLock("azan");
            multicast.setReferenceCounted(false);
            multicast.acquire();
        } catch (Exception ignored) { }
        nsd = (NsdManager) getSystemService(Context.NSD_SERVICE);
        discovery = new NsdManager.DiscoveryListener() {
            @Override public void onDiscoveryStarted(String t) { }
            @Override public void onDiscoveryStopped(String t) { }
            @Override public void onStartDiscoveryFailed(String t, int e) { main.post(() -> giveUp(done)); }
            @Override public void onStopDiscoveryFailed(String t, int e) { }
            @Override public void onServiceLost(NsdServiceInfo i) { }
            @Override public void onServiceFound(NsdServiceInfo info) {
                if (!info.getServiceName().toLowerCase().contains("azan")) return;
                nsd.resolveService(info, new NsdManager.ResolveListener() {
                    @Override public void onResolveFailed(NsdServiceInfo i, int e) { }
                    @Override public void onServiceResolved(NsdServiceInfo i) {
                        String b = "http://" + i.getHost().getHostAddress() + (i.getPort() != 80 ? ":" + i.getPort() : "");
                        if (done.compareAndSet(false, true)) main.post(() -> { stopDiscovery(); show(b); });
                    }
                });
            }
        };
        try {
            nsd.discoverServices("_http._tcp", NsdManager.PROTOCOL_DNS_SD, discovery);
        } catch (Exception e) {
            giveUp(done);
            return;
        }
        main.postDelayed(() -> giveUp(done), 8000);
    }

    private void stopDiscovery() {
        try { if (nsd != null && discovery != null) nsd.stopServiceDiscovery(discovery); } catch (Exception ignored) { }
        discovery = null;
        try { if (multicast != null) multicast.release(); } catch (Exception ignored) { }
    }

    // Nicht gefunden: Adresse von Hand eingeben oder erneut suchen
    private void giveUp(AtomicBoolean done) {
        if (!done.compareAndSet(false, true)) return;
        stopDiscovery();
        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint(R.string.address_hint);
        String saved = getSharedPreferences("clock", MODE_PRIVATE).getString("base", "");
        input.setText(saved.replace("http://", ""));
        new AlertDialog.Builder(this)
                .setTitle(R.string.not_found_title)
                .setMessage(R.string.not_found_text)
                .setView(input)
                .setCancelable(false)
                .setPositiveButton(R.string.connect, (d, x) -> {
                    String a = input.getText().toString().trim().replaceAll("/+$", "");
                    if (!a.startsWith("http")) a = "http://" + a;
                    final String b = a;
                    new Thread(() -> {
                        boolean ok = reachable(b);
                        main.post(() -> { if (ok) show(b); else findClock(); });
                    }).start();
                })
                .setNegativeButton(R.string.retry, (d, x) -> findClock())
                .show();
    }

    // Web-App der Uhr anzeigen (b == null: bekannte Adresse neu laden)
    private void show(String b) {
        if (b != null) {
            base = b;
            getSharedPreferences("clock", MODE_PRIVATE).edit().putString("base", b).apply();
        }
        String url = base + "/?app=1" + (pendingShare != null ? "&" + pendingShare : "");
        pendingShare = null;
        web.loadUrl(url);
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            Uri b = Uri.parse(base);
            if (u.getHost() != null && u.getHost().equals(b.getHost())) return false; // Seiten der Uhr bleiben in der App
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { } // Mawaqit, Karten …
            return true;
        }

        @Override
        public void onPageFinished(WebView v, String url) {
            web.setVisibility(View.VISIBLE);
            splash.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
            if (r.isForMainFrame()) { // Uhr nicht erreichbar (anderes WLAN, neue Adresse): erneut suchen
                web.setVisibility(View.INVISIBLE);
                getSharedPreferences("clock", MODE_PRIVATE).edit().remove("base").apply();
                findClock();
            }
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            try {
                startActivityForResult(p.createIntent(), FILE_REQUEST);
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        stopDiscovery();
        super.onDestroy();
    }
}

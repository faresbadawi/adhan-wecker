// Texte der Web-App in drei Sprachen. Arabisch ist die Hauptsprache (RTL).
// Neue Texte: Schlüssel in allen drei Sprachen ergänzen; fehlt einer, wird Arabisch verwendet.

export const LANGS = { ar: "العربية", de: "Deutsch", en: "English" };

const T = {
  ar: {
    app: "ساعة الأذان الذكية",
    nav_dashboard: "الرئيسية", nav_prayer: "أوقات الصلاة", nav_location: "الموقع", nav_display: "المظهر",
    nav_audio: "الصوت", nav_lang: "اللغة", nav_wifi: "الواي فاي", nav_device: "الجهاز",
    device_online: "الجهاز متصل", device_offline: "الجهاز غير متصل",
    wifi_on: "الواي فاي متصل", wifi_off: "غير متصل",
    next_prayer: "الصلاة القادمة", in: "بعد", today_times: "أوقات اليوم", weather_now: "الطقس الآن",
    fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء",
    sky_clear: "صافٍ", sky_partly_cloudy: "غائم جزئيًا", sky_cloudy: "غائم", sky_fog: "ضباب",
    sky_drizzle: "رذاذ", sky_rain: "مطر", sky_snow: "ثلج", sky_thunder: "عاصفة رعدية",
    hijri_months: ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
    save: "حفظ", saved: "تم الحفظ ✓", error: "حدث خطأ", invalid: "قيم غير صحيحة", searching: "جارٍ البحث …",
    no_results: "لم يتم العثور على نتائج", offline: "تعذّر الاتصال بالجهاز", search: "بحث", soon: "قريبًا",
    // Gebetszeiten
    source: "مصدر الأوقات", source_calc: "الحساب حسب الموقع", source_mawaqit: "مسجد من Mawaqit",
    mosque_search: "ابحث عن مسجد بالاسم أو المدينة، أو الصق رابط المسجد", mosque_ph: "مثال: Salzgitter",
    mosques_near: "المساجد القريبة من موقعي", mosque_chosen: "المسجد المختار", mosque_none: "لم يتم اختيار مسجد بعد",
    method: "طريقة الحساب", madhhab: "المذهب / وقت العصر", madhhab_0: "الجمهور (الشافعي، المالكي، الحنبلي)",
    madhhab_1: "الحنفي", offsets: "تصحيح الأوقات (بالدقائق)", offsets_hint: "يُطبَّق التصحيح على الشاشة فورًا بعد الحفظ.",
    km: "كم",
    // Standort
    city_search: "ابحث عن مدينة", city_ph: "مثال: Peine", city: "المدينة (كما تظهر على الشاشة)", country: "الدولة",
    lat: "خط العرض", lon: "خط الطول", location_picked: "تم اختيار الموقع، اضغط حفظ", coords_bad: "الإحداثيات غير صحيحة",
    // Darstellung
    pages: "الصفحات", pages_hint: "رتّب الصفحات بالأسهم وفعّلها أو أوقفها. صفحة الإعدادات تظهر دائمًا في النهاية.",
    page_clock: "الساعة", page_prayer: "أوقات الصلاة", page_weather: "الطقس", page_calendar: "التقويم", page_settings: "الإعدادات",
    background: "الخلفية", presets: "ألوان جاهزة", custom_colors: "ألوان مخصصة", col_main: "الخط الرئيسي",
    col_accent: "الرموز والعناوين", col_muted: "النصوص الثانوية", brightness: "سطوع الشاشة",
    preset_gold: "ذهبي", preset_silver: "فضي", preset_emerald: "زمردي", preset_turquoise: "فيروزي", preset_amber: "عنبري",
    // Audio
    volume: "مستوى الصوت", azan: "الأذان", azan_for: "أذان", alarms: "المنبه", alarm_add: "إضافة منبه",
    alarm_none: "لا يوجد منبه بعد", alarm_hint: "يرن المنبه في الأيام المختارة حتى تلمس الشاشة أو تضغط زر BOOT (بحد أقصى ١٠ دقائق).",
    alarm_tone: "نغمة المنبه", tone_calm: "هادئة · أجراس متصاعدة", tone_bells: "أجراس · لحن هادئ", tone_classic: "تقليدية · صفير",
    tone_playing: "♪ تشغيل النغمة على الجهاز", day_min: "اختر يومًا واحدًا على الأقل",
    days: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
    // Sprache
    language: "اللغة", language_hint: "لغة هذا التطبيق. شاشة الساعة تبقى بالعربية.",
    
    
    // WLAN
    wifi_status: "حالة الاتصال", network: "الشبكة", networks: "الشبكات القريبة", scan: "بحث عن الشبكات",
    password: "كلمة المرور", connect: "اتصال", connecting: "جارٍ الاتصال … قد ينقطع هذا التطبيق لحظات",
    wifi_forget: "إعادة إعداد الواي فاي", wifi_forget_hint: "تُحذف بيانات الشبكة وتُعاد الساعة إلى وضع الإعداد (شبكة Adhan-Wecker).",
    // Gerät
    device: "الجهاز", dev_name: "الاسم", connection: "الاتصال", firmware: "البرنامج الثابت", ip: "عنوان IP", host: "العنوان المحلي",
    uptime: "مدة التشغيل", restart: "إعادة التشغيل", factory_reset: "إعادة ضبط المصنع",
    factory_hint: "تُحذف كل الإعدادات والمفتاح وبيانات الواي فاي. ملفات الأذان والخلفيات تبقى.",
    firmware_update: "تحديث البرنامج الثابت", confirm: "تأكيد", cancel: "إلغاء", are_you_sure: "هل أنت متأكد؟",
    restarting: "جارٍ إعادة التشغيل …", install: "تثبيت التطبيق", install_hint_ios: "في Safari: زر المشاركة ← «إضافة إلى الشاشة الرئيسية».",
    
    installed: "التطبيق مثبّت ✓", install_menu: "في Chrome: القائمة ⋮ ← «تثبيت التطبيق».",
    install_android: "التثبيت على أندرويد (Chrome)", install_why: "يسمح Chrome بتثبيت التطبيق فقط عبر اتصال آمن. الساعة تعمل داخل شبكتك المنزلية دون HTTPS، لذلك يلزم إعداد لمرة واحدة:",
    install_s1: "انسخ هذا العنوان والصقه في شريط العنوان في Chrome:", install_s2: "اختر «Enabled» وأدخل في الحقل عنوان الساعة هذا:",
    install_s3: "اضغط «Relaunch»، ثم افتح هذه الصفحة من جديد واضغط «تثبيت التطبيق».",
    install_ip: "نصيحة: ثبّت عنوان IP للساعة في الراوتر (FRITZ!Box: الشبكة المنزلية ← الشبكة ← «تخصيص نفس عنوان IPv4 دائمًا»)، وإلا تغيّر العنوان وتوقف التطبيق.",
    copy: "نسخ", copied: "تم النسخ ✓", install_banner: "ثبّت التطبيق على هاتفك", install_how: "الطريقة", close: "إغلاق",
    hours: "س", minutes: "د",
  },

  de: {
    app: "Smart Azan Clock",
    nav_dashboard: "Dashboard", nav_prayer: "Gebetszeiten", nav_location: "Standort", nav_display: "Darstellung",
    nav_audio: "Audio", nav_lang: "Sprache", nav_wifi: "WLAN", nav_device: "Gerät",
    device_online: "Gerät verbunden", device_offline: "Gerät nicht erreichbar",
    wifi_on: "WLAN verbunden", wifi_off: "Nicht verbunden",
    next_prayer: "Nächstes Gebet", in: "in", today_times: "Gebetszeiten heute", weather_now: "Wetter jetzt",
    fajr: "Fajr", sunrise: "Sonnenaufgang", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
    sky_clear: "Klar", sky_partly_cloudy: "Teils bewölkt", sky_cloudy: "Bewölkt", sky_fog: "Nebel",
    sky_drizzle: "Nieselregen", sky_rain: "Regen", sky_snow: "Schnee", sky_thunder: "Gewitter",
    hijri_months: ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Dschumada al-Ula", "Dschumada al-Achira", "Radschab", "Scha'ban", "Ramadan", "Schawwal", "Dhu l-Qa'da", "Dhu l-Hiddscha"],
    save: "Speichern", saved: "Gespeichert ✓", error: "Fehler", invalid: "Ungültige Werte", searching: "Suche …",
    no_results: "Keine Ergebnisse", offline: "Gerät nicht erreichbar", search: "Suchen", soon: "Bald verfügbar",
    source: "Quelle der Zeiten", source_calc: "Berechnung nach Standort", source_mawaqit: "Moschee von Mawaqit",
    mosque_search: "Moschee nach Name oder Stadt suchen oder Mawaqit-Link einfügen", mosque_ph: "z. B. Salzgitter",
    mosques_near: "Moscheen in meiner Nähe", mosque_chosen: "Gewählte Moschee", mosque_none: "Noch keine Moschee gewählt",
    method: "Berechnungsmethode", madhhab: "Madhhab / Asr-Zeit", madhhab_0: "Mehrheit (Schafi'i, Maliki, Hanbali)",
    madhhab_1: "Hanafi", offsets: "Korrekturen (Minuten)", offsets_hint: "Die Korrektur gilt nach dem Speichern sofort auf dem Display.",
    km: "km",
    city_search: "Stadt suchen", city_ph: "z. B. Peine", city: "Stadt (wie auf dem Display)", country: "Land",
    lat: "Breitengrad", lon: "Längengrad", location_picked: "Ort übernommen – bitte speichern", coords_bad: "Koordinaten ungültig",
    pages: "Seiten", pages_hint: "Mit den Pfeilen sortieren, mit dem Schalter ein- oder ausblenden. Die Einstellungsseite steht immer am Ende.",
    page_clock: "Uhr", page_prayer: "Gebetszeiten", page_weather: "Wetter", page_calendar: "Kalender", page_settings: "Einstellungen",
    background: "Hintergrund", presets: "Farbvorlagen", custom_colors: "Eigene Farben", col_main: "Hauptschrift",
    col_accent: "Symbole und Titel", col_muted: "Nebenschrift", brightness: "Display-Helligkeit",
    preset_gold: "Gold", preset_silver: "Silber", preset_emerald: "Smaragd", preset_turquoise: "Türkis", preset_amber: "Bernstein",
    volume: "Lautstärke", azan: "Azan", azan_for: "Azan", alarms: "Wecker", alarm_add: "Wecker hinzufügen",
    alarm_none: "Noch kein Wecker", alarm_hint: "Der Wecker klingelt an den gewählten Tagen, bis du den Bildschirm berührst oder BOOT drückst (höchstens 10 Minuten).",
    alarm_tone: "Weckton", tone_calm: "Ruhig · aufsteigende Glocken", tone_bells: "Glocken · sanfte Melodie", tone_classic: "Klassisch · Piepen",
    tone_playing: "♪ Ton wird auf der Uhr abgespielt", day_min: "Mindestens einen Tag wählen",
    days: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    language: "Sprache", language_hint: "Sprache dieser App. Das Display der Uhr bleibt arabisch.",
    
    
    
    
    
    
    
    wifi_status: "Verbindung", network: "Netzwerk", networks: "Netze in der Nähe", scan: "Netze suchen",
    password: "Passwort", connect: "Verbinden", connecting: "Verbinde … die App ist evtl. kurz getrennt",
    wifi_forget: "WLAN neu einrichten", wifi_forget_hint: "Die WLAN-Daten werden gelöscht, die Uhr startet im Einrichtungsmodus (Netz „Adhan-Wecker“).",
    device: "Gerät", dev_name: "Name", connection: "Verbindung", firmware: "Firmware", ip: "IP-Adresse", host: "Lokale Adresse",
    uptime: "Laufzeit", restart: "Neustart", factory_reset: "Werkseinstellungen",
    factory_hint: "Alle Einstellungen, der Schlüssel und die WLAN-Daten werden gelöscht. Azan-Dateien und Hintergründe bleiben.",
    firmware_update: "Firmware aktualisieren", confirm: "Bestätigen", cancel: "Abbrechen", are_you_sure: "Bist du sicher?",
    restarting: "Neustart …", install: "App installieren", install_hint_ios: "In Safari: Teilen → „Zum Home-Bildschirm“.",
    
    installed: "App ist installiert ✓", install_menu: "In Chrome: Menü ⋮ → „App installieren“.",
    install_android: "Installation auf Android (Chrome)", install_why: "Chrome installiert Apps nur über eine sichere Verbindung. Die Uhr läuft in deinem Heimnetz ohne HTTPS, deshalb ist einmalig diese Einstellung nötig:",
    install_s1: "Diese Adresse kopieren und in Chrome in die Adresszeile einfügen:", install_s2: "Auf „Enabled“ stellen und in das Feld diese Adresse der Uhr eintragen:",
    install_s3: "„Relaunch“ tippen, diese Seite wieder öffnen und „App installieren“ tippen.",
    install_ip: "Tipp: Die IP-Adresse der Uhr im Router festlegen (FRITZ!Box: Heimnetz → Netzwerk → „Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“), sonst ändert sie sich und die App findet die Uhr nicht mehr.",
    copy: "Kopieren", copied: "Kopiert ✓", install_banner: "Installiere die App auf deinem Handy", install_how: "Anleitung", close: "Schließen",
    hours: "Std.", minutes: "Min.",
  },

  en: {
    app: "Smart Azan Clock",
    nav_dashboard: "Dashboard", nav_prayer: "Prayer times", nav_location: "Location", nav_display: "Appearance",
    nav_audio: "Audio", nav_lang: "Language", nav_wifi: "Wi-Fi", nav_device: "Device",
    device_online: "Device connected", device_offline: "Device unreachable",
    wifi_on: "Wi-Fi connected", wifi_off: "Not connected",
    next_prayer: "Next prayer", in: "in", today_times: "Today's prayer times", weather_now: "Weather now",
    fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
    sky_clear: "Clear", sky_partly_cloudy: "Partly cloudy", sky_cloudy: "Cloudy", sky_fog: "Fog",
    sky_drizzle: "Drizzle", sky_rain: "Rain", sky_snow: "Snow", sky_thunder: "Thunderstorm",
    hijri_months: ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhira", "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'da", "Dhu al-Hijja"],
    save: "Save", saved: "Saved ✓", error: "Error", invalid: "Invalid values", searching: "Searching …",
    no_results: "No results", offline: "Device unreachable", search: "Search", soon: "Coming soon",
    source: "Source of times", source_calc: "Calculated for location", source_mawaqit: "Mosque from Mawaqit",
    mosque_search: "Search a mosque by name or city, or paste a Mawaqit link", mosque_ph: "e.g. Salzgitter",
    mosques_near: "Mosques near me", mosque_chosen: "Selected mosque", mosque_none: "No mosque selected yet",
    method: "Calculation method", madhhab: "Madhhab / Asr time", madhhab_0: "Majority (Shafi'i, Maliki, Hanbali)",
    madhhab_1: "Hanafi", offsets: "Adjustments (minutes)", offsets_hint: "Adjustments apply to the display right after saving.",
    km: "km",
    city_search: "Search a city", city_ph: "e.g. Peine", city: "City (as shown on the display)", country: "Country",
    lat: "Latitude", lon: "Longitude", location_picked: "Location selected – please save", coords_bad: "Invalid coordinates",
    pages: "Pages", pages_hint: "Reorder with the arrows, switch pages on or off. The settings page always stays last.",
    page_clock: "Clock", page_prayer: "Prayer times", page_weather: "Weather", page_calendar: "Calendar", page_settings: "Settings",
    background: "Background", presets: "Colour presets", custom_colors: "Custom colours", col_main: "Main text",
    col_accent: "Icons and titles", col_muted: "Secondary text", brightness: "Display brightness",
    preset_gold: "Gold", preset_silver: "Silver", preset_emerald: "Emerald", preset_turquoise: "Turquoise", preset_amber: "Amber",
    volume: "Volume", azan: "Azan", azan_for: "Azan", alarms: "Alarms", alarm_add: "Add alarm",
    alarm_none: "No alarm yet", alarm_hint: "The alarm rings on the selected days until you touch the screen or press BOOT (10 minutes at most).",
    alarm_tone: "Alarm tone", tone_calm: "Calm · rising bells", tone_bells: "Bells · gentle melody", tone_classic: "Classic · beeping",
    tone_playing: "♪ Playing on the clock", day_min: "Select at least one day",
    days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    language: "Language", language_hint: "Language of this app. The clock's display stays Arabic.",
    
    
    
    
    
    
    
    wifi_status: "Connection", network: "Network", networks: "Nearby networks", scan: "Scan for networks",
    password: "Password", connect: "Connect", connecting: "Connecting … the app may disconnect briefly",
    wifi_forget: "Set up Wi-Fi again", wifi_forget_hint: "Wi-Fi credentials are deleted and the clock restarts in setup mode (network “Adhan-Wecker”).",
    device: "Device", dev_name: "Name", connection: "Connection", firmware: "Firmware", ip: "IP address", host: "Local address",
    uptime: "Uptime", restart: "Restart", factory_reset: "Factory reset",
    factory_hint: "All settings, the key and Wi-Fi credentials are deleted. Azan files and backgrounds remain.",
    firmware_update: "Update firmware", confirm: "Confirm", cancel: "Cancel", are_you_sure: "Are you sure?",
    restarting: "Restarting …", install: "Install app", install_hint_ios: "In Safari: Share → “Add to Home Screen”.",
    
    installed: "App installed ✓", install_menu: "In Chrome: menu ⋮ → “Install app”.",
    install_android: "Install on Android (Chrome)", install_why: "Chrome installs apps only over a secure connection. The clock runs in your home network without HTTPS, so this one-time setting is needed:",
    install_s1: "Copy this address and paste it into Chrome's address bar:", install_s2: "Set it to “Enabled” and enter this address of the clock in the field:",
    install_s3: "Tap “Relaunch”, open this page again and tap “Install app”.",
    install_ip: "Tip: reserve the clock's IP address in your router (FRITZ!Box: Home Network → Network → “Always assign this network device the same IPv4 address”), otherwise it may change and the app loses the clock.",
    copy: "Copy", copied: "Copied ✓", install_banner: "Install the app on your phone", install_how: "How to", close: "Close",
    hours: "h", minutes: "min",
  },
};

let current = "ar";

export function setLang(lang) {
  current = T[lang] ? lang : "ar";
  document.documentElement.lang = current;
  document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
}

export function lang() { return current; }

export function t(key) {
  const v = T[current][key];
  return v !== undefined ? v : (T.ar[key] !== undefined ? T.ar[key] : key);
}

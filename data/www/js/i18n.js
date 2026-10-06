// Texte der Web-App in drei Sprachen. Arabisch ist die Hauptsprache (RTL).
// Neue Texte: Schlüssel in allen drei Sprachen ergänzen; fehlt einer, wird Arabisch verwendet.

export const LANGS = { ar: "العربية", de: "Deutsch", en: "English" };

const T = {
  ar: {
    sig_strong: "إشارة قوية", sig_medium: "إشارة متوسطة", sig_weak: "إشارة ضعيفة",
    auto_dim: "تعتيم تلقائي ليلًا", night_brightness: "سطوع الشاشة ليلًا",
    auto_dim_hint: "من العشاء حتى الفجر تصبح الشاشة أخفت تلقائيًا، وفي النهار تعود إلى السطوع المضبوط. عند رنين المنبه يكون السطوع كاملًا.",
    azan_volume_hint: "مستوى الصوت لكل صلاة على حدة – مثلًا الفجر والعشاء أخفض حتى لا يُزعج النائمين. زر التشغيل يُسمعك الأذان بهذا المستوى على الساعة.",
    alarm_volume_hint: "مستوى صوت المنبه. عند تحريك الشريط يُشغَّل النغمة المختارة لتسمعها.",
    app: "ساعة الأذان الذكية",
    nav_dashboard: "الرئيسية", nav_prayer: "أوقات الصلاة", nav_location: "الموقع", nav_display: "المظهر",
    nav_audio: "الأذان", nav_alarm: "المنبه", title_audio: "تنبيه الأذان", nav_lang: "اللغة", nav_wifi: "الواي فاي", nav_device: "الجهاز",
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
    led: "ضوء LED", led_on: "الضوء", led_bri: "شدة الضوء", led_hint: "المس لونًا أو حرّك شريط الألوان، يتغير الضوء فورًا.",
    hue: "اللون", lightness: "فاتح / غامق", done: "تم", hour_pick: "اختر الساعة", minute_pick: "اختر الدقائق",
    preset_rosegold: "ذهبي وردي", preset_gold: "ذهبي", preset_silver: "فضي", preset_emerald: "زمردي", preset_turquoise: "فيروزي", preset_amber: "عنبري",
    // Audio
    volume: "مستوى الصوت", azan: "الأذان", azan_for: "أذان", alarms: "المنبه", alarm_add: "إضافة منبه",
    alarm_none: "لا يوجد منبه بعد", alarm_hint: "يرن المنبه في الأيام المختارة حتى تلمس الشاشة أو تضغط زر BOOT (بحد أقصى ١٠ دقائق). بعد الإيقاف لا يرن إلا في موعده التالي. بأزرار صغيرة على الشاشة يمكنك الغفوة ٥ أو ١٠ أو ١٥ أو ٣٠ دقيقة.",
    alarm_tone: "نغمة المنبه", tone_calm: "هادئة · أجراس متصاعدة", tone_bells: "أجراس · لحن هادئ", tone_classic: "تقليدية · صفير",
    tone_playing: "♪ تشغيل النغمة على الجهاز", day_min: "اختر يومًا واحدًا على الأقل",
    days: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
    // Sprache
    language: "اللغة", language_hint: "تُطبَّق اللغة على التطبيق وشاشة الساعة. تُعاد الساعة تشغيلها لذلك (حوالي ١٠ ثوانٍ).", lang_restart: "تُعاد الساعة تشغيلها باللغة الجديدة …",
    
    
    // WLAN
    wifi_status: "حالة الاتصال", network: "الشبكة", networks: "الشبكات القريبة", scan: "بحث عن الشبكات",
    password: "كلمة المرور", connect: "اتصال", connecting: "جارٍ الاتصال … قد ينقطع هذا التطبيق لحظات",
    wifi_forget: "إعادة إعداد الواي فاي", wifi_forget_hint: "تُحذف بيانات الشبكة وتُعاد الساعة إلى وضع الإعداد (شبكة Adhan-Wecker).",
    // Gerät
    device: "الجهاز", dev_name: "الاسم", connection: "الاتصال", firmware: "البرنامج الثابت", ip: "عنوان IP", host: "العنوان المحلي",
    uptime: "مدة التشغيل", restart: "إعادة التشغيل", factory_reset: "إعادة ضبط المصنع",
    factory_hint: "تُحذف كل الإعدادات وبيانات الواي فاي. ملفات الأذان والخلفيات تبقى.",
    firmware_update: "تحديث البرنامج الثابت", confirm: "تأكيد", cancel: "إلغاء", are_you_sure: "هل أنت متأكد؟",
    restarting: "جارٍ إعادة التشغيل …", install: "تثبيت التطبيق", install_hint_ios: "في Safari: زر المشاركة ← «إضافة إلى الشاشة الرئيسية».",
    
    installed: "التطبيق مثبّت ✓", install_menu: "في Chrome: القائمة ⋮ ← «تثبيت التطبيق».",
    install_android: "على أندرويد (Chrome)", sc_0: "افتح نسخة التطبيق أولًا:", sc_open: "فتح نسخة التطبيق", sc_1: "افتح القائمة ⋮ في الأعلى.", sc_2: "اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».",
    sc_3: "افتح الأيقونة من الشاشة الرئيسية واضغط مرة على الشاشة، فيعمل التطبيق بملء الشاشة.", sc_adv: "بدون شريط المتصفح (متقدم)",
    install_why: "يسمح Chrome بتثبيت التطبيق فقط عبر اتصال آمن. الساعة تعمل داخل شبكتك المنزلية دون HTTPS، لذلك يلزم إعداد لمرة واحدة:",
    install_s1: "انسخ هذا العنوان والصقه في شريط العنوان في Chrome:", install_s2: "اختر «Enabled» وأدخل في الحقل عنوان الساعة هذا:",
    install_s3: "اضغط «Relaunch»، ثم افتح هذه الصفحة من جديد واضغط «تثبيت التطبيق».",
    install_ip: "نصيحة: ثبّت عنوان IP للساعة في الراوتر (FRITZ!Box: الشبكة المنزلية ← الشبكة ← «تخصيص نفس عنوان IPv4 دائمًا»)، وإلا تغيّر العنوان وتوقف التطبيق.",
    copy: "نسخ", copied: "تم النسخ ✓", install_banner: "ضع التطبيق على الشاشة الرئيسية لهاتفك", install_how: "الطريقة", close: "إغلاق",
    tab_home: "الرئيسية", more: "المزيد", azan_test: "تجربة الأذان", azan_test_normal: "الأذان", azan_test_fajr: "أذان الفجر",
    azan_test_hint: "يُشغَّل الأذان على الساعة كما في وقت الصلاة. المس الشاشة أو اضغط «إيقاف» لإنهائه.", stop: "إيقاف", azan_playing: "الأذان يعمل على الساعة …",
    nav_settings: "الإعدادات", grp_prayer: "الصلاة", grp_clock: "الساعة", grp_conn: "الاتصال", back: "رجوع", listen: "استماع",
    volume_hint: "يُشغَّل الأذان على الساعة لتسمع مستوى الصوت مباشرة أثناء الضبط.", azan_test_display: "تجربة الأذان مع العرض على الساعة",
    azan_voice: "صوت المؤذن", azan_voice_hint: "يُستخدم الصوت المختار لكل الصلوات، وللفجر بنسخة أذان الفجر الخاصة به. اضغط ▶ للاستماع.",
    voice_islam_sobhi: "الشيخ إسلام صبحي", voice_alafasy: "الشيخ مشاري راشد العفاسي",
    storage: "مساحة الملفات", free_of: "متاح من",
    alarm_name_ph: "اسم المنبه، مثلًا: العمل",
    bg_own: "صورة خاصة", bg_replace: "صورة جديدة", bg_crop: "قص الصورة", bg_use: "استخدام", bg_crop_hint: "حرّك الصورة بإصبع واحد، وكبّر بإصبعين.", zoom: "التكبير", bg_brightness: "السطوع (لوضوح الكتابة)", bg_uploading: "جارٍ رفع الصورة …", bg_delete_q: "حذف الصورة الخاصة؟", delete: "حذف",
    alarm_times: "أوقات التنبيه",
    jumuah: "الجمعة", holiday_new_year: "رأس السنة الهجرية", holiday_ashura: "يوم عاشوراء", holiday_isra: "الإسراء والمعراج", holiday_ramadan: "أول رمضان — رمضان مبارك", holiday_qadr: "ليلة القدر", holiday_eid_fitr: "عيد الفطر — عيد مبارك", holiday_arafah: "يوم عرفة", holiday_eid_adha: "عيد الأضحى — عيد مبارك",
    update_hint: "اختر ملف التحديث: firmware.bin لبرنامج الساعة أو littlefs.bin لملفات التطبيق والأصوات والخلفيات. تُعاد الساعة تشغيلها بعد ذلك.", update_pick: "اختيار ملف التحديث", update_confirm: "تثبيت التحديث الآن؟", update_running: "جارٍ التحديث …", update_ok: "تم التحديث، تُعاد الساعة تشغيلها …", update_fail: "فشل التحديث",
    hours: "س", minutes: "د",
  },

  de: {
    sig_strong: "Signal stark", sig_medium: "Signal mittel", sig_weak: "Signal schwach",
    auto_dim: "Nachts automatisch dunkler", night_brightness: "Helligkeit nachts",
    auto_dim_hint: "Von Isha bis Fajr wird das Display von allein dunkler, tagsüber gilt die eingestellte Helligkeit. Klingelt ein Wecker, ist es voll hell.",
    azan_volume_hint: "Lautstärke je Gebet – zum Beispiel Fajr und Isha leiser, damit niemand aus dem Schlaf gerissen wird. Mit ▶ hörst du den Azan in dieser Lautstärke auf der Uhr.",
    alarm_volume_hint: "Lautstärke des Weckers. Nach dem Loslassen spielt die Uhr den gewählten Weckton zur Probe.",
    app: "Smart Azan Wecker",
    nav_dashboard: "Dashboard", nav_prayer: "Gebetszeiten", nav_location: "Standort", nav_display: "Darstellung",
    nav_audio: "Azan", nav_alarm: "Wecker", title_audio: "Azan-Benachrichtigung", nav_wifi: "WLAN", nav_device: "Gerät",
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
    led: "LED-Licht", led_on: "Licht", led_bri: "Helligkeit", led_hint: "Farbe antippen oder am Farbbalken ziehen – das Licht ändert sich sofort.",
    hue: "Farbton", lightness: "Hell / Dunkel", done: "Fertig", hour_pick: "Stunde wählen", minute_pick: "Minute wählen",
    preset_rosegold: "Roségold", preset_gold: "Gold", preset_silver: "Silber", preset_emerald: "Smaragd", preset_turquoise: "Türkis", preset_amber: "Bernstein",
    volume: "Lautstärke", azan: "Azan", azan_for: "Azan", alarms: "Wecker", alarm_add: "Wecker hinzufügen",
    alarm_none: "Noch kein Wecker", alarm_hint: "Der Wecker klingelt an den gewählten Tagen, bis du den Bildschirm berührst oder BOOT drückst (höchstens 10 Minuten). Nach dem Stoppen klingelt er erst wieder zum nächsten Termin. Mit den kleinen Tasten auf dem Display kannst du 5, 10, 15 oder 30 Minuten weiterschlafen.",
    alarm_tone: "Weckton", tone_calm: "Ruhig · aufsteigende Glocken", tone_bells: "Glocken · sanfte Melodie", tone_classic: "Klassisch · Piepen",
    tone_playing: "♪ Ton wird auf der Uhr abgespielt", day_min: "Mindestens einen Tag wählen",
    days: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    language: "Sprache", language_hint: "Gilt für die App und das Display der Uhr. Die Uhr startet dafür kurz neu (ca. 10 Sekunden).", lang_restart: "Die Uhr startet in der neuen Sprache neu …",
    
    
    
    
    
    
    
    wifi_status: "Verbindung", network: "Netzwerk", networks: "Netze in der Nähe", scan: "Netze suchen",
    password: "Passwort", connect: "Verbinden", connecting: "Verbinde … die App ist evtl. kurz getrennt",
    wifi_forget: "WLAN neu einrichten", wifi_forget_hint: "Die WLAN-Daten werden gelöscht, die Uhr startet im Einrichtungsmodus (Netz „Adhan-Wecker“).",
    device: "Gerät", dev_name: "Name", connection: "Verbindung", firmware: "Firmware", ip: "IP-Adresse", host: "Lokale Adresse",
    uptime: "Laufzeit", restart: "Neustart", factory_reset: "Werkseinstellungen",
    factory_hint: "Alle Einstellungen und die WLAN-Daten werden gelöscht. Azan-Dateien und Hintergründe bleiben.",
    firmware_update: "Firmware aktualisieren", confirm: "Bestätigen", cancel: "Abbrechen", are_you_sure: "Bist du sicher?",
    restarting: "Neustart …", install: "App installieren", install_hint_ios: "In Safari: Teilen → „Zum Home-Bildschirm“.",
    
    installed: "App ist installiert ✓", install_menu: "In Chrome: Menü ⋮ → „App installieren“.",
    install_android: "Auf Android (Chrome)", sc_0: "Zuerst die App-Version öffnen:", sc_open: "App-Version öffnen", sc_1: "Oben rechts das Menü ⋮ öffnen.", sc_2: "„Zum Startbildschirm hinzufügen“ wählen und „Hinzufügen“ tippen.",
    sc_3: "Die App über das Symbol öffnen und einmal auf den Bildschirm tippen – dann läuft sie im Vollbild.", sc_adv: "Ohne Browserleiste (für Fortgeschrittene)",
    install_why: "Chrome installiert Apps nur über eine sichere Verbindung. Die Uhr läuft in deinem Heimnetz ohne HTTPS, deshalb ist einmalig diese Einstellung nötig:",
    install_s1: "Diese Adresse kopieren und in Chrome in die Adresszeile einfügen:", install_s2: "Auf „Enabled“ stellen und in das Feld diese Adresse der Uhr eintragen:",
    install_s3: "„Relaunch“ tippen, diese Seite wieder öffnen und „App installieren“ tippen.",
    install_ip: "Tipp: Die IP-Adresse der Uhr im Router festlegen (FRITZ!Box: Heimnetz → Netzwerk → „Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“), sonst ändert sie sich und die App findet die Uhr nicht mehr.",
    copy: "Kopieren", copied: "Kopiert ✓", install_banner: "Leg die App auf deinen Startbildschirm", install_how: "Anleitung", close: "Schließen",
    tab_home: "Start", more: "Mehr", azan_test: "Azan testen", azan_test_normal: "Azan", azan_test_fajr: "Fajr-Azan",
    azan_test_hint: "Der Azan läuft auf der Uhr wie zur Gebetszeit. Bildschirm berühren oder „Stopp“ tippen, um ihn zu beenden.", stop: "Stopp", azan_playing: "Azan läuft auf der Uhr …",
    nav_settings: "Einstellungen", grp_prayer: "Gebet", grp_clock: "Uhr", grp_conn: "Verbindung", back: "Zurück", listen: "Anhören",
    volume_hint: "Spielt den Azan auf der Uhr ab – so hörst du die Lautstärke direkt beim Einstellen.", azan_test_display: "Azan-Test mit Anzeige auf der Uhr",
    azan_voice: "Azan-Stimme", azan_voice_hint: "Die gewählte Stimme gilt für alle Gebete, zu Fajr mit ihrem eigenen Fajr-Azan. Mit ▶ probehören.",
    voice_islam_sobhi: "Scheich Islam Sobhi", voice_alafasy: "Scheich Mishary Rashid Alafasy",
    storage: "Speicher (Dateien)", free_of: "frei von",
    alarm_name_ph: "Name, z. B. Arbeit",
    bg_own: "Eigenes Bild", bg_replace: "Neues Bild", bg_crop: "Bild zuschneiden", bg_use: "Übernehmen", bg_crop_hint: "Mit einem Finger verschieben, mit zwei Fingern zoomen.", zoom: "Zoom", bg_brightness: "Helligkeit (damit die Schrift lesbar bleibt)", bg_uploading: "Bild wird hochgeladen …", bg_delete_q: "Eigenes Bild löschen?", delete: "Löschen",
    alarm_times: "Weckzeiten",
    jumuah: "Jumu'a", holiday_new_year: "Islamisches Neujahr", holiday_ashura: "Aschura", holiday_isra: "Isra und Mi'radsch", holiday_ramadan: "Ramadan-Beginn – Ramadan Mubarak", holiday_qadr: "Lailat al-Qadr", holiday_eid_fitr: "Eid al-Fitr – Eid Mubarak", holiday_arafah: "Tag von Arafah", holiday_eid_adha: "Eid al-Adha – Eid Mubarak",
    update_hint: "Update-Datei wählen: firmware.bin für das Programm der Uhr oder littlefs.bin für App, Töne und Hintergründe. Die Uhr startet danach neu.", update_pick: "Update-Datei wählen", update_confirm: "Update jetzt einspielen?", update_running: "Update läuft …", update_ok: "Update fertig, die Uhr startet neu …", update_fail: "Update fehlgeschlagen",
    hours: "Std.", minutes: "Min.",
  },

  en: {
    sig_strong: "Strong signal", sig_medium: "Medium signal", sig_weak: "Weak signal",
    auto_dim: "Dim automatically at night", night_brightness: "Night brightness",
    auto_dim_hint: "From Isha until Fajr the display dims on its own; during the day it uses the brightness set above. While an alarm rings it is fully bright.",
    azan_volume_hint: "Volume per prayer – for example Fajr and Isha quieter so nobody is woken up. ▶ plays the azan on the clock at that volume.",
    alarm_volume_hint: "Alarm volume. After you let go, the clock plays the selected alarm tone as a preview.",
    app: "Smart Azan Clock",
    nav_dashboard: "Dashboard", nav_prayer: "Prayer times", nav_location: "Location", nav_display: "Appearance",
    nav_audio: "Azan", nav_alarm: "Alarm", title_audio: "Azan notification", nav_wifi: "Wi-Fi", nav_device: "Device",
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
    led: "LED light", led_on: "Light", led_bri: "Brightness", led_hint: "Tap a colour or drag the colour bar – the light changes instantly.",
    hue: "Hue", lightness: "Light / dark", done: "Done", hour_pick: "Choose the hour", minute_pick: "Choose the minute",
    preset_rosegold: "Rose gold", preset_gold: "Gold", preset_silver: "Silver", preset_emerald: "Emerald", preset_turquoise: "Turquoise", preset_amber: "Amber",
    volume: "Volume", azan: "Azan", azan_for: "Azan", alarms: "Alarms", alarm_add: "Add alarm",
    alarm_none: "No alarm yet", alarm_hint: "The alarm rings on the selected days until you touch the screen or press BOOT (10 minutes at most). After stopping it only rings again at its next time. The small buttons on the display let you snooze for 5, 10, 15 or 30 minutes.",
    alarm_tone: "Alarm tone", tone_calm: "Calm · rising bells", tone_bells: "Bells · gentle melody", tone_classic: "Classic · beeping",
    tone_playing: "♪ Playing on the clock", day_min: "Select at least one day",
    days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    language: "Language", language_hint: "Applies to the app and the clock's display. The clock restarts briefly (about 10 seconds).", lang_restart: "The clock is restarting in the new language …",
    
    
    
    
    
    
    
    wifi_status: "Connection", network: "Network", networks: "Nearby networks", scan: "Scan for networks",
    password: "Password", connect: "Connect", connecting: "Connecting … the app may disconnect briefly",
    wifi_forget: "Set up Wi-Fi again", wifi_forget_hint: "Wi-Fi credentials are deleted and the clock restarts in setup mode (network “Adhan-Wecker”).",
    device: "Device", dev_name: "Name", connection: "Connection", firmware: "Firmware", ip: "IP address", host: "Local address",
    uptime: "Uptime", restart: "Restart", factory_reset: "Factory reset",
    factory_hint: "All settings and Wi-Fi credentials are deleted. Azan files and backgrounds remain.",
    firmware_update: "Update firmware", confirm: "Confirm", cancel: "Cancel", are_you_sure: "Are you sure?",
    restarting: "Restarting …", install: "Install app", install_hint_ios: "In Safari: Share → “Add to Home Screen”.",
    
    installed: "App installed ✓", install_menu: "In Chrome: menu ⋮ → “Install app”.",
    install_android: "On Android (Chrome)", sc_0: "First open the app version:", sc_open: "Open app version", sc_1: "Open the menu ⋮ at the top right.", sc_2: "Choose “Add to Home screen” and tap “Add”.",
    sc_3: "Open the app from its icon and tap the screen once – it then runs full screen.", sc_adv: "Without browser bar (advanced)",
    install_why: "Chrome installs apps only over a secure connection. The clock runs in your home network without HTTPS, so this one-time setting is needed:",
    install_s1: "Copy this address and paste it into Chrome's address bar:", install_s2: "Set it to “Enabled” and enter this address of the clock in the field:",
    install_s3: "Tap “Relaunch”, open this page again and tap “Install app”.",
    install_ip: "Tip: reserve the clock's IP address in your router (FRITZ!Box: Home Network → Network → “Always assign this network device the same IPv4 address”), otherwise it may change and the app loses the clock.",
    copy: "Copy", copied: "Copied ✓", install_banner: "Put the app on your home screen", install_how: "How to", close: "Close",
    tab_home: "Home", more: "More", azan_test: "Test azan", azan_test_normal: "Azan", azan_test_fajr: "Fajr azan",
    azan_test_hint: "The azan plays on the clock just like at prayer time. Touch the screen or tap “Stop” to end it.", stop: "Stop", azan_playing: "Azan playing on the clock …",
    nav_settings: "Settings", grp_prayer: "Prayer", grp_clock: "Clock", grp_conn: "Connection", back: "Back", listen: "Listen",
    volume_hint: "Plays the azan on the clock so you hear the volume while adjusting it.", azan_test_display: "Azan test with display on the clock",
    azan_voice: "Azan voice", azan_voice_hint: "The chosen voice is used for all prayers, with its own Fajr azan at Fajr. Tap ▶ to listen.",
    voice_islam_sobhi: "Sheikh Islam Sobhi", voice_alafasy: "Sheikh Mishary Rashid Alafasy",
    storage: "Storage (files)", free_of: "free of",
    alarm_name_ph: "Name, e.g. Work",
    bg_own: "Own picture", bg_replace: "New picture", bg_crop: "Crop picture", bg_use: "Use", bg_crop_hint: "Drag with one finger, zoom with two.", zoom: "Zoom", bg_brightness: "Brightness (keeps text readable)", bg_uploading: "Uploading picture …", bg_delete_q: "Delete your own picture?", delete: "Delete",
    alarm_times: "Alarm times",
    jumuah: "Jumu'a", holiday_new_year: "Islamic New Year", holiday_ashura: "Ashura", holiday_isra: "Isra and Mi'raj", holiday_ramadan: "Start of Ramadan – Ramadan Mubarak", holiday_qadr: "Laylat al-Qadr", holiday_eid_fitr: "Eid al-Fitr – Eid Mubarak", holiday_arafah: "Day of Arafah", holiday_eid_adha: "Eid al-Adha – Eid Mubarak",
    update_hint: "Choose an update file: firmware.bin for the clock's program or littlefs.bin for app, sounds and backgrounds. The clock restarts afterwards.", update_pick: "Choose update file", update_confirm: "Install the update now?", update_running: "Updating …", update_ok: "Update done, the clock is restarting …", update_fail: "Update failed",
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

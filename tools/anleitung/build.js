// Anleitung als PDF (Deutsch und Arabisch): Installation und Bedienung, mit Bildschirmfotos
const { chromium } = require('playwright-core');
const QR = require('qrcode');
const fs = require('fs');
const path = require('path');

const SH = process.env.SHOTS || path.join(__dirname, 'shots2'); // Bildschirmfotos (shot.js, shot2.js, Uhr: /api/screenshot)
const ICON = path.join(__dirname, '../../webapp/public/icons/icon-512.png');
const OUT = path.join(__dirname, '../../anleitung');
const APK_URL = 'https://github.com/faresbadawi/adhan-wecker/releases/latest';
const PWA_URL = 'https://faresbadawi.github.io/adhan-wecker/';
const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const shot = (lang, n) => img(path.join(SH, n.includes('.') ? n : `${lang}-${n}.png`));

// ---------- Beispieldarstellungen der Systemdialoge (keine echten Bildschirmfotos)
const mock = {
  chromeWarn: t => `<div class="mock"><div class="mk-dim"></div><div class="mk-sheet">
      <div class="mk-row"><span class="mk-file">APK</span><b>Bilal.apk</b></div>
      <p>${t.mk_warn}</p><div class="mk-btns"><span>${t.mk_cancel}</span><span class="hl">${t.mk_download_anyway}</span></div></div></div>`,
  unknown: t => `<div class="mock light"><div class="mk-top">← ${t.mk_unknown_title}</div>
      <div class="mk-app"><span class="mk-ic">C</span><b>Chrome</b></div>
      <div class="mk-switch"><span>${t.mk_allow}</span><i class="on hl"></i></div><p class="mk-small">${t.mk_unknown_note}</p></div>`,
  install: t => `<div class="mock"><div class="mk-dim"></div><div class="mk-dialog">
      <img src="${img(ICON)}"><b>Bilal</b><p>${t.mk_install_q}</p>
      <div class="mk-btns"><span>${t.mk_cancel}</span><span class="hl">${t.mk_install}</span></div></div></div>`,
  safariBar: t => `<div class="mock light"><div class="mk-page"><img src="${shot(t.lang, 'pwa')}"></div>
      <div class="mk-bar"><span>‹</span><span>›</span><span class="hl share">⬆</span><span>▢</span><span>⧉</span></div></div>`,
  shareSheet: t => `<div class="mock light"><div class="mk-dim"></div><div class="mk-sheet light">
      <div class="mk-list"><div>${t.mk_copy} <span>⧉</span></div><div>${t.mk_reading} <span>☰</span></div>
      <div class="hl-row">${t.mk_home} <span>⊞</span></div><div>${t.mk_bookmark} <span>☆</span></div></div></div></div>`,
  addHome: t => `<div class="mock light"><div class="mk-top between"><span>${t.mk_cancel}</span><span class="hl-text">${t.mk_add}</span></div><div class="mk-title">${t.mk_home}</div>
      <div class="mk-app big"><img src="${img(ICON)}"><b>Bilal</b></div><p class="mk-small">${t.mk_home_note}</p></div>`,
  portal: t => `<div class="mock light"><div class="mk-top">${t.mk_wifi}</div>
      <div class="mk-switch"><span>${t.mk_wifi}</span><i class="on"></i></div>
      <div class="mk-net hl-row"><b class="l">Bilal-Setup</b><span>${t.mk_open}</span></div><div class="mk-net"><b>FRITZ!Box</b><span>🔒</span></div>
      <div class="mk-net"><b>Vodafone-WLAN</b><span>🔒</span></div></div>`,
};

// ---------- Texte
const T = {
  de: {
    lang: 'de', dir: 'ltr', title: 'Bilal – Anleitung', sub: 'Gebetszeiten, Azan und Wecker',
    toc: ['App installieren: Android', 'App installieren: iPhone', 'Die Uhr einrichten', 'Die App benutzen', 'Die Bildschirme der Uhr'],
    note: 'Die Bilder der App und der Uhr sind echte Bildschirmfotos, mit Berlin als Beispielstadt. Bilder mit grauem Rahmen sind nachgezeichnet: Sie zeigen, wie das Fenster auf dem Handy ungefähr aussieht.',
    p1: 'App installieren: Android', p1i: 'Die Android-App kommt nicht aus dem Play Store, sondern direkt von GitHub. Das ist sicher, Android fragt beim ersten Mal nur nach.',
    a: [
      ['Download-Seite öffnen', `Den QR-Code scannen oder im Browser öffnen:<br><code>${APK_URL}</code>`, 'github.png', 'qr-apk'],
      ['„Bilal.apk“ antippen', 'Unter „Assets“ auf <b>Bilal.apk</b> tippen. Die Datei wird heruntergeladen (ca. 5 MB).', 'github2.png'],
      ['Download bestätigen', 'Chrome warnt bei Apps aus dem Internet. Auf <b>„Trotzdem herunterladen“</b> tippen.', 'chromeWarn'],
      ['Installation erlauben', 'Die Datei öffnen. Beim ersten Mal fragt Android: <b>„Aus dieser Quelle zulassen“</b> einschalten und zurück.', 'unknown'],
      ['Installieren', 'Auf <b>„Installieren“</b> und danach <b>„Öffnen“</b> tippen. Fertig – Bilal ist jetzt auf dem Startbildschirm.', 'install'],
    ],
    aTip: '<b>Neue Version?</b> Einfach die neue Bilal.apk genauso installieren – alle Einstellungen bleiben erhalten.',
    p2: 'App installieren: iPhone', p2i: 'Auf dem iPhone ist Bilal eine Web-App: Sie kommt über Safari auf den Home-Bildschirm und sieht dann aus wie eine normale App.',
    i: [
      ['Seite in Safari öffnen', `Wichtig: <b>Safari</b> benutzen (nicht Chrome). QR-Code scannen oder eingeben:<br><code>${PWA_URL}</code>`, 'pwa', 'qr-pwa'],
      ['Teilen antippen', 'Unten in der Leiste auf das <b>Teilen-Symbol</b> (Viereck mit Pfeil nach oben) tippen.', 'safariBar'],
      ['Zum Home-Bildschirm', 'In der Liste etwas nach unten wischen und <b>„Zum Home-Bildschirm“</b> wählen.', 'shareSheet'],
      ['Hinzufügen', 'Oben rechts auf <b>„Hinzufügen“</b> tippen. Bilal startet ab jetzt über das Symbol auf dem Home-Bildschirm.', 'addHome'],
    ],
    iTip: '<b>Uhr vom iPhone aus einstellen:</b> Im WLAN zu Hause in Safari <code class="s">http://azan-clock.local</code> öffnen und diese Seite genauso zum Home-Bildschirm hinzufügen.',
    p3: 'Die Uhr einrichten', p3i: 'Beim ersten Einschalten kennt die Uhr dein WLAN noch nicht. Das geht in einer Minute:',
    c: [
      ['Mit „Bilal-Setup“ verbinden', 'Uhr einschalten. Am Handy unter WLAN das Netz <b>„Bilal-Setup“</b> wählen. Die Einrichtungsseite öffnet sich von selbst (sonst <code class="s">http://192.168.4.1</code> öffnen).', 'portal'],
      ['Heim-WLAN wählen', 'Auf der Einrichtungsseite dein WLAN auswählen, das Passwort eingeben und speichern. Die Uhr startet neu und verbindet sich.', null],
      ['App öffnen', 'Handy wieder mit dem Heim-WLAN verbinden und Bilal öffnen. Die Android-App findet die Uhr im selben WLAN selbst. Ein Assistent führt durch Sprache, Ort, Azan und Wecker.', 'de-pwa.png'],
    ],
    p4: 'Die App benutzen',
    u: [
      ['Start', 'Nächstes Gebet mit Countdown, Uhrzeit und Datum, Wetter mit Regenwahrscheinlichkeit, das letzte Drittel der Nacht und der Hijri-Kalender. Die Glocke neben einem Gebet schaltet den Azan dafür an oder aus.', 'home'],
      ['Gebetszeiten: Ort und Berechnung', 'Auf den Ort tippen und die Stadt suchen. Bei „Berechnung“ die Methode deiner Gegend wählen; unter „Korrekturen“ lässt sich jede Zeit um Minuten verschieben.', 'prayer'],
      ['Gebetszeiten deiner Moschee', '„Moschee von Mawaqit“ wählen. Mit einem kostenlosen Mawaqit-Konto einmal anmelden und dann nach Name, Ort oder Postleitzahl suchen – oder in der Mawaqit-App die Moschee teilen und „Bilal“ wählen.', 'mawaqit'],
      ['Azan: Muezzin wählen', 'Muezzin antippen, ▶ spielt eine Hörprobe. Mit „Eigenen Azan hinzufügen“ lädst du eine eigene Aufnahme hoch.', 'azan'],
      ['Azan: je Gebet', '„Azan und Lautstärke je Gebet“ aufklappen: Azan je Gebet an/aus und Lautstärke. Darunter: Dauer, Azan später und Erinnerung vor dem Gebet.', 'azan2'],
      ['Wecker', '„Wecker hinzufügen“, Uhrzeit wählen, Wochentage antippen. Darunter der Wecker für das letzte Drittel der Nacht (Tahajjud).', 'alarm'],
      ['Weckton und Weckart', 'Weckton und Lautstärke wählen. <b>Leichtschläfer</b>: beginnt leise und wird langsam lauter. <b>Tiefschläfer</b>: sofort mit voller eingestellter Lautstärke.', 'alarm2'],
      ['Einstellungen', 'Zahnrad oben rechts: Aussehen der App, Darstellung der Uhr, Sprache, WLAN und Gerät.', 'settings'],
      ['Farben der Uhr', 'Unter „Darstellung“: Hintergrund, Reihenfolge der Seiten und Farbvorlagen. Standard ist <b>Bernstein (Anbari)</b>.', 'display2'],
      ['Name und Updates', 'Unter „Gerät“: Name der Uhr und Updates. Die Uhr aktualisiert sich nachts selbst; „Jetzt nach Update suchen“ geht auch sofort.', 'device2'],
    ],
    p5: 'Die Bildschirme der Uhr', p5i: 'Die Uhr hat mehrere Seiten. Wische auf dem Bildschirm nach links oder rechts, um die Seite zu wechseln. Die Punkte unten zeigen, auf welcher Seite du bist.',
    d: [
      ['Startbild', 'Erscheint kurz nach dem Einschalten.', 'splash'],
      ['Gebetszeiten', 'Die Hauptseite. Oben stehen Uhrzeit, Datum, Wetter und Ort. In der Mitte steht das nächste Gebet mit der Zeit bis dahin. Unten stehen die fünf Gebetszeiten, das nächste Gebet ist umrahmt. Das Weckersymbol zeigt den nächsten Wecker.', '2'],
      ['Uhr', 'Große Uhrzeit mit Sekunden, darunter Wochentag, Hijri-Datum und Datum. Oben rechts steht der nächste Wecker.', '1'],
      ['Wetter', 'Temperatur und Himmel von jetzt. Daneben stehen gefühlte Temperatur, Luftfeuchtigkeit und Wind. Unten steht die Vorhersage für drei Tage mit Höchst- und Tiefstwert.', '3'],
      ['Kalender', 'Der Monat in beiden Kalendern: groß der normale Tag, klein daneben der Hijri-Tag. Der heutige Tag ist markiert.', '4'],
      ['Mond & Hijri', 'Die Mondphase, das Hijri-Datum und die Weißen Tage (13. bis 15. des Monats). Unten steht, wie viel vom Mond beleuchtet ist.', '7'],
      ['Letztes Drittel der Nacht', 'Zeigt, wann das letzte Drittel der Nacht beginnt (die Zeit für Tahajjud). Dazu Maghrib, Mitte der Nacht, Fajr und Sonnenaufgang.', '6'],
      ['Einstellungen', 'Immer die letzte Seite. Scanne den QR-Code mit dem Handy, dann öffnet sich die Einstellungsseite der Uhr. Daneben stehen WLAN, Signalstärke und Adresse der Uhr.', '5'],
    ],
    dTips: ['<b>Azan stoppen:</b> Während des Azans irgendwo auf den Bildschirm tippen.',
      '<b>Wecker:</b> Tippen auf den Bildschirm stoppt den Wecker. Die Taste in der Mitte lässt ihn schlummern; mit − und + stellst du 5 bis 30 Minuten ein.',
      '<b>Seiten auswählen:</b> Welche Seiten die Uhr zeigt, in welcher Reihenfolge und ob sie von selbst wechselt, stellst du in der App unter Einstellungen → Darstellung ein.'],
    mk_warn: 'Diese Art von Datei kann schädlich sein. Trotzdem herunterladen?', mk_cancel: 'Abbrechen', mk_download_anyway: 'Trotzdem herunterladen',
    mk_unknown_title: 'Unbekannte Apps installieren', mk_allow: 'Aus dieser Quelle zulassen', mk_unknown_note: 'Nur einmal nötig.',
    mk_install_q: 'Möchtest du diese App installieren?', mk_install: 'Installieren',
    mk_copy: 'Kopieren', mk_reading: 'Zur Leseliste', mk_home: 'Zum Home-Bildschirm', mk_bookmark: 'Lesezeichen hinzufügen',
    mk_add: 'Hinzufügen', mk_home_note: 'Ein Symbol wird zum Home-Bildschirm hinzugefügt.', mk_wifi: 'WLAN', mk_open: 'offen',
    example: 'Beispieldarstellung', step: 'Schritt',
  },
  ar: {
    lang: 'ar', dir: 'rtl', title: 'بلال – دليل الاستخدام', sub: 'مواقيت الصلاة والأذان والمنبه',
    toc: ['تثبيت التطبيق: أندرويد', 'تثبيت التطبيق: آيفون', 'إعداد الساعة', 'استخدام التطبيق', 'شاشات الساعة'],
    note: 'صور التطبيق والساعة لقطات شاشة حقيقية، ومدينة برلين فيها مثال فقط. أما الصور ذات الإطار الرمادي فهي مرسومة للتوضيح: تبيّن شكل النافذة في الهاتف تقريبًا.',
    p1: 'تثبيت التطبيق: أندرويد', p1i: 'تطبيق أندرويد لا يأتي من متجر Play، بل مباشرة من GitHub. هذا آمن، ويسألك أندرويد في المرة الأولى فقط للتأكيد.',
    a: [
      ['افتح صفحة التنزيل', `امسح رمز QR أو افتح في المتصفح:<br><code>${APK_URL}</code>`, 'github.png', 'qr-apk'],
      ['اضغط على <span class="nw">«<span class="l">Bilal.apk</span>»</span>', 'تحت <span class="nw">«<span class="l">Assets</span>»</span> اضغط على <b>Bilal.apk</b>. يبدأ تنزيل الملف (حوالي ٥ ميغابايت).', 'github2.png'],
      ['أكّد التنزيل', 'يحذّر Chrome من التطبيقات القادمة من الإنترنت. اضغط <b>«التنزيل على أي حال»</b>.', 'chromeWarn'],
      ['اسمح بالتثبيت', 'افتح الملف. في المرة الأولى يسأل أندرويد: فعّل <b>«السماح من هذا المصدر»</b> ثم ارجع.', 'unknown'],
      ['التثبيت', 'اضغط <b>«تثبيت»</b> ثم <b>«فتح»</b>. انتهى – بلال الآن على الشاشة الرئيسية.', 'install'],
    ],
    aTip: '<b>إصدار جديد؟</b> ثبّت ملف Bilal.apk الجديد بالطريقة نفسها – تبقى كل الإعدادات كما هي.',
    p2: 'تثبيت التطبيق: آيفون', p2i: 'على الآيفون يعمل بلال كتطبيق ويب: تضيفه من Safari إلى الشاشة الرئيسية فيبدو كأي تطبيق عادي.',
    i: [
      ['افتح الصفحة في Safari', `مهم: استخدم <b>Safari</b> (وليس Chrome). امسح رمز QR أو اكتب:<br><code>${PWA_URL}</code>`, 'pwa', 'qr-pwa'],
      ['اضغط «مشاركة»', 'في الشريط السفلي اضغط على <b>رمز المشاركة</b> (مربع وسهم إلى الأعلى).', 'safariBar'],
      ['إضافة إلى الشاشة الرئيسية', 'اسحب القائمة قليلًا إلى الأسفل واختر <b>«إضافة إلى الشاشة الرئيسية»</b>.', 'shareSheet'],
      ['إضافة', 'اضغط <b>«إضافة»</b> في الأعلى. من الآن تفتح بلال من رمزه على الشاشة الرئيسية.', 'addHome'],
    ],
    iTip: '<b>ضبط الساعة من الآيفون:</b> في شبكة البيت افتح في Safari العنوان <code class="s">http://azan-clock.local</code> وأضف هذه الصفحة أيضًا إلى الشاشة الرئيسية بالطريقة نفسها.',
    p3: 'إعداد الساعة', p3i: 'عند التشغيل الأول لا تعرف الساعة شبكة الواي فاي عندك بعد. الإعداد يستغرق دقيقة واحدة:',
    c: [
      ['اتصل بشبكة <span class="nw">«<span class="l">Bilal-Setup</span>»</span>', 'شغّل الساعة. في إعدادات الواي فاي في الهاتف اختر الشبكة <b><span class="nw">«<span class="l">Bilal-Setup</span>»</span></b>. تفتح صفحة الإعداد وحدها (وإلا افتح <code class="s">http://192.168.4.1</code>).', 'portal'],
      ['اختر شبكة البيت', 'في صفحة الإعداد اختر شبكتك، واكتب كلمة المرور واحفظ. تُعيد الساعة التشغيل وتتصل.', null],
      ['افتح التطبيق', 'أعد الهاتف إلى شبكة البيت وافتح بلال. تطبيق أندرويد يجد الساعة في الشبكة نفسها تلقائيًا. يرشدك مساعد إلى اللغة والمكان والأذان والمنبه.', 'ar-pwa.png'],
    ],
    p4: 'استخدام التطبيق',
    u: [
      ['الرئيسية', 'الصلاة القادمة مع العدّ التنازلي، والوقت والتاريخ، والطقس مع احتمال المطر، والثلث الأخير من الليل، والتقويم الهجري. الجرس بجانب كل صلاة يشغّل الأذان لها أو يوقفه.', 'home'],
      ['المواقيت: المكان والحساب', 'اضغط على المكان وابحث عن مدينتك. في «طريقة الحساب» اختر الطريقة المعتمدة في منطقتك؛ وفي «التصحيح» يمكن تقديم أو تأخير كل وقت بالدقائق.', 'prayer'],
      ['مواقيت مسجدك', 'اختر «مسجد من Mawaqit». سجّل الدخول مرة واحدة بحساب Mawaqit المجاني، ثم ابحث بالاسم أو المدينة أو الرمز البريدي – أو شارك المسجد من تطبيق Mawaqit واختر <span class="nw">«<span class="l">Bilal</span>»</span>.', 'mawaqit'],
      ['الأذان: اختيار المؤذن', 'اضغط على المؤذن، و▶ للاستماع. ومن «إضافة أذان خاص» ترفع تسجيلًا من عندك.', 'azan'],
      ['الأذان لكل صلاة', 'افتح «الأذان ومستوى الصوت لكل صلاة»: تشغيل الأذان أو إيقافه ومستوى الصوت لكل صلاة. وتحتها: المدة، وتأخير الأذان، والتذكير قبل الصلاة.', 'azan2'],
      ['المنبه', '«إضافة منبه»، اختر الوقت واضغط على أيام الأسبوع. وتحته منبه الثلث الأخير من الليل (التهجد).', 'alarm'],
      ['نغمة المنبه وطريقة الإيقاظ', 'اختر النغمة ومستوى الصوت. <b>نوم خفيف</b>: يبدأ بهدوء ويرتفع تدريجيًا. <b>نوم عميق</b>: يرنّ فورًا بالمستوى المضبوط.', 'alarm2'],
      ['الإعدادات', 'الترس في الأعلى: مظهر التطبيق، ومظهر الساعة، واللغة، والواي فاي، والجهاز.', 'settings'],
      ['ألوان الساعة', 'في «المظهر»: الخلفية، وترتيب الصفحات، والألوان الجاهزة. الافتراضي هو <b>العنبري</b>.', 'display2'],
      ['الاسم والتحديثات', 'في «الجهاز»: اسم الساعة والتحديثات. تحدّث الساعة نفسها ليلًا؛ ويمكن أيضًا الضغط على «البحث عن تحديث الآن».', 'device2'],
    ],
    p5: 'شاشات الساعة', p5i: 'للساعة عدة صفحات. اسحب بإصبعك على الشاشة يمينًا أو يسارًا للانتقال بينها. النقاط في الأسفل تبيّن الصفحة التي أنت فيها.',
    d: [
      ['شاشة البداية', 'تظهر لحظات بعد تشغيل الساعة.', 'splash'],
      ['مواقيت الصلاة', 'الصفحة الرئيسية. في الأعلى الوقت والتاريخ والطقس والمدينة. في الوسط الصلاة القادمة والوقت المتبقي لها. في الأسفل أوقات الصلوات الخمس، والصلاة القادمة داخل إطار. رمز المنبه يبيّن المنبه القادم.', '2'],
      ['الساعة', 'الوقت بخط كبير مع الثواني، وتحته اليوم والتاريخ الهجري والتاريخ الميلادي. في الأعلى المنبه القادم.', '1'],
      ['الطقس', 'درجة الحرارة وحالة السماء الآن. بجانبها الحرارة المحسوسة والرطوبة والرياح. في الأسفل توقعات ثلاثة أيام مع العظمى والصغرى.', '3'],
      ['التقويم', 'الشهر بالتقويمين: اليوم الميلادي بخط كبير، وبجانبه اليوم الهجري بخط صغير. اليوم الحالي مميَّز.', '4'],
      ['القمر والتقويم الهجري', 'شكل القمر والتاريخ الهجري والأيام البيض (١٣ إلى ١٥ من الشهر). في الأسفل نسبة الجزء المضيء من القمر.', '7'],
      ['الثلث الأخير من الليل', 'تبيّن متى يبدأ الثلث الأخير من الليل (وقت التهجد). ومعه المغرب ومنتصف الليل والفجر والشروق.', '6'],
      ['الإعدادات', 'دائمًا آخر صفحة. امسح رمز QR بالهاتف فتفتح صفحة إعدادات الساعة. بجانبه شبكة الواي فاي وقوة الإشارة وعنوان الساعة.', '5'],
    ],
    dTips: ['<b>إيقاف الأذان:</b> اضغط في أي مكان على الشاشة أثناء الأذان.',
      '<b>المنبه:</b> الضغط على الشاشة يوقف المنبه. الزر في الوسط للغفوة، وبالزرّين − و + تختار من ٥ إلى ٣٠ دقيقة.',
      '<b>اختيار الصفحات:</b> من التطبيق، في الإعدادات ← المظهر، تختار الصفحات التي تعرضها الساعة وترتيبها وهل تتبدّل تلقائيًا.'],
    mk_warn: 'قد يكون هذا النوع من الملفات ضارًا. هل تريد تنزيله على أي حال؟', mk_cancel: 'إلغاء', mk_download_anyway: 'التنزيل على أي حال',
    mk_unknown_title: 'تثبيت تطبيقات غير معروفة', mk_allow: 'السماح من هذا المصدر', mk_unknown_note: 'مرة واحدة فقط.',
    mk_install_q: 'هل تريد تثبيت هذا التطبيق؟', mk_install: 'تثبيت',
    mk_copy: 'نسخ', mk_reading: 'إضافة إلى قائمة القراءة', mk_home: 'إضافة إلى الشاشة الرئيسية', mk_bookmark: 'إضافة إشارة مرجعية',
    mk_add: 'إضافة', mk_home_note: 'ستتم إضافة رمز إلى الشاشة الرئيسية.', mk_wifi: 'Wi-Fi', mk_open: 'مفتوحة',
    example: 'صورة توضيحية', step: 'الخطوة',
  },
};

const CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 10.5pt/1.55 Inter, "IBM Plex Sans Arabic", sans-serif; color: #1E1A14; }
html[lang=ar] body { font-family: "IBM Plex Sans Arabic", Inter, sans-serif; font-size: 11pt; line-height: 1.7; }
code { font-family: ui-monospace, Menlo, monospace; font-size: 8.6pt; background: #F4EEE3; padding: 1px 5px; border-radius: 4px; direction: ltr; unicode-bidi: embed; word-break: break-all; }
b { font-weight: 650; }
.cover { height: 265mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #0B0A08; color: #F4EEE3; border-radius: 6mm; padding: 20mm; page-break-after: always; }
.cover img { width: 36mm; border-radius: 9mm; }
.cover h1 { font-size: 30pt; margin: 9mm 0 2mm; color: #E8A04E; }
.cover .sub { font-size: 13pt; color: #CDBFA8; margin: 0 0 14mm; }
.cover ol { text-align: start; font-size: 12pt; line-height: 2.1; padding-inline-start: 7mm; margin: 0; color: #F4EEE3; }
.cover .note { font-size: 8.5pt; color: #A79C8A; margin-top: 16mm; max-width: 120mm; }
h2 { font-size: 18pt; margin: 0 0 2mm; color: #0B0A08; display: flex; align-items: center; gap: 3mm; }
h2 .n { background: #E8A04E; color: #1A1206; width: 9mm; height: 9mm; border-radius: 50%; display: inline-grid; place-items: center; font-size: 12pt; flex: none; }
.intro { color: #5C5346; margin: 0 0 6mm; }
.part { page-break-before: always; }
.steps { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 7mm; }
.steps.app { grid-template-columns: 1fr 1fr; }
.step { break-inside: avoid; display: flex; gap: 4mm; align-items: flex-start; }
.phone { flex: none; width: 33mm; border-radius: 5mm; overflow: hidden; border: 1.6mm solid #0B0A08; background: #0B0A08; position: relative; }
.phone img { display: block; width: 100%; }
.phone.mock-frame { border-color: #B9B2A6; background: #fff; }
.txt h3 { margin: 0 0 1.5mm; font-size: 11.5pt; display: flex; gap: 2mm; align-items: baseline; }
html[lang=ar] .txt h3 { font-size: 12pt; }
.txt h3 small { color: #E8A04E; font-weight: 700; }
.txt p { margin: 0; color: #2E2820; }
code.s { white-space: nowrap; word-break: normal; display: inline-block; }
.l { direction: ltr; unicode-bidi: isolate; white-space: nowrap; }
.nw { white-space: nowrap; }
.steps.dev { gap: 6mm 8mm; }
.steps.dev .step { flex-direction: column; gap: 2.5mm; }
.device { width: 100%; border-radius: 3mm; overflow: hidden; border: 1.4mm solid #0B0A08; background: #0B0A08; }
.device img { display: block; width: 100%; }
.tips { margin-top: 6mm; display: grid; gap: 3mm; }
.tips .tip { margin: 0; }
.qr { width: 26mm; margin-top: 3mm; display: block; }
.ex { font-size: 7pt; color: #8A8172; text-align: center; padding: 1mm 0; background: #fff; }
.tip.in { margin: 0; align-self: start; }
.tip { margin-top: 7mm; background: #FBF4E8; border-inline-start: 1.2mm solid #E8A04E; padding: 3.5mm 5mm; border-radius: 2mm; break-inside: avoid; }
/* Beispieldarstellungen */
.mock { position: relative; height: 68mm; background: #1B1B1D; color: #fff; font: 7.5pt/1.35 system-ui, sans-serif; overflow: hidden; }
html[lang=ar] .mock { font-family: "IBM Plex Sans Arabic", sans-serif; }
.mock.light { background: #F2F2F7; color: #111; }
.mk-dim { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
.mk-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #2A2A2E; padding: 4mm 3.5mm; border-radius: 4mm 4mm 0 0; }
.mk-sheet.light { background: #fff; color: #111; }
.mk-sheet p { margin: 2mm 0 3mm; }
.mk-row { display: flex; align-items: center; gap: 2mm; }
.mk-file { background: #3DDC84; color: #000; font-weight: 700; font-size: 6pt; padding: 1mm 1.4mm; border-radius: 1mm; }
.mk-btns { display: flex; flex-direction: column; align-items: flex-end; gap: 2.2mm; font-weight: 600; color: #8AB4F8; font-size: 6.8pt; padding: 0 1mm 1mm; }
.mk-btns span { max-width: 100%; text-align: end; }
.mk-btns .hl { outline-offset: .3mm; margin-inline-end: .6mm; }
.mk-dialog { position: absolute; left: 3mm; right: 3mm; top: 22mm; background: #2A2A2E; border-radius: 4mm; padding: 4mm; text-align: center; }
.mk-dialog img { width: 10mm; border-radius: 2.5mm; }
.mk-dialog b { display: block; margin: 1mm 0; }
.mk-dialog p { margin: 0 0 3mm; }
.mk-top { padding: 4mm 3mm 3mm; font-weight: 600; font-size: 8pt; }
.mk-title { text-align: center; font-weight: 700; font-size: 8pt; }
.mk-top.between { display: flex; justify-content: space-between; align-items: center; font-size: 5.6pt; gap: 2mm; padding: 4mm 3.5mm 3mm; }
.mk-top.between span { white-space: nowrap; }
.mk-app { display: flex; align-items: center; gap: 2mm; padding: 2mm 3mm; }
.mk-app.big { flex-direction: column; padding-top: 6mm; }
.mk-app.big img { width: 14mm; border-radius: 3.5mm; }
.mk-ic { width: 6mm; height: 6mm; border-radius: 50%; background: #4285F4; color: #fff; display: grid; place-items: center; font-weight: 700; }
.mk-switch { display: flex; justify-content: space-between; align-items: center; background: #fff; margin: 2mm 2.5mm; padding: 2.5mm; border-radius: 2mm; }
.mk-switch i { width: 8mm; height: 4.5mm; border-radius: 3mm; background: #34C759; position: relative; }
.mk-switch i::after { content: ""; position: absolute; top: .5mm; inset-inline-end: .5mm; width: 3.5mm; height: 3.5mm; border-radius: 50%; background: #fff; }
.mk-small { color: #6B6B70; padding: 0 3mm; margin: 1mm 0; font-size: 6.8pt; text-align: center; }
.mk-page { position: absolute; inset: 0 0 9mm 0; overflow: hidden; }
.mk-page img { width: 100%; }
.mk-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 9mm; background: #F7F7F7; display: flex; justify-content: space-around; align-items: center; font-size: 10pt; color: #007AFF; border-top: .3mm solid #ddd; direction: ltr; }
.mk-list div { display: flex; justify-content: space-between; padding: 2.3mm 1mm; border-bottom: .3mm solid #eee; }
.mk-net { display: flex; justify-content: space-between; gap: 1.5mm; font-size: 6.3pt; align-items: center; background: #fff; margin: 0 2.5mm; padding: 2.5mm; border-bottom: .3mm solid #eee; }
.hl { outline: .7mm solid #E8A04E; outline-offset: .6mm; border-radius: 1.5mm; }
.hl-row { outline: .7mm solid #E8A04E; border-radius: 1.5mm; background: #FFF7EA; }
.hl-text { color: #007AFF; font-weight: 700; outline: .7mm solid #E8A04E; outline-offset: .6mm; border-radius: 1mm; }
.share { font-weight: 700; }
`;

async function qr(url) { return QR.toDataURL(url, { margin: 1, width: 300, color: { dark: '#0B0A08', light: '#FFFFFF' } }); }

async function page(t) {
  const qrs = { 'qr-apk': await qr(APK_URL), 'qr-pwa': await qr(PWA_URL) };
  const pic = (key) => {
    if (!key) return '';
    if (mock[key]) return `<div class="phone mock-frame">${mock[key](t)}<div class="ex">${t.example}</div></div>`;
    return `<div class="phone"><img src="${shot(t.lang, key)}"></div>`;
  };
  const steps = (list, cls = '', extra = '') => `<div class="steps ${cls}">${list.map(([h, p, k, q], i) => `
    <div class="step">${pic(k)}<div class="txt"><h3><small>${i + 1}</small><span>${h}</span></h3><p>${p}</p>${q ? `<img class="qr" src="${qrs[q]}">` : ''}</div></div>`).join('')}${extra}</div>`;
  return `<!doctype html><html lang="${t.lang}" dir="${t.dir}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<section class="cover"><img src="${img(ICON)}"><h1>${t.title}</h1><p class="sub">${t.sub}</p>
  <ol>${t.toc.map(x => `<li>${x}</li>`).join('')}</ol><p class="note">${t.note}</p></section>
<section><h2><span class="n">1</span>${t.p1}</h2><p class="intro">${t.p1i}</p>${steps(t.a, '', `<div class="tip in">${t.aTip}</div>`)}</section>
<section class="part"><h2><span class="n">2</span>${t.p2}</h2><p class="intro">${t.p2i}</p>${steps(t.i)}<div class="tip">${t.iTip}</div></section>
<section class="part"><h2><span class="n">3</span>${t.p3}</h2><p class="intro">${t.p3i}</p>${steps(t.c)}</section>
<section class="part"><h2><span class="n">4</span>${t.p4}</h2>${steps(t.u, 'app')}</section>
<section class="part"><h2><span class="n">5</span>${t.p5}</h2><p class="intro">${t.p5i}</p><div class="steps dev">${t.d.map(([h, p, k], i) => `
    <div class="step"><div class="device"><img src="${shot(t.lang, 'dev-' + k)}"></div><div class="txt"><h3><small>${i + 1}</small><span>${h}</span></h3><p>${p}</p></div></div>`).join('')}</div>
  <div class="tips">${t.dTips.map(x => `<div class="tip">${x}</div>`).join('')}</div></section>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  for (const lang of ['de', 'ar']) {
    const html = await page(T[lang]);
    fs.writeFileSync(path.join(__dirname, `guide-${lang}.html`), html);
    const p = await b.newPage();
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const name = lang === 'de' ? 'Bilal-Anleitung-Deutsch.pdf' : 'Bilal-Anleitung-Arabisch.pdf';
    await p.pdf({ path: path.join(OUT, name), format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#999;text-align:center;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>` });
    await p.close();
    console.log('PDF', name);
  }
  await b.close();
})();

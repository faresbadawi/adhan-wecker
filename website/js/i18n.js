// Texte der Produktseite in drei Sprachen (wie auf der Uhr: Arabisch, Deutsch, Englisch).
// Arabisch bewusst fast ohne Vokalzeichen: nur Schadda, wo sie sicher ist.
// <g> = goldener Text, <em> = hervorgehobenes Wort im Leitsatz.
export const LANGS = ['ar', 'de', 'en'];

export const T = {
  'title':        { ar: 'بلال · ساعة الأذان الذكية', de: 'Bilal · Die smarte Azan-Uhr', en: 'Bilal · The smart Azan clock' },
  'nav.try':      { ar: 'المحاكي', de: 'Simulator', en: 'Simulator' },
  'nav.features': { ar: 'المزايا', de: 'Funktionen', en: 'Features' },
  'nav.design':   { ar: 'التصميم', de: 'Design', en: 'Design' },
  'nav.guide':    { ar: 'الدليل', de: 'Anleitung', en: 'Guide' },

  'hero.sub':  { ar: 'مواقيت الصلاة والأذان', de: 'Gebetszeiten & Azan', en: 'Prayer times & Azan' },
  'hero.tag':  { ar: 'ساعة الأذان الذكية لبيتك', de: 'Die smarte Azan-Uhr für dein Zuhause', en: 'The smart Azan clock for your home' },
  'hero.cta':  { ar: 'جربه الآن', de: 'Jetzt ausprobieren', en: 'Try it now' },

  'reveal.1': { ar: 'كل صلاة <g>في وقتها</g>', de: 'Jedes Gebet <g>zur rechten Zeit.</g>', en: 'Every prayer, <g>right on time.</g>' },
  'reveal.2': { ar: 'أذان <g>بصوت تختاره</g>', de: 'Der Azan, <g>mit der Stimme deiner Wahl.</g>', en: 'The Azan, <g>in the voice you choose.</g>' },
  'reveal.3': { ar: 'جميل <g>من كل الجهات</g>', de: 'Schön <g>von allen Seiten.</g>', en: 'Beautiful <g>from every side.</g>' },

  'statement': {
    ar: 'ساعة تعرف وقت كل <em>صلاة</em>، وترفع <em>الأذان</em> في بيتك بصوت المؤذن الذي تحبه.',
    de: 'Eine Uhr, die jede <em>Gebetszeit</em> kennt und den <em>Azan</em> in deinem Zuhause erklingen lässt, mit der Stimme deines Lieblingsmuezzins.',
    en: 'A clock that knows every <em>prayer</em> time and calls the <em>Azan</em> in your home, in the voice of the muezzin you love.',
  },

  'st1': { ar: 'الصلوات الخمس', de: 'Gebete am Tag', en: 'daily prayers' },
  'st2': { ar: 'صفحات على الشاشة', de: 'Seiten auf dem Display', en: 'screens to swipe' },
  'st3': { ar: 'لغات', de: 'Sprachen', en: 'languages' },
  'st4': { ar: 'لونان', de: 'Farben', en: 'finishes' },

  'sim.eyebrow': { ar: 'المحاكي', de: 'Simulator', en: 'Simulator' },
  'sim.title':   { ar: 'جربه الآن، <g>كما هو بالضبط</g>', de: 'Probier ihn aus, <g>genau so, wie er ist.</g>', en: 'Try it, <g>exactly as it is.</g>' },
  'sim.lead': {
    ar: 'ليست صورة ولا فيديو، بل البرمجة نفسها التي تعمل داخل بلال، تعمل الآن في متصفحك. شغله ثم اسحب على الشاشة لتتنقل بين صفحاته كما على الجهاز.',
    de: 'Kein Bild, kein Video: Es ist dieselbe Software, die in Bilal läuft, jetzt in deinem Browser. Einschalten und auf dem Display wischen, wie am echten Gerät.',
    en: 'Not a picture, not a video: it is the very software that runs inside Bilal, now running in your browser. Switch it on and swipe the screen, just like on the real thing.',
  },
  'sim.on':      { ar: 'تشغيل', de: 'Einschalten', en: 'Power on' },
  'sim.off':     { ar: 'إيقاف', de: 'Ausschalten', en: 'Power off' },
  'sim.white':   { ar: 'أبيض', de: 'Weiß', en: 'White' },
  'sim.black':   { ar: 'أسود', de: 'Schwarz', en: 'Black' },
  'sim.hint':    { ar: 'اسحب لتدوير الجهاز، واسحب على الشاشة لتصفح الصفحات', de: 'Ziehen zum Drehen · auf dem Display wischen zum Blättern', en: 'Drag to rotate · swipe the screen to browse' },
  'sim.loading': { ar: 'جار تحميل النموذج…', de: 'Modell wird geladen …', en: 'Loading model…' },

  'feat.eyebrow': { ar: 'المزايا', de: 'Funktionen', en: 'Features' },
  'feat.title':   { ar: 'كل ما <g>يحتاجه يومك</g>', de: 'Alles, was <g>dein Tag braucht.</g>', en: 'Everything <g>your day needs.</g>' },
  'f1.t': { ar: 'مواقيت الصلاة', de: 'Gebetszeiten', en: 'Prayer times' },
  'f1.p': {
    ar: 'مواقيت دقيقة لمدينتك أو لمسجدك عبر منصة مواقيت، مع عد تنازلي للصلاة القادمة. ويوم الجمعة يظهر الظهر باسم الجمعة.',
    de: 'Genaue Zeiten für deine Stadt oder deine Moschee über Mawaqit, mit Countdown bis zum nächsten Gebet. Freitags heißt Dhuhr Jumu’a.',
    en: 'Accurate times for your city or your mosque via Mawaqit, with a countdown to the next prayer. On Fridays, Dhuhr becomes Jumu’ah.',
  },
  'f2.t': { ar: 'الساعة والتاريخ الهجري', de: 'Uhr & Hijri-Datum', en: 'Clock & Hijri date' },
  'f2.p': {
    ar: 'ساعة كبيرة تقرأ من بعيد، مع اليوم والتاريخين الهجري والميلادي.',
    de: 'Eine große Uhr, lesbar quer durch den Raum, mit Wochentag, Hijri- und gregorianischem Datum.',
    en: 'A large clock you can read across the room, with weekday, Hijri and Gregorian date.',
  },
  'f3.t': { ar: 'الثلث الأخير من الليل', de: 'Letztes Drittel der Nacht', en: 'Last third of the night' },
  'f3.p': {
    ar: 'يقسم الليل من المغرب إلى الفجر، ويريك منتصفه وبداية ثلثه الأخير، ويوقظك لقيام الليل إن شئت.',
    de: 'Teilt die Nacht von Maghrib bis Fajr, zeigt ihre Mitte und den Beginn des letzten Drittels und weckt dich auf Wunsch zum Nachtgebet.',
    en: 'Divides the night from Maghrib to Fajr, shows its middle and the start of the last third, and wakes you for the night prayer if you wish.',
  },
  'f4.t': { ar: 'التقويم والمناسبات', de: 'Kalender & besondere Tage', en: 'Calendar & special days' },
  'f4.p': {
    ar: 'شهر كامل بالتاريخين، مع إبراز المناسبات: رأس السنة الهجرية وعاشوراء والإسراء والمعراج ورمضان وليلة القدر وعرفة والعيدين.',
    de: 'Der ganze Monat in beiden Kalendern. Hijri-Neujahr, Aschura, Isra und Miradsch, Ramadan, Laylat al-Qadr, Arafa und die beiden Feste sind hervorgehoben.',
    en: 'The whole month in both calendars, with Islamic New Year, Ashura, Isra and Mi’raj, Ramadan, Laylat al-Qadr, Arafah and both Eids highlighted.',
  },
  'f5.t': { ar: 'القمر والشهر الهجري', de: 'Mond & Hijri-Monat', en: 'Moon & Hijri month' },
  'f5.p': {
    ar: 'طور القمر الليلة، واليوم من الشهر الهجري، والأيام البيض.',
    de: 'Die Mondphase heute Nacht, der Tag im Hijri-Monat und die weißen Tage.',
    en: 'Tonight’s moon phase, the day of the Hijri month and the white days.',
  },
  'f6.t': { ar: 'الطقس', de: 'Wetter', en: 'Weather' },
  'f6.p': {
    ar: 'الحرارة الآن والإحساس الفعلي والرطوبة والرياح، مع توقعات ثلاثة أيام.',
    de: 'Temperatur, gefühlte Temperatur, Luftfeuchte und Wind, dazu die Aussichten für drei Tage.',
    en: 'Temperature, feels-like, humidity and wind, plus a three-day forecast.',
  },

  'motif.eyebrow': { ar: 'الزخرفة', de: 'Das Ornament', en: 'The ornament' },
  'motif.title':   { ar: 'نجمة ثمانية <g>من قلب الفن الإسلامي</g>', de: 'Ein Achtstern <g>aus dem Herzen islamischer Kunst.</g>', en: 'An eight-pointed star <g>from the heart of Islamic art.</g>' },
  'motif.lead': {
    ar: 'أشرطة متشابكة تلتف حول نجمة ثمانية الرؤوس، وتتكرر بلا نهاية كما في المساجد والقصور القديمة. هي روح بلال: تزين إطاره وظهره، وتتردد أصداؤها في خلفية شاشته.',
    de: 'Verflochtene Bänder um einen achtzackigen Stern, endlos wiederholt wie in alten Moscheen und Palästen. Sie ist Bilals Seele: auf dem Rahmen, auf der Rückseite und als Echo im Hintergrund des Displays.',
    en: 'Interlaced bands around an eight-pointed star, repeating endlessly as in historic mosques and palaces. It is Bilal’s soul: on the frame, on the back, and echoed in the screen’s background.',
  },

  'duo.eyebrow': { ar: 'التصميم', de: 'Design', en: 'Design' },
  'duo.title':   { ar: 'لونان <g>وروح واحدة</g>', de: 'Zwei Farben. <g>Eine Seele.</g>', en: 'Two finishes. <g>One soul.</g>' },
  'duo.lead': {
    ar: 'إطار ذهبي بزخرفة إسلامية يحيط بشاشة مائلة، لتقرأ المواقيت بنظرة واحدة من أي مكان في الغرفة.',
    de: 'Ein goldener, ornamentierter Rahmen um ein geneigtes Display: die Zeiten auf einen Blick, von überall im Raum.',
    en: 'A golden, ornamented frame around a tilted display: the times at a glance, from anywhere in the room.',
  },
  'duo.w':  { ar: 'أبيض وذهبي', de: 'Weiß & Gold', en: 'White & Gold' },
  'duo.ws': { ar: 'نقاء يليق بكل بيت', de: 'Hell und klar, für jedes Zuhause', en: 'Light and pure, for every home' },
  'duo.b':  { ar: 'أسود وذهبي', de: 'Schwarz & Gold', en: 'Black & Gold' },
  'duo.bs': { ar: 'فخامة هادئة', de: 'Stille Eleganz', en: 'Quiet luxury' },

  'life.eyebrow': { ar: 'في بيتك', de: 'Bei dir zu Hause', en: 'At home' },
  'life.title':   { ar: 'رفيق <g>كل صلاة</g>', de: 'Begleiter <g>für jedes Gebet.</g>', en: 'A companion <g>for every prayer.</g>' },
  'life.1': { ar: 'قبل الفجر', de: 'Vor Fajr', en: 'Before Fajr' },
  'life.2': { ar: 'في غرفة المعيشة', de: 'Im Wohnzimmer', en: 'In the living room' },
  'life.3': { ar: 'بجانب المصحف', de: 'Neben dem Koran', en: 'Beside the Quran' },
  'life.4': { ar: 'عند المغرب', de: 'Zu Maghrib', en: 'At Maghrib' },

  'more.title': { ar: 'وأكثر <g>من ذلك</g>', de: 'Und <g>noch mehr.</g>', en: 'And <g>there’s more.</g>' },
  'm1.t': { ar: 'أذان بصوت تختاره', de: 'Azan nach Wahl', en: 'Azan of your choice' },
  'm1.p': { ar: 'أصوات مؤذنين مختارة، وأذان خاص للفجر، وتنبيه قبل الصلاة.', de: 'Ausgewählte Muezzin-Stimmen, ein eigener Fajr-Azan und ein Hinweiston vor dem Gebet.', en: 'Selected muezzin voices, a dedicated Fajr Azan and a reminder before prayer.' },
  'm2.t': { ar: 'منبّه', de: 'Wecker', en: 'Alarm' },
  'm2.p': { ar: 'منبهات بأسماء وأيام، مع غفوة بلمسة واحدة.', de: 'Wecker mit Namen und Wochentagen, Schlummern mit einem Tipp.', en: 'Named alarms on chosen weekdays, snooze with one tap.' },
  'm3.t': { ar: 'هادئ في الليل', de: 'Ruhig in der Nacht', en: 'Calm at night' },
  'm3.p': { ar: 'تخفت الشاشة تلقائيا من العشاء إلى الفجر.', de: 'Das Display dimmt sich von Isha bis Fajr von selbst.', en: 'The screen dims itself from Isha to Fajr.' },
  'm4.t': { ar: 'تطبيق للهاتف', de: 'App fürs Handy', en: 'Phone app' },
  'm4.p': { ar: 'لأندرويد وآيفون: يضبط الساعة، ويؤذن على هاتفك حتى من دونها.', de: 'Für Android und iPhone: stellt die Uhr ein und ruft den Azan auch ohne sie.', en: 'For Android and iPhone: sets up the clock and calls the Azan even without it.' },
  'm5.t': { ar: 'يتجدد وحده', de: 'Aktualisiert sich selbst', en: 'Updates itself' },
  'm5.p': { ar: 'تصله التحديثات عبر الإنترنت.', de: 'Neue Versionen kommen automatisch über das Internet.', en: 'New versions arrive automatically over the internet.' },
  'm6.t': { ar: 'ثلاث لغات', de: 'Drei Sprachen', en: 'Three languages' },
  'm6.p': { ar: 'العربية والألمانية والإنجليزية.', de: 'Arabisch, Deutsch und Englisch.', en: 'Arabic, German and English.' },

  'specs.title': { ar: 'صغير في حجمه، <g>كبير في حضوره</g>', de: 'Klein im Format. <g>Groß im Auftritt.</g>', en: 'Small in size. <g>Big in presence.</g>' },
  's1.k': { ar: 'الشاشة', de: 'Display', en: 'Display' },
  's1.v': { ar: 'شاشة لمس 3.5 بوصة · 480 × 320', de: '3,5″-Touchscreen · 480 × 320', en: '3.5″ touchscreen · 480 × 320' },
  's2.k': { ar: 'الأبعاد تقريبا', de: 'Maße (ca.)', en: 'Size (approx.)' },
  's2.v': { ar: '13.5 × 7 × 7 سم', de: '13,5 × 7 × 7 cm', en: '13.5 × 7 × 7 cm' },
  's3.k': { ar: 'المعالج', de: 'Prozessor', en: 'Processor' },
  's3.v': { ar: 'ESP32-S3 ثنائي النواة', de: 'ESP32-S3, Dual-Core', en: 'ESP32-S3 dual-core' },
  's4.k': { ar: 'الاتصال', de: 'Verbindung', en: 'Connectivity' },
  's4.v': { ar: 'واي فاي 2.4 GHz', de: 'WLAN 2,4 GHz', en: 'Wi-Fi 2.4 GHz' },
  's5.k': { ar: 'الصوت', de: 'Ton', en: 'Sound' },
  's5.v': { ar: 'مكبر صوت مدمج', de: 'Eingebauter Lautsprecher', en: 'Built-in speaker' },
  's6.k': { ar: 'التخزين', de: 'Speicher', en: 'Storage' },
  's6.v': { ar: 'بطاقة microSD', de: 'microSD-Karte', en: 'microSD card' },
  's7.k': { ar: 'اللغات', de: 'Sprachen', en: 'Languages' },
  's7.v': { ar: 'العربية · الألمانية · الإنجليزية', de: 'Arabisch · Deutsch · Englisch', en: 'Arabic · German · English' },
  's8.k': { ar: 'المواقيت', de: 'Gebetszeiten', en: 'Prayer times' },
  's8.v': { ar: 'حسب المدينة أو المسجد', de: 'Nach Stadt oder Moschee', en: 'By city or mosque' },
  's9.k': { ar: 'التطبيق', de: 'App', en: 'App' },
  's9.v': { ar: 'أندرويد وآيفون', de: 'Android & iPhone', en: 'Android & iPhone' },

  'guide.title': { ar: 'دليل الاستخدام', de: 'Bedienungsanleitung', en: 'User guide' },
  'guide.lead': {
    ar: 'كل ما تحتاجه لتشغيل بلال خطوة بخطوة: الاتصال بالشبكة، واختيار المدينة أو المسجد، والأذان والمنبه، والتطبيق.',
    de: 'Alles, um Bilal Schritt für Schritt einzurichten: WLAN, Stadt oder Moschee, Azan und Wecker, App.',
    en: 'Everything to set up Bilal step by step: Wi-Fi, city or mosque, Azan and alarms, and the app. Available in Arabic and German.',
  },
  'guide.dl':  { ar: 'تحميل الدليل', de: 'Anleitung herunterladen', en: 'Guide in German' },
  'guide.dl2': { ar: '', de: '', en: 'Guide in Arabic' },
  'guide.app': { ar: 'افتح التطبيق', de: 'App öffnen', en: 'Open the app' },
  'credit':    { ar: 'تصميم <b>فارس</b>', de: 'Design von <b>Fares</b>', en: 'Design by <b>Fares</b>' },
  'copy':      { ar: 'بلال · مواقيت الصلاة والأذان', de: 'Bilal · Gebetszeiten & Azan', en: 'Bilal · Prayer times & Azan' },
};

// Anleitung je Sprache (Englisch: es gibt eine deutsche und eine arabische)
// Die PDFs liegen schon auf GitHub Pages (Ordner anleitung/), daher nicht doppelt in der Seite
const PDF = 'https://faresbadawi.github.io/adhan-wecker/anleitung/';
export const GUIDE = { ar: PDF + 'Bilal-Anleitung-Arabisch.pdf', de: PDF + 'Bilal-Anleitung-Deutsch.pdf', en: PDF + 'Bilal-Anleitung-Deutsch.pdf' };
export const GUIDE_AR = PDF + 'Bilal-Anleitung-Arabisch.pdf';

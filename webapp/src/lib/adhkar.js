// Kurze, bekannte Adhkar (Arabisch mit Übersetzung). Die Zahl ist die übliche Anzahl, 0 = frei zählen.
export const ADHKAR = [
  { id: 'subhan', tr: 'Allah’ı hamd ile tenzih ederim; yüce Allah’ı tenzih ederim.', ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ', n: 0,
    de: 'Gepriesen sei Allah und Lob gebührt Ihm, gepriesen sei Allah, der Gewaltige.', en: 'Glory and praise be to Allah; glory be to Allah, the Almighty.' },
  { id: 'tahlil', tr: 'Allah’tan başka ilah yoktur; tektir, ortağı yoktur. Mülk O’nundur, hamd O’nadır ve O her şeye kadirdir.', ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', n: 10,
    de: 'Es gibt keinen Gott außer Allah, allein und ohne Teilhaber. Sein ist die Herrschaft und Sein das Lob, und Er hat Macht über alles.', en: 'There is no god but Allah alone, without partner. His is the dominion and His the praise, and He is over all things capable.' },
  { id: 'istighfar', tr: 'Allah’tan bağışlanma dilerim ve O’na tövbe ederim.', ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', n: 100,
    de: 'Ich bitte Allah um Vergebung und wende mich reumütig zu Ihm.', en: 'I seek the forgiveness of Allah and turn to Him in repentance.' },
  { id: 'hawqala', tr: 'Güç ve kuvvet ancak Allah’tandır.', ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', n: 0,
    de: 'Es gibt keine Macht und keine Kraft außer bei Allah.', en: 'There is no power and no strength except with Allah.' },
  { id: 'salawat', tr: 'Allah’ım, Peygamberimiz Muhammed’e salât ve selâm eyle.', ar: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ', n: 10,
    de: 'O Allah, segne und grüße unseren Propheten Muhammad.', en: 'O Allah, send blessings and peace upon our Prophet Muhammad.' },
  { id: 'hasbuna', tr: 'Allah bize yeter, O ne güzel vekildir.', ar: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', n: 0,
    de: 'Allah genügt uns, und Er ist der beste Sachwalter.', en: 'Allah is sufficient for us, and He is the best disposer of affairs.' },
  { id: 'tasbih33', tr: 'Sübhanallah (namazdan sonra 33 kez)', ar: 'سُبْحَانَ اللَّهِ', n: 33, de: 'Gepriesen sei Allah (nach dem Gebet 33-mal)', en: 'Glory be to Allah (33 times after prayer)' },
  { id: 'tahmid33', tr: 'Elhamdülillah (namazdan sonra 33 kez)', ar: 'الْحَمْدُ لِلَّهِ', n: 33, de: 'Alles Lob gebührt Allah (nach dem Gebet 33-mal)', en: 'All praise is due to Allah (33 times after prayer)' },
  { id: 'takbir33', tr: 'Allahu ekber (namazdan sonra 33 kez)', ar: 'اللَّهُ أَكْبَرُ', n: 33, de: 'Allah ist am größten (nach dem Gebet 33-mal)', en: 'Allah is the greatest (33 times after prayer)' },
];
// Dhikr des Tages: wechselt täglich unter den ersten sechs
export const dhikrOfDay = (d = new Date()) => ADHKAR[Math.floor(d.getTime() / 86400000) % 6];
export const meaning = (a, lang) => (lang === 'ar' ? '' : a[lang] || a.en);

// Feste Listen der App: Berechnungsmethoden, Farbvorlagen, Farbfelder
// Berechnungsmethoden von Aladhan: [id, arabisch, englisch]
export const METHODS = [
  [3, "رابطة العالم الإسلامي", "Muslim World League"], [4, "أم القرى، مكة المكرمة", "Umm al-Qura, Makkah"],
  [5, "الهيئة المصرية العامة للمساحة", "Egyptian General Authority of Survey"], [1, "جامعة العلوم الإسلامية، كراتشي", "University of Islamic Sciences, Karachi"],
  [2, "الجمعية الإسلامية لأمريكا الشمالية", "ISNA (North America)"], [7, "معهد الجيوفيزياء، جامعة طهران", "Institute of Geophysics, Tehran"],
  [0, "الشيعة الإثنا عشرية، قم", "Shia Ithna-Ashari, Qum"], [8, "منطقة الخليج", "Gulf Region"], [9, "الكويت", "Kuwait"], [10, "قطر", "Qatar"],
  [16, "دبي", "Dubai"], [11, "سنغافورة", "Singapore (MUIS)"], [12, "اتحاد المنظمات الإسلامية في فرنسا", "UOIF (France)"],
  [13, "رئاسة الشؤون الدينية التركية", "Diyanet (Türkiye)"], [14, "الإدارة الدينية لمسلمي روسيا", "Spiritual Administration of Muslims of Russia"],
  [15, "لجنة رؤية الهلال", "Moonsighting Committee"], [17, "ماليزيا (JAKIM)", "JAKIM (Malaysia)"], [18, "تونس", "Tunisia"],
  [19, "الجزائر", "Algeria"], [20, "إندونيسيا", "KEMENAG (Indonesia)"], [21, "المغرب", "Morocco"], [23, "الأردن", "Jordan"],
];
export const PRESETS = [
  ["preset_rosegold", "#FFFFFF", "#E9A27C", "#C4B6AE"],
  ["preset_gold", "#F4F1EA", "#C9A45C", "#8C978F"], ["preset_silver", "#FFFFFF", "#C3CAD3", "#8A929C"],
  ["preset_emerald", "#F1F5EC", "#6FC79A", "#869A8E"], ["preset_turquoise", "#EAF6F6", "#5EC4CC", "#86A0A3"],
  ["preset_amber", "#FFF4E6", "#E8A04E", "#A08E7C"],
];
export const LED_PRESETS = ["#FF0000", "#FF6A00", "#FFD000", "#00FF00", "#00FFB0", "#00C8FF", "#0000FF", "#A000FF", "#FF00A0", "#FFFFFF"];
// Passende Farbfelder je Rolle: Hauptschrift hell, Akzent kräftig, Nebenschrift gedämpft
export const THEME_SWATCHES = {
  main: ["#FFFFFF", "#F4F1EA", "#FFF4E6", "#FDEDEE", "#F1F5EC", "#EAF6F6", "#EEF0FF", "#E2E2E2"],
  accent: ["#E9A27C", "#C9A45C", "#E8A04E", "#FFD54F", "#6FC79A", "#4DB6AC", "#5EC4CC", "#6FA8F5", "#BA8CF0", "#F06292", "#E57373", "#C3CAD3"],
  muted: ["#C4B6AE", "#A08E7C", "#8C978F", "#869A8E", "#86A0A3", "#8A929C", "#B0A8C0", "#9E9E9E"],
};
export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
export const ALL_TIMES = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
export const MAX_ALARMS = 30; // die Uhr meldet ihre Höchstzahl als alarmsMax
export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Samstag zuerst; Bit = tm_wday

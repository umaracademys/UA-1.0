export type RevelationPlace = "Makkah" | "Madinah";

export interface SurahData {
  id: number;
  arabicName: string;
  englishName: string;
  transliteration: string;
  verseCount: number;
  startPage: number;
  revelationPlace: RevelationPlace;
}

export const SURAHS: SurahData[] = [
  { id: 1, arabicName: "الفاتحة", englishName: "Al-Fatihah", transliteration: "Al-Fatihah", verseCount: 7, startPage: 1, revelationPlace: "Makkah" },
  { id: 2, arabicName: "البقرة", englishName: "Al-Baqarah", transliteration: "Al-Baqarah", verseCount: 286, startPage: 2, revelationPlace: "Madinah" },
  { id: 3, arabicName: "آل عمران", englishName: "Aal Imran", transliteration: "Aal Imran", verseCount: 200, startPage: 50, revelationPlace: "Madinah" },
  { id: 4, arabicName: "النساء", englishName: "An-Nisa", transliteration: "An-Nisa", verseCount: 176, startPage: 77, revelationPlace: "Madinah" },
  { id: 5, arabicName: "المائدة", englishName: "Al-Maidah", transliteration: "Al-Maidah", verseCount: 120, startPage: 106, revelationPlace: "Madinah" },
  { id: 6, arabicName: "الأنعام", englishName: "Al-An'am", transliteration: "Al-An'am", verseCount: 165, startPage: 128, revelationPlace: "Makkah" },
  { id: 7, arabicName: "الأعراف", englishName: "Al-A'raf", transliteration: "Al-A'raf", verseCount: 206, startPage: 151, revelationPlace: "Makkah" },
  { id: 8, arabicName: "الأنفال", englishName: "Al-Anfal", transliteration: "Al-Anfal", verseCount: 75, startPage: 177, revelationPlace: "Madinah" },
  { id: 9, arabicName: "التوبة", englishName: "At-Tawbah", transliteration: "At-Tawbah", verseCount: 129, startPage: 187, revelationPlace: "Madinah" },
  { id: 10, arabicName: "يونس", englishName: "Yunus", transliteration: "Yunus", verseCount: 109, startPage: 208, revelationPlace: "Makkah" },
  { id: 11, arabicName: "هود", englishName: "Hud", transliteration: "Hud", verseCount: 123, startPage: 221, revelationPlace: "Makkah" },
  { id: 12, arabicName: "يوسف", englishName: "Yusuf", transliteration: "Yusuf", verseCount: 111, startPage: 235, revelationPlace: "Makkah" },
  { id: 13, arabicName: "الرعد", englishName: "Ar-Ra'd", transliteration: "Ar-Ra'd", verseCount: 43, startPage: 249, revelationPlace: "Madinah" },
  { id: 14, arabicName: "إبراهيم", englishName: "Ibrahim", transliteration: "Ibrahim", verseCount: 52, startPage: 255, revelationPlace: "Makkah" },
  { id: 15, arabicName: "الحجر", englishName: "Al-Hijr", transliteration: "Al-Hijr", verseCount: 99, startPage: 262, revelationPlace: "Makkah" },
  { id: 16, arabicName: "النحل", englishName: "An-Nahl", transliteration: "An-Nahl", verseCount: 128, startPage: 267, revelationPlace: "Makkah" },
  { id: 17, arabicName: "الإسراء", englishName: "Al-Isra", transliteration: "Al-Isra", verseCount: 111, startPage: 282, revelationPlace: "Makkah" },
  { id: 18, arabicName: "الكهف", englishName: "Al-Kahf", transliteration: "Al-Kahf", verseCount: 110, startPage: 293, revelationPlace: "Makkah" },
  { id: 19, arabicName: "مريم", englishName: "Maryam", transliteration: "Maryam", verseCount: 98, startPage: 305, revelationPlace: "Makkah" },
  { id: 20, arabicName: "طه", englishName: "Ta-Ha", transliteration: "Ta-Ha", verseCount: 135, startPage: 312, revelationPlace: "Makkah" },
  { id: 21, arabicName: "الأنبياء", englishName: "Al-Anbiya", transliteration: "Al-Anbiya", verseCount: 112, startPage: 322, revelationPlace: "Makkah" },
  { id: 22, arabicName: "الحج", englishName: "Al-Hajj", transliteration: "Al-Hajj", verseCount: 78, startPage: 332, revelationPlace: "Madinah" },
  { id: 23, arabicName: "المؤمنون", englishName: "Al-Mu'minun", transliteration: "Al-Mu'minun", verseCount: 118, startPage: 342, revelationPlace: "Makkah" },
  { id: 24, arabicName: "النور", englishName: "An-Nur", transliteration: "An-Nur", verseCount: 64, startPage: 350, revelationPlace: "Madinah" },
  { id: 25, arabicName: "الفرقان", englishName: "Al-Furqan", transliteration: "Al-Furqan", verseCount: 77, startPage: 359, revelationPlace: "Makkah" },
  { id: 26, arabicName: "الشعراء", englishName: "Ash-Shu'ara", transliteration: "Ash-Shu'ara", verseCount: 227, startPage: 367, revelationPlace: "Makkah" },
  { id: 27, arabicName: "النمل", englishName: "An-Naml", transliteration: "An-Naml", verseCount: 93, startPage: 377, revelationPlace: "Makkah" },
  { id: 28, arabicName: "القصص", englishName: "Al-Qasas", transliteration: "Al-Qasas", verseCount: 88, startPage: 385, revelationPlace: "Makkah" },
  { id: 29, arabicName: "العنكبوت", englishName: "Al-Ankabut", transliteration: "Al-Ankabut", verseCount: 69, startPage: 396, revelationPlace: "Makkah" },
  { id: 30, arabicName: "الروم", englishName: "Ar-Rum", transliteration: "Ar-Rum", verseCount: 60, startPage: 404, revelationPlace: "Makkah" },
  { id: 31, arabicName: "لقمان", englishName: "Luqman", transliteration: "Luqman", verseCount: 34, startPage: 411, revelationPlace: "Makkah" },
  { id: 32, arabicName: "السجدة", englishName: "As-Sajdah", transliteration: "As-Sajdah", verseCount: 30, startPage: 415, revelationPlace: "Makkah" },
  { id: 33, arabicName: "الأحزاب", englishName: "Al-Ahzab", transliteration: "Al-Ahzab", verseCount: 73, startPage: 418, revelationPlace: "Madinah" },
  { id: 34, arabicName: "سبأ", englishName: "Saba", transliteration: "Saba", verseCount: 54, startPage: 428, revelationPlace: "Makkah" },
  { id: 35, arabicName: "فاطر", englishName: "Fatir", transliteration: "Fatir", verseCount: 45, startPage: 434, revelationPlace: "Makkah" },
  { id: 36, arabicName: "يس", englishName: "Ya-Sin", transliteration: "Ya-Sin", verseCount: 83, startPage: 440, revelationPlace: "Makkah" },
  { id: 37, arabicName: "الصافات", englishName: "As-Saffat", transliteration: "As-Saffat", verseCount: 182, startPage: 446, revelationPlace: "Makkah" },
  { id: 38, arabicName: "ص", englishName: "Sad", transliteration: "Sad", verseCount: 88, startPage: 453, revelationPlace: "Makkah" },
  { id: 39, arabicName: "الزمر", englishName: "Az-Zumar", transliteration: "Az-Zumar", verseCount: 75, startPage: 458, revelationPlace: "Makkah" },
  { id: 40, arabicName: "غافر", englishName: "Ghafir", transliteration: "Ghafir", verseCount: 85, startPage: 467, revelationPlace: "Makkah" },
  { id: 41, arabicName: "فصلت", englishName: "Fussilat", transliteration: "Fussilat", verseCount: 54, startPage: 477, revelationPlace: "Makkah" },
  { id: 42, arabicName: "الشورى", englishName: "Ash-Shura", transliteration: "Ash-Shura", verseCount: 53, startPage: 483, revelationPlace: "Makkah" },
  { id: 43, arabicName: "الزخرف", englishName: "Az-Zukhruf", transliteration: "Az-Zukhruf", verseCount: 89, startPage: 489, revelationPlace: "Makkah" },
  { id: 44, arabicName: "الدخان", englishName: "Ad-Dukhan", transliteration: "Ad-Dukhan", verseCount: 59, startPage: 496, revelationPlace: "Makkah" },
  { id: 45, arabicName: "الجاثية", englishName: "Al-Jathiyah", transliteration: "Al-Jathiyah", verseCount: 37, startPage: 499, revelationPlace: "Makkah" },
  { id: 46, arabicName: "الأحقاف", englishName: "Al-Ahqaf", transliteration: "Al-Ahqaf", verseCount: 35, startPage: 502, revelationPlace: "Makkah" },
  { id: 47, arabicName: "محمد", englishName: "Muhammad", transliteration: "Muhammad", verseCount: 38, startPage: 507, revelationPlace: "Madinah" },
  { id: 48, arabicName: "الفتح", englishName: "Al-Fath", transliteration: "Al-Fath", verseCount: 29, startPage: 511, revelationPlace: "Madinah" },
  { id: 49, arabicName: "الحجرات", englishName: "Al-Hujurat", transliteration: "Al-Hujurat", verseCount: 18, startPage: 515, revelationPlace: "Madinah" },
  { id: 50, arabicName: "ق", englishName: "Qaf", transliteration: "Qaf", verseCount: 45, startPage: 518, revelationPlace: "Makkah" },
  { id: 51, arabicName: "الذاريات", englishName: "Adh-Dhariyat", transliteration: "Adh-Dhariyat", verseCount: 60, startPage: 520, revelationPlace: "Makkah" },
  { id: 52, arabicName: "الطور", englishName: "At-Tur", transliteration: "At-Tur", verseCount: 49, startPage: 523, revelationPlace: "Makkah" },
  { id: 53, arabicName: "النجم", englishName: "An-Najm", transliteration: "An-Najm", verseCount: 62, startPage: 526, revelationPlace: "Makkah" },
  { id: 54, arabicName: "القمر", englishName: "Al-Qamar", transliteration: "Al-Qamar", verseCount: 55, startPage: 528, revelationPlace: "Makkah" },
  { id: 55, arabicName: "الرحمن", englishName: "Ar-Rahman", transliteration: "Ar-Rahman", verseCount: 78, startPage: 531, revelationPlace: "Madinah" },
  { id: 56, arabicName: "الواقعة", englishName: "Al-Waqi'ah", transliteration: "Al-Waqi'ah", verseCount: 96, startPage: 534, revelationPlace: "Makkah" },
  { id: 57, arabicName: "الحديد", englishName: "Al-Hadid", transliteration: "Al-Hadid", verseCount: 29, startPage: 537, revelationPlace: "Madinah" },
  { id: 58, arabicName: "المجادلة", englishName: "Al-Mujadilah", transliteration: "Al-Mujadilah", verseCount: 22, startPage: 542, revelationPlace: "Madinah" },
  { id: 59, arabicName: "الحشر", englishName: "Al-Hashr", transliteration: "Al-Hashr", verseCount: 24, startPage: 545, revelationPlace: "Madinah" },
  { id: 60, arabicName: "الممتحنة", englishName: "Al-Mumtahanah", transliteration: "Al-Mumtahanah", verseCount: 13, startPage: 549, revelationPlace: "Madinah" },
  { id: 61, arabicName: "الصف", englishName: "As-Saff", transliteration: "As-Saff", verseCount: 14, startPage: 551, revelationPlace: "Madinah" },
  { id: 62, arabicName: "الجمعة", englishName: "Al-Jumu'ah", transliteration: "Al-Jumu'ah", verseCount: 11, startPage: 553, revelationPlace: "Madinah" },
  { id: 63, arabicName: "المنافقون", englishName: "Al-Munafiqun", transliteration: "Al-Munafiqun", verseCount: 11, startPage: 554, revelationPlace: "Madinah" },
  { id: 64, arabicName: "التغابن", englishName: "At-Taghabun", transliteration: "At-Taghabun", verseCount: 18, startPage: 556, revelationPlace: "Madinah" },
  { id: 65, arabicName: "الطلاق", englishName: "At-Talaq", transliteration: "At-Talaq", verseCount: 12, startPage: 558, revelationPlace: "Madinah" },
  { id: 66, arabicName: "التحريم", englishName: "At-Tahrim", transliteration: "At-Tahrim", verseCount: 12, startPage: 560, revelationPlace: "Madinah" },
  { id: 67, arabicName: "الملك", englishName: "Al-Mulk", transliteration: "Al-Mulk", verseCount: 30, startPage: 562, revelationPlace: "Makkah" },
  { id: 68, arabicName: "القلم", englishName: "Al-Qalam", transliteration: "Al-Qalam", verseCount: 52, startPage: 564, revelationPlace: "Makkah" },
  { id: 69, arabicName: "الحاقة", englishName: "Al-Haqqah", transliteration: "Al-Haqqah", verseCount: 52, startPage: 566, revelationPlace: "Makkah" },
  { id: 70, arabicName: "المعارج", englishName: "Al-Ma'arij", transliteration: "Al-Ma'arij", verseCount: 44, startPage: 568, revelationPlace: "Makkah" },
  { id: 71, arabicName: "نوح", englishName: "Nuh", transliteration: "Nuh", verseCount: 28, startPage: 570, revelationPlace: "Makkah" },
  { id: 72, arabicName: "الجن", englishName: "Al-Jinn", transliteration: "Al-Jinn", verseCount: 28, startPage: 572, revelationPlace: "Makkah" },
  { id: 73, arabicName: "المزمل", englishName: "Al-Muzzammil", transliteration: "Al-Muzzammil", verseCount: 20, startPage: 574, revelationPlace: "Makkah" },
  { id: 74, arabicName: "المدثر", englishName: "Al-Muddaththir", transliteration: "Al-Muddaththir", verseCount: 56, startPage: 575, revelationPlace: "Makkah" },
  { id: 75, arabicName: "القيامة", englishName: "Al-Qiyamah", transliteration: "Al-Qiyamah", verseCount: 40, startPage: 577, revelationPlace: "Makkah" },
  { id: 76, arabicName: "الإنسان", englishName: "Al-Insan", transliteration: "Al-Insan", verseCount: 31, startPage: 578, revelationPlace: "Madinah" },
  { id: 77, arabicName: "المرسلات", englishName: "Al-Mursalat", transliteration: "Al-Mursalat", verseCount: 50, startPage: 580, revelationPlace: "Makkah" },
  { id: 78, arabicName: "النبأ", englishName: "An-Naba", transliteration: "An-Naba", verseCount: 40, startPage: 582, revelationPlace: "Makkah" },
  { id: 79, arabicName: "النازعات", englishName: "An-Nazi'at", transliteration: "An-Nazi'at", verseCount: 46, startPage: 583, revelationPlace: "Makkah" },
  { id: 80, arabicName: "عبس", englishName: "Abasa", transliteration: "Abasa", verseCount: 42, startPage: 585, revelationPlace: "Makkah" },
  { id: 81, arabicName: "التكوير", englishName: "At-Takwir", transliteration: "At-Takwir", verseCount: 29, startPage: 586, revelationPlace: "Makkah" },
  { id: 82, arabicName: "الانفطار", englishName: "Al-Infitar", transliteration: "Al-Infitar", verseCount: 19, startPage: 587, revelationPlace: "Makkah" },
  { id: 83, arabicName: "المطففين", englishName: "Al-Mutaffifin", transliteration: "Al-Mutaffifin", verseCount: 36, startPage: 588, revelationPlace: "Makkah" },
  { id: 84, arabicName: "الانشقاق", englishName: "Al-Inshiqaq", transliteration: "Al-Inshiqaq", verseCount: 25, startPage: 590, revelationPlace: "Makkah" },
  { id: 85, arabicName: "البروج", englishName: "Al-Buruj", transliteration: "Al-Buruj", verseCount: 22, startPage: 591, revelationPlace: "Makkah" },
  { id: 86, arabicName: "الطارق", englishName: "At-Tariq", transliteration: "At-Tariq", verseCount: 17, startPage: 592, revelationPlace: "Makkah" },
  { id: 87, arabicName: "الأعلى", englishName: "Al-A'la", transliteration: "Al-A'la", verseCount: 19, startPage: 593, revelationPlace: "Makkah" },
  { id: 88, arabicName: "الغاشية", englishName: "Al-Ghashiyah", transliteration: "Al-Ghashiyah", verseCount: 26, startPage: 594, revelationPlace: "Makkah" },
  { id: 89, arabicName: "الفجر", englishName: "Al-Fajr", transliteration: "Al-Fajr", verseCount: 30, startPage: 595, revelationPlace: "Makkah" },
  { id: 90, arabicName: "البلد", englishName: "Al-Balad", transliteration: "Al-Balad", verseCount: 20, startPage: 596, revelationPlace: "Makkah" },
  { id: 91, arabicName: "الشمس", englishName: "Ash-Shams", transliteration: "Ash-Shams", verseCount: 15, startPage: 597, revelationPlace: "Makkah" },
  { id: 92, arabicName: "الليل", englishName: "Al-Layl", transliteration: "Al-Layl", verseCount: 21, startPage: 597, revelationPlace: "Makkah" },
  { id: 93, arabicName: "الضحى", englishName: "Ad-Duha", transliteration: "Ad-Duha", verseCount: 11, startPage: 598, revelationPlace: "Makkah" },
  { id: 94, arabicName: "الشرح", englishName: "Ash-Sharh", transliteration: "Ash-Sharh", verseCount: 8, startPage: 599, revelationPlace: "Makkah" },
  { id: 95, arabicName: "التين", englishName: "At-Tin", transliteration: "At-Tin", verseCount: 8, startPage: 599, revelationPlace: "Makkah" },
  { id: 96, arabicName: "العلق", englishName: "Al-Alaq", transliteration: "Al-Alaq", verseCount: 19, startPage: 600, revelationPlace: "Makkah" },
  { id: 97, arabicName: "القدر", englishName: "Al-Qadr", transliteration: "Al-Qadr", verseCount: 5, startPage: 600, revelationPlace: "Makkah" },
  { id: 98, arabicName: "البينة", englishName: "Al-Bayyinah", transliteration: "Al-Bayyinah", verseCount: 8, startPage: 601, revelationPlace: "Madinah" },
  { id: 99, arabicName: "الزلزلة", englishName: "Az-Zalzalah", transliteration: "Az-Zalzalah", verseCount: 8, startPage: 601, revelationPlace: "Madinah" },
  { id: 100, arabicName: "العاديات", englishName: "Al-Adiyat", transliteration: "Al-Adiyat", verseCount: 11, startPage: 602, revelationPlace: "Makkah" },
  { id: 101, arabicName: "القارعة", englishName: "Al-Qari'ah", transliteration: "Al-Qari'ah", verseCount: 11, startPage: 602, revelationPlace: "Makkah" },
  { id: 102, arabicName: "التكاثر", englishName: "At-Takathur", transliteration: "At-Takathur", verseCount: 8, startPage: 603, revelationPlace: "Makkah" },
  { id: 103, arabicName: "العصر", englishName: "Al-Asr", transliteration: "Al-Asr", verseCount: 3, startPage: 603, revelationPlace: "Makkah" },
  { id: 104, arabicName: "الهمزة", englishName: "Al-Humazah", transliteration: "Al-Humazah", verseCount: 9, startPage: 603, revelationPlace: "Makkah" },
  { id: 105, arabicName: "الفيل", englishName: "Al-Fil", transliteration: "Al-Fil", verseCount: 5, startPage: 604, revelationPlace: "Makkah" },
  { id: 106, arabicName: "قريش", englishName: "Quraysh", transliteration: "Quraysh", verseCount: 4, startPage: 604, revelationPlace: "Makkah" },
  { id: 107, arabicName: "الماعون", englishName: "Al-Ma'un", transliteration: "Al-Ma'un", verseCount: 7, startPage: 604, revelationPlace: "Makkah" },
  { id: 108, arabicName: "الكوثر", englishName: "Al-Kawthar", transliteration: "Al-Kawthar", verseCount: 3, startPage: 604, revelationPlace: "Makkah" },
  { id: 109, arabicName: "الكافرون", englishName: "Al-Kafirun", transliteration: "Al-Kafirun", verseCount: 6, startPage: 604, revelationPlace: "Makkah" },
  { id: 110, arabicName: "النصر", englishName: "An-Nasr", transliteration: "An-Nasr", verseCount: 3, startPage: 604, revelationPlace: "Madinah" },
  { id: 111, arabicName: "المسد", englishName: "Al-Masad", transliteration: "Al-Masad", verseCount: 5, startPage: 604, revelationPlace: "Makkah" },
  { id: 112, arabicName: "الإخلاص", englishName: "Al-Ikhlas", transliteration: "Al-Ikhlas", verseCount: 4, startPage: 604, revelationPlace: "Makkah" },
  { id: 113, arabicName: "الفلق", englishName: "Al-Falaq", transliteration: "Al-Falaq", verseCount: 5, startPage: 604, revelationPlace: "Makkah" },
  { id: 114, arabicName: "الناس", englishName: "An-Nas", transliteration: "An-Nas", verseCount: 6, startPage: 604, revelationPlace: "Makkah" },
];

export function getSurahByPage(page: number): SurahData | undefined {
  return SURAHS.find((surah) => {
    const nextSurah = SURAHS.find((s) => s.startPage > page);
    if (nextSurah) {
      return surah.startPage <= page && page < nextSurah.startPage;
    }
    return surah.startPage <= page;
  });
}

export function getSurahById(id: number): SurahData | undefined {
  return SURAHS.find((surah) => surah.id === id);
}

import type { Language } from "../types";

interface CountryMetadata {
  code: string;
  en: string;
  ar: string;
}

const countries = {
  EG: { code: "EG", en: "Egypt", ar: "مصر" },
  KW: { code: "KW", en: "Kuwait", ar: "الكويت" },
  SA: { code: "SA", en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
} satisfies Record<string, CountryMetadata>;

type CountryCode = keyof typeof countries;

export const featuredReciters = [
  { id: 92, nameEn: "Yasser Al-Dosari", nameAr: "ياسر الدوسري" },
  { id: 30, nameEn: "Saad Al-Ghamdi", nameAr: "سعد الغامدي" },
  { id: 54, nameEn: "Abdul Rahman Al-Sudais", nameAr: "عبد الرحمن السديس" },
  { id: 74, nameEn: "Ali Al-Hudhaify", nameAr: "علي الحذيفي" },
  { id: 217, nameEn: "Sheikh Bandar Baleelah", nameAr: "الشيخ بندر بليلة" },
  { id: 51, nameEn: "Abdul Basit Abdus Samad", nameAr: "عبد الباسط عبد الصمد" },
  { id: 123, nameEn: "Mishary Rashid Alafasy", nameAr: "مشاري راشد العفاسي" },
] as const;

const countryByReciterId: Partial<Record<number, CountryCode>> = {
  30: "SA",
  51: "EG",
  54: "SA",
  74: "SA",
  92: "SA",
  123: "KW",
  217: "SA",
};

export function getReciterCountry(reciterId: number, language: Language) {
  const code = countryByReciterId[reciterId];
  if (!code) return null;
  const country = countries[code];
  return { code: code.toLowerCase(), name: country[language] };
}

import type { Language } from "../types";

interface CountryMetadata {
  code: string;
  en: string;
  ar: string;
}

const countries = {
  AE: { code: "AE", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
  EG: { code: "EG", en: "Egypt", ar: "مصر" },
  ID: { code: "ID", en: "Indonesia", ar: "إندونيسيا" },
  IQ: { code: "IQ", en: "Iraq", ar: "العراق" },
  KW: { code: "KW", en: "Kuwait", ar: "الكويت" },
  MA: { code: "MA", en: "Morocco", ar: "المغرب" },
  OM: { code: "OM", en: "Oman", ar: "عُمان" },
  SA: { code: "SA", en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
  SD: { code: "SD", en: "Sudan", ar: "السودان" },
  SO: { code: "SO", en: "Somalia", ar: "الصومال" },
  YE: { code: "YE", en: "Yemen", ar: "اليمن" },
} satisfies Record<string, CountryMetadata>;

type CountryCode = keyof typeof countries;

// MP3Quran reciter IDs. The core entries are cross-checked against Quran Lab's
// sourced reciter metadata; additional entries were verified from public
// biographies. Unknown or ambiguous identities intentionally have no entry.
const countryByReciterId: Partial<Record<number, CountryCode>> = {
  1: "SA",
  4: "SA",
  5: "SA",
  9: "EG",
  12: "SA",
  13: "SD",
  20: "SA",
  21: "SA",
  24: "AE",
  30: "SA",
  31: "SA",
  32: "KW",
  43: "SA",
  46: "AE",
  51: "EG",
  54: "SA",
  59: "SA",
  60: "SA",
  62: "SA",
  64: "SO",
  67: "SA",
  74: "SA",
  76: "SA",
  77: "EG",
  80: "MA",
  81: "YE",
  86: "SA",
  89: "SA",
  92: "SA",
  102: "SA",
  106: "EG",
  109: "SA",
  111: "EG",
  112: "EG",
  118: "EG",
  121: "EG",
  123: "KW",
  125: "EG",
  128: "ID",
  138: "SD",
  152: "EG",
  178: "SA",
  217: "SA",
  221: "IQ",
  231: "OM",
  241: "EG",
  245: "SA",
  253: "EG",
};

export function getReciterCountry(reciterId: number, language: Language) {
  const code = countryByReciterId[reciterId];
  if (!code) return null;
  const country = countries[code];
  return { code: code.toLowerCase(), name: country[language] };
}

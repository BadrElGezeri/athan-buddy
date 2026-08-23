import type { Moshaf, PrayerDay, PrayerName, PrayerTiming } from "../types";

export const PRAYERS: PrayerName[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export function getTodayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getNextPrayer(days: PrayerDay[], now = new Date()): PrayerTiming | null {
  const all = days.flatMap((day) => day.timings);
  return all.find((prayer) => new Date(prayer.iso).getTime() > now.getTime()) ?? null;
}

export function formatCountdown(targetIso: string, now = new Date()): string {
  const remaining = Math.max(0, new Date(targetIso).getTime() - now.getTime());
  const totalMinutes = Math.floor(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime(iso: string, language: "en" | "ar"): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function buildSurahAudioUrl(moshaf: Moshaf, surahId: number): string {
  const separator = moshaf.server.endsWith("/") ? "" : "/";
  return `${moshaf.server}${separator}${String(surahId).padStart(3, "0")}.mp3`;
}

export function availableSurahs(moshaf: Moshaf): Set<number> {
  return new Set(
    moshaf.surah_list
      .split(",")
      .map((id) => Number(id.trim()))
      .filter(Number.isFinite),
  );
}

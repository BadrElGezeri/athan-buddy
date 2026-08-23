export type Language = "en" | "ar";
export type Theme = "light" | "dark";
export type NotificationMode = "adhan" | "sound" | "silent";
export type LocationMode = "precise" | "ip" | "manual";
export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface CoordinatesLocation {
  type: "coordinates";
  source: "precise" | "ip";
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface CityLocation {
  type: "city";
  source: "manual";
  city: string;
  country: string;
}

export type UserLocation = CoordinatesLocation | CityLocation;

export interface Settings {
  language: Language | null;
  theme: Theme | null;
  calculationMethod: number | null;
  calculationMethodName: string | null;
  school: 0 | 1 | null;
  locationMode: LocationMode | null;
  location: UserLocation | null;
  notificationMode: NotificationMode;
  reminderEnabled: boolean;
  reminderMinutes: number;
  snoozeMinutes: 5 | 10 | 15;
  adhanVolume: number;
  sidebarCollapsed: boolean;
  autoCheckUpdates: boolean;
  launchAtStartup: boolean;
  onboardingComplete: boolean;
}

export interface PrayerLogEntry {
  prayed: boolean;
  loggedAt: string;
}

export type PrayerLogs = Record<string, Partial<Record<PrayerName, PrayerLogEntry>>>;

export interface AppState {
  settings: Settings;
  prayerLogs: PrayerLogs;
  prayerStreak: {
    current: number;
    best: number;
    breakAt: string | null;
  };
  quran: {
    reciterId: number | null;
    moshafId: number | null;
    surahId: number;
    volume: number;
    muted: boolean;
    positionSeconds: number;
  };
}

export interface CalculationMethod {
  id: number;
  name: string;
}

export interface PrayerTiming {
  name: PrayerName;
  time: string;
  iso: string;
}

export interface PrayerDay {
  dateKey: string;
  readableDate: string;
  hijriDate: string;
  hijriDateAr: string;
  timezone: string;
  methodName: string;
  timings: PrayerTiming[];
}

export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  surah_list: string;
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface Surah {
  id: number;
  name: string;
  start_page?: number;
  end_page?: number;
  makkia?: number;
}

export interface AyahTiming {
  ayah: number;
  startTime: number;
  endTime: number;
}

export type UpdatePhase = "idle" | "checking" | "available" | "up-to-date" | "error" | "unavailable";

export interface UpdateStatus {
  phase: UpdatePhase;
  currentVersion: string;
  availableVersion?: string;
  releaseNotes?: string;
  releaseUrl?: string;
  error?: string;
  lastCheckedAt?: string;
}

export interface AthanBuddyBridge {
  getState(): Promise<AppState>;
  updateSettings(settings: Partial<Settings>): Promise<AppState>;
  updateQuran(quran: Partial<AppState["quran"]>): Promise<AppState>;
  togglePrayer(dateKey: string, prayer: PrayerName): Promise<AppState>;
  getCalculationMethods(): Promise<CalculationMethod[]>;
  fetchPrayerDays(settings: Settings): Promise<PrayerDay[]>;
  detectIpLocation(): Promise<CoordinatesLocation>;
  reverseLocation(latitude: number, longitude: number): Promise<CoordinatesLocation>;
  getReciters(language: Language): Promise<Reciter[]>;
  getSurahs(language: Language): Promise<Surah[]>;
  getAyahTimings(server: string, surahId: number): Promise<AyahTiming[]>;
  setStartup(enabled: boolean): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<UpdateStatus>;
  openUpdateRelease(): Promise<void>;
  testAlert(mode: NotificationMode): Promise<void>;
  onPrayerAlert(callback: (mode: NotificationMode) => void): () => void;
  onStreakCelebration(callback: (celebration: { count: number }) => void): () => void;
  onStateChanged(callback: (state: AppState) => void): () => void;
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void;
}

declare global {
  interface Window {
    athanBuddy: AthanBuddyBridge;
  }
}

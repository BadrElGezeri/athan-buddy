import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppState, NotificationMode, PrayerDay, UpdateStatus } from "./types";
import { Shell, type AppPage } from "./components/Shell";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Quran } from "./pages/Quran";
import { Settings } from "./pages/Settings";
import { UpdatePrompt } from "./components/UpdatePrompt";

const ADHAN_URL = "https://cdn.aladhan.com/audio/adhans/a9.mp3";

function playShortSound() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.15);
  gain.connect(context.destination);

  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.16);
    oscillator.stop(context.currentTime + 0.72 + index * 0.16);
  });
  window.setTimeout(() => context.close(), 1500);
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<AppPage>("home");
  const [prayerDays, setPrayerDays] = useState<PrayerDay[]>([]);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ phase: "idle", currentVersion: "" });
  const [dismissedUpdate, setDismissedUpdate] = useState<string | null>(null);
  const adhanAudio = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<AppState | null>(null);

  useEffect(() => {
    window.athanBuddy.getState().then(setState);
    return window.athanBuddy.onStateChanged(setState);
  }, []);

  useEffect(() => {
    window.athanBuddy.getUpdateStatus().then(setUpdateStatus);
    return window.athanBuddy.onUpdateStatus(setUpdateStatus);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stop = window.athanBuddy.onPrayerAlert((mode: NotificationMode) => {
      document.querySelectorAll("audio").forEach((audio) => audio.pause());
      if (mode === "sound") playShortSound();
      if (mode === "adhan") {
        if (!adhanAudio.current) adhanAudio.current = new Audio(ADHAN_URL);
        adhanAudio.current.volume = stateRef.current?.settings.adhanVolume ?? 0.8;
        adhanAudio.current.currentTime = 0;
        adhanAudio.current.play().catch(console.error);
      }
    });
    return stop;
  }, []);

  const prayerConfigurationKey = state
    ? JSON.stringify([
        state.settings.onboardingComplete,
        state.settings.calculationMethod,
        state.settings.school,
        state.settings.location,
      ])
    : "";

  const refreshPrayerDays = useCallback(async () => {
    if (!state?.settings.onboardingComplete) return;
    setPrayerLoading(true);
    setPrayerError(null);
    try {
      setPrayerDays(await window.athanBuddy.fetchPrayerDays(state.settings));
    } catch (error) {
      setPrayerError(error instanceof Error ? error.message : "Unable to load prayer times");
    } finally {
      setPrayerLoading(false);
    }
  }, [prayerConfigurationKey]);

  useEffect(() => {
    refreshPrayerDays();
  }, [refreshPrayerDays]);

  const language = state?.settings.language ?? "en";
  const theme = state?.settings.theme ?? "light";
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
  }, [language, theme]);

  const content = useMemo(() => {
    if (!state) return null;
    const common = { state, setState, language };
    if (page === "history") return <History {...common} />;
    if (page === "quran") return <Quran {...common} />;
    if (page === "settings") {
      return <Settings {...common} updateStatus={updateStatus} onPrayerSettingsChanged={refreshPrayerDays} />;
    }
    return (
      <Dashboard
        {...common}
        days={prayerDays}
        loading={prayerLoading}
        error={prayerError}
        onRetry={refreshPrayerDays}
      />
    );
  }, [state, page, language, prayerDays, prayerLoading, prayerError, refreshPrayerDays, updateStatus]);

  if (!state) {
    return (
      <main className="boot-screen" aria-label="Loading Athan Buddy">
        <img src="./assets/brand/athan-buddy-mark.png" alt="" />
        <span className="boot-line" />
      </main>
    );
  }

  if (!state.settings.onboardingComplete) {
    return <Onboarding state={state} onComplete={setState} />;
  }

  return (
    <Shell state={state} page={page} onNavigate={setPage}>
      {content}
      <UpdatePrompt
        status={updateStatus}
        language={language}
        dismissedVersion={dismissedUpdate}
        onLater={() => setDismissedUpdate(updateStatus.availableVersion ?? null)}
        onDownload={() => window.athanBuddy.downloadUpdate()}
        onInstall={() => window.athanBuddy.installUpdate()}
      />
    </Shell>
  );
}

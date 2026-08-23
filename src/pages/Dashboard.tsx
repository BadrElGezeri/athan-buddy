import { useEffect, useMemo, useState } from "react";
import { Check, ClockCountdown, MapPin, SealCheck, WarningCircle } from "@phosphor-icons/react";
import type { AppState, Language, PrayerDay } from "../types";
import { createTranslator, prayerNames } from "../i18n";
import { formatCountdown, formatTime, getNextPrayer, getTodayKey } from "../lib/prayers";
import { PrimaryButton } from "../components/Controls";

interface DashboardProps {
  state: AppState;
  setState(state: AppState): void;
  language: Language;
  days: PrayerDay[];
  loading: boolean;
  error: string | null;
  onRetry(): void;
}

export function Dashboard({ state, setState, language, days, loading, error, onRetry }: DashboardProps) {
  const t = createTranslator(language);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const today = days.find((day) => day.dateKey === getTodayKey()) ?? days[0];
  const next = getNextPrayer(days, now);
  const nextName = next ? prayerNames[language][next.name] : "";
  const location = state.settings.location;
  const locationLabel = location
    ? location.type === "city"
      ? `${location.city}, ${location.country}`
      : [location.city, location.country].filter(Boolean).join(", ") || t("precise")
    : "";

  const progress = useMemo(() => {
    if (!today || !next) return 0;
    const index = today.timings.findIndex((prayer) => prayer.name === next.name);
    return Math.max(8, Math.min(92, ((index < 0 ? 5 : index + 0.3) / 5) * 100));
  }, [today, next]);

  const localizedGregorianDate = today
    ? new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(`${today.dateKey}T12:00:00`))
    : "";

  async function togglePrayer(prayer: (typeof today.timings)[number]["name"]) {
    if (!today) return;
    setState(await window.athanBuddy.togglePrayer(today.dateKey, prayer));
  }

  if (loading && days.length === 0) {
    return (
      <div className="page dashboard-page">
        <div className="skeleton hero-skeleton" />
        <div className="skeleton row-skeleton" />
        <div className="skeleton row-skeleton" />
      </div>
    );
  }

  if (error && days.length === 0) {
    return (
      <div className="page centered-state">
        <WarningCircle size={42} weight="duotone" />
        <h1>{t("prayerLoadError")}</h1>
        <p>{error}</p>
        <PrimaryButton onClick={onRetry}>{t("retry")}</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <header className="page-topbar">
        <div>
          <p className="date-line">{localizedGregorianDate}</p>
          <p className="hijri-line">{language === "ar" ? today?.hijriDateAr : today?.hijriDate}</p>
        </div>
        <div className="location-chip"><MapPin size={17} weight="fill" /> {locationLabel}</div>
      </header>

      <section className="next-prayer-panel" aria-live="polite">
        <div className="next-copy">
          <span className="next-label"><ClockCountdown size={19} /> {t("nextPrayer")}</span>
          <h1>{nextName || t("refreshing")}</h1>
          {next && (
            <div className="countdown-line">
              <strong>{formatTime(next.iso, language)}</strong>
              <span>{t("in")} <b>{formatCountdown(next.iso, now)}</b></span>
            </div>
          )}
        </div>
        <div className="prayer-horizon" aria-hidden="true">
          <div className="horizon-arc" />
          <span className="horizon-marker" style={{ insetInlineStart: `${progress}%` }} />
          <div className="horizon-caption">
            <span>{prayerNames[language].Fajr}</span>
            <span>{prayerNames[language].Isha}</span>
          </div>
        </div>
      </section>

      <section className="prayer-section">
        <div className="section-heading">
          <div>
            <h2>{t("todayPrayers")}</h2>
            <p>{today?.methodName}</p>
          </div>
          {loading && <span className="quiet-status">{t("refreshing")}</span>}
        </div>

        <div className="prayer-list">
          {today?.timings.map((prayer) => {
            const logged = state.prayerLogs[today.dateKey]?.[prayer.name]?.prayed === true;
            const upcoming = next?.name === prayer.name && next.iso === prayer.iso;
            const canLog = logged || new Date(prayer.iso).getTime() <= now.getTime();
            return (
              <article className={`prayer-row ${upcoming ? "upcoming" : ""} ${logged ? "complete" : ""}`} key={prayer.name}>
                <div className="prayer-state-icon">
                  {logged ? <SealCheck size={24} weight="fill" /> : <span>{today.timings.indexOf(prayer) + 1}</span>}
                </div>
                <div className="prayer-name-block">
                  <strong>{prayerNames[language][prayer.name]}</strong>
                  <span>{logged ? t("prayed") : upcoming ? t("nextPrayer") : t("notYet")}</span>
                </div>
                <time>{formatTime(prayer.iso, language)}</time>
                <button
                  className={logged ? "log-button logged" : "log-button"}
                  disabled={!canLog}
                  title={!canLog ? t("prayerNotStarted") : undefined}
                  onClick={() => togglePrayer(prayer.name)}
                >
                  {logged && <Check size={17} weight="bold" />}
                  {logged ? t("prayed") : canLog ? t("markPrayed") : t("notYet")}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

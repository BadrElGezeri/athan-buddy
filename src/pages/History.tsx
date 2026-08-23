import { useEffect, useMemo, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight, Check } from "@phosphor-icons/react";
import type { AppState, Language, PrayerDay, PrayerName } from "../types";
import { createTranslator, prayerNames } from "../i18n";
import { PRAYERS } from "../lib/prayers";

const PAGE_SIZE = 7;

export function History({ state, setState, language, days }: { state: AppState; setState(state: AppState): void; language: Language; days: PrayerDay[] }) {
  const t = createTranslator(language);
  const [pageOffset, setPageOffset] = useState(0);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const dates = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - pageOffset * PAGE_SIZE - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key };
  }), [pageOffset]);
  const total = dates.reduce(
    (sum, day) => sum + PRAYERS.filter((prayer) => state.prayerLogs[day.key]?.[prayer]?.prayed).length,
    0,
  );
  const dateFormatter = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const rangeLabel = `${dateFormatter.format(dates[dates.length - 1].date)} — ${dateFormatter.format(dates[0].date)}`;

  async function toggle(dateKey: string, prayer: PrayerName) {
    setState(await window.athanBuddy.togglePrayer(dateKey, prayer));
  }

  return (
    <div className="page history-page">
      <header className="page-heading">
        <div>
          <h1>{t("historyTitle")}</h1>
          <p>{t("historyBody")}</p>
        </div>
        <div className="prayer-streak" title={t("prayerStreakLabel", { count: state.prayerStreak.current })} aria-label={t("prayerStreakLabel", { count: state.prayerStreak.current })}>
          <span aria-hidden="true">🔥</span>
          <strong>{state.prayerStreak.current}</strong>
        </div>
      </header>

      <section className="week-summary">
        <div>
          <span>{rangeLabel}</span>
          <strong>{total}<small>/35</small></strong>
        </div>
        <div className="week-summary-side">
          <div className="week-cells" aria-hidden="true">
            {dates.slice().reverse().map((day) => {
              const count = PRAYERS.filter((prayer) => state.prayerLogs[day.key]?.[prayer]?.prayed).length;
              return <span key={day.key} style={{ opacity: 0.18 + count * 0.16 }} />;
            })}
          </div>
          <div className="week-navigation" aria-label={t("historyRange")}>
            <button onClick={() => setPageOffset((current) => current + 1)} aria-label={t("olderWeek")} title={t("olderWeek")}>
              <CaretLeft size={18} weight="bold" />
            </button>
            <button disabled={pageOffset === 0} onClick={() => setPageOffset((current) => Math.max(0, current - 1))} aria-label={t("newerWeek")} title={t("newerWeek")}>
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {total === 0 ? (
        <section className="empty-state">
          <CalendarBlank size={44} weight="duotone" />
          <h2>{t("noLogsInRange")}</h2>
          <p>{t("noLogsRangeBody")}</p>
        </section>
      ) : (
        <section className="history-list">
          {dates.map(({ date, key }) => (
            <article className="history-day" key={key}>
              <div className="history-date">
                <strong>{new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { weekday: "short" }).format(date)}</strong>
                <span>{new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }).format(date)}</span>
              </div>
              <div className="history-prayers">
                {PRAYERS.map((prayer) => {
                  const logged = state.prayerLogs[key]?.[prayer]?.prayed === true;
                  const timing = days.find((day) => day.dateKey === key)?.timings.find((item) => item.name === prayer);
                  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  const canLog = logged || key < todayKey || Boolean(timing && new Date(timing.iso).getTime() <= now.getTime());
                  return (
                    <button
                      key={prayer}
                      className={logged ? "history-prayer logged" : "history-prayer"}
                      disabled={!canLog}
                      title={!canLog ? t("prayerNotStarted") : undefined}
                      onClick={() => toggle(key, prayer)}
                    >
                      <span>{logged && <Check size={15} weight="bold" />}</span>
                      {prayerNames[language][prayer]}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

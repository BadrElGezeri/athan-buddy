import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, Pause, Play, Queue, SkipBack, SkipForward, SpeakerHigh, SpeakerSlash, WarningCircle } from "@phosphor-icons/react";
import type { AppState, AyahTiming, Language, Moshaf, Reciter, Surah } from "../types";
import { createTranslator } from "../i18n";
import { availableSurahs, buildSurahAudioUrl } from "../lib/prayers";
import { getReciterCountry } from "../lib/reciterCountries";

interface BilingualSurah {
  id: number;
  nameEn: string;
  nameAr: string;
}

interface BilingualReciter extends Reciter {
  nameEn: string;
  nameAr: string;
  moshaf: Moshaf[];
}

interface QuranProps {
  state: AppState;
  setState(state: AppState): void;
  language: Language;
  active: boolean;
}

function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase();
}

export function Quran({ state, setState, language, active }: QuranProps) {
  const t = createTranslator(language);
  const [reciters, setReciters] = useState<BilingualReciter[]>([]);
  const [surahs, setSurahs] = useState<BilingualSurah[]>([]);
  const [surahSearch, setSurahSearch] = useState("");
  const [reciterSearch, setReciterSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ayahTimings, setAyahTimings] = useState<AyahTiming[]>([]);
  const [timingLoading, setTimingLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const suppressPauseSave = useRef(false);
  const persistedBucket = useRef(-1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      window.athanBuddy.getReciters("en"),
      window.athanBuddy.getReciters("ar"),
      window.athanBuddy.getSurahs("en"),
      window.athanBuddy.getSurahs("ar"),
    ])
      .then(([englishReciters, arabicReciters, englishSurahs, arabicSurahs]) => {
        const arabicRecitersById = new Map(arabicReciters.map((reciter: Reciter) => [reciter.id, reciter]));
        setReciters(englishReciters.map((reciter: Reciter) => ({
          ...reciter,
          nameEn: reciter.name,
          nameAr: arabicRecitersById.get(reciter.id)?.name ?? reciter.name,
        })));
        const arabicSurahsById = new Map(arabicSurahs.map((surah: Surah) => [surah.id, surah.name]));
        setSurahs(englishSurahs.map((surah: Surah) => ({
          id: surah.id,
          nameEn: surah.name,
          nameAr: arabicSurahsById.get(surah.id) ?? surah.name,
        })));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Quran data could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  const selectedReciter = reciters.find((reciter) => reciter.id === state.quran.reciterId) ?? null;
  const selectedMoshaf = selectedReciter?.moshaf.find((moshaf) => moshaf.id === state.quran.moshafId) ?? selectedReciter?.moshaf[0] ?? null;
  const available = selectedMoshaf ? availableSurahs(selectedMoshaf) : new Set<number>();
  const selectedSurah = surahs.find((surah) => surah.id === state.quran.surahId) ?? surahs[0] ?? null;
  const audioUrl = selectedMoshaf && selectedSurah ? buildSurahAudioUrl(selectedMoshaf, selectedSurah.id) : "";

  const filteredSurahs = useMemo(() => {
    const query = normalizeSearch(surahSearch);
    if (!query) return surahs;
    return surahs.filter((surah) =>
      normalizeSearch(surah.nameEn).includes(query)
      || normalizeSearch(surah.nameAr).includes(query)
      || String(surah.id) === query,
    );
  }, [surahs, surahSearch]);

  const filteredReciters = useMemo(() => {
    const query = normalizeSearch(reciterSearch);
    if (!query) return reciters;
    return reciters.filter((reciter) =>
      normalizeSearch(reciter.nameEn).includes(query) || normalizeSearch(reciter.nameAr).includes(query),
    );
  }, [reciters, reciterSearch]);

  const reciterOptions = useMemo(() => {
    if (!selectedReciter || filteredReciters.some((reciter) => reciter.id === selectedReciter.id)) return filteredReciters;
    return [selectedReciter, ...filteredReciters];
  }, [filteredReciters, selectedReciter]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = state.quran.volume;
    audioRef.current.muted = state.quran.muted;
  }, [state.quran.volume, state.quran.muted, audioUrl]);

  useEffect(() => {
    let cancelled = false;
    setAyahTimings([]);
    if (!selectedMoshaf || !selectedSurah) return undefined;
    setTimingLoading(true);
    window.athanBuddy.getAyahTimings(selectedMoshaf.server, selectedSurah.id)
      .then((timings) => { if (!cancelled) setAyahTimings(timings); })
      .catch(() => { if (!cancelled) setAyahTimings([]); })
      .finally(() => { if (!cancelled) setTimingLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMoshaf?.server, selectedSurah?.id]);

  const currentAyah = useMemo(() => {
    const milliseconds = progress * 1000;
    const match = ayahTimings.find((timing) => milliseconds >= timing.startTime && milliseconds < timing.endTime);
    if (match) return match.ayah;
    const last = ayahTimings.at(-1);
    return last && milliseconds >= last.endTime ? last.ayah : null;
  }, [ayahTimings, progress]);

  function persistPosition(seconds: number, force = false) {
    if (!Number.isFinite(seconds) || seconds < 0 || !audioUrl) return;
    const bucket = Math.floor(seconds / 10);
    if (!force && bucket === persistedBucket.current) return;
    persistedBucket.current = bucket;
    window.athanBuddy.updateQuran({ positionSeconds: seconds }).then(setState).catch(() => {});
  }

  async function updateSelection(partial: Partial<AppState["quran"]>) {
    suppressPauseSave.current = true;
    setPlaying(false);
    audioRef.current?.pause();
    setProgress(0);
    setDuration(0);
    persistedBucket.current = -1;
    setState(await window.athanBuddy.updateQuran({ ...partial, positionSeconds: 0 }));
    suppressPauseSave.current = false;
  }

  async function updateAudioPreference(partial: Partial<AppState["quran"]>) {
    setState(await window.athanBuddy.updateQuran(partial));
  }

  async function selectReciter(id: number) {
    const reciter = reciters.find((item) => item.id === id);
    await updateSelection({ reciterId: id, moshafId: reciter?.moshaf[0]?.id ?? null });
  }

  function togglePlayback() {
    if (!audioRef.current || !audioUrl) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => setError(t("audioError")));
  }

  function moveSurah(direction: -1 | 1) {
    if (!selectedSurah || !selectedMoshaf) return;
    const candidates = surahs.filter((surah) => available.has(surah.id));
    const index = candidates.findIndex((surah) => surah.id === selectedSurah.id);
    const next = candidates[index + direction];
    if (next) updateSelection({ surahId: next.id });
  }

  function formatAudioTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

  const reciterName = selectedReciter
    ? language === "ar" ? selectedReciter.nameAr : selectedReciter.nameEn
    : t("chooseReciter");
  const selectedCountry = selectedReciter ? getReciterCountry(selectedReciter.id, language) : null;

  return (
    <div className={`page quran-page${active ? "" : " quran-page-hidden"}`} aria-hidden={!active}>
      <header className="page-heading">
        <div>
          <h1>{t("quranTitle")}</h1>
          <p>{t("quranBody")}</p>
        </div>
      </header>

      {error && <div className="error-banner"><WarningCircle size={19} /> {error}</div>}

      <div className="quran-layout">
        <section className="surah-browser">
          <label className="search-box">
            <MagnifyingGlass size={19} />
            <input value={surahSearch} onChange={(event) => setSurahSearch(event.target.value)} placeholder={t("searchSurahs")} />
          </label>
          {loading ? (
            <div className="reciter-skeletons"><span /><span /><span /><span /></div>
          ) : (
            <div className="surah-list">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.id}
                  className={selectedSurah?.id === surah.id ? "surah-option active" : "surah-option"}
                  disabled={Boolean(selectedMoshaf) && !available.has(surah.id)}
                  onClick={() => updateSelection({ surahId: surah.id })}
                >
                  <span className="surah-number">{String(surah.id).padStart(3, "0")}</span>
                  <span>
                    <strong>{language === "ar" ? surah.nameAr : surah.nameEn}</strong>
                    <small dir={language === "ar" ? "ltr" : "rtl"}>{language === "ar" ? surah.nameEn : surah.nameAr}</small>
                  </span>
                </button>
              ))}
              {filteredSurahs.length === 0 && <p className="no-surah-results">{t("noSurahResults")}</p>}
            </div>
          )}
        </section>

        <section className="player-panel">
          <div className="player-ornament"><Queue size={30} weight="duotone" /></div>
          <div className="reciter-picker">
            <label className="search-box reciter-search">
              <MagnifyingGlass size={18} />
              <input value={reciterSearch} onChange={(event) => setReciterSearch(event.target.value)} placeholder={t("searchReciters")} />
            </label>
            <label className="reciter-select">
              <span>{t("reciter")}</span>
              <span className="reciter-select-control">
                <select value={selectedReciter?.id ?? ""} onChange={(event) => selectReciter(Number(event.target.value))}>
                  <option value="" disabled>{t("chooseReciter")}</option>
                  {reciterOptions.map((reciter) => (
                    <option key={reciter.id} value={reciter.id}>
                      {language === "ar" ? reciter.nameAr : reciter.nameEn}
                    </option>
                  ))}
                  {filteredReciters.length === 0 && <option disabled>{t("noReciterResults")}</option>}
                </select>
                {selectedCountry && (
                  <span
                    className={`fi fi-${selectedCountry.code} reciter-select-flag`}
                    title={selectedCountry.name}
                    role="img"
                    aria-label={selectedCountry.name}
                  />
                )}
              </span>
            </label>
          </div>

          <div className="now-playing-block">
            <div className="now-playing-label">
              <span>{t("nowPlaying")}</span>
              {selectedMoshaf && (
                <span className={`ayah-indicator${currentAyah ? " active" : ""}`}>
                  {timingLoading ? t("loadingAyah") : currentAyah ? t("ayahNumber", { number: currentAyah }) : t("ayahTimingUnavailable")}
                </span>
              )}
            </div>
            <h2>{selectedSurah ? (language === "ar" ? selectedSurah.nameAr : selectedSurah.nameEn) : t("surah")}</h2>
            <p>
              {reciterName}
              {selectedCountry && (
                <span
                  className={`fi fi-${selectedCountry.code} reciter-country-flag`}
                  title={selectedCountry.name}
                  role="img"
                  aria-label={selectedCountry.name}
                />
              )}
            </p>
          </div>

          <div className="audio-progress">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={progress}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (audioRef.current) audioRef.current.currentTime = value;
                setProgress(value);
              }}
              onPointerUp={() => persistPosition(audioRef.current?.currentTime ?? progress, true)}
              onKeyUp={() => persistPosition(audioRef.current?.currentTime ?? progress, true)}
              aria-label={t("nowPlaying")}
            />
            <div><span>{formatAudioTime(progress)}</span><span>{formatAudioTime(duration)}</span></div>
          </div>

          <div className="player-controls">
            <button onClick={() => moveSurah(-1)} aria-label={t("previousSurah")}><SkipBack size={22} weight="fill" /></button>
            <button className="play-button" onClick={togglePlayback} disabled={!audioUrl} aria-label={playing ? t("pause") : t("play")}>
              {playing ? <Pause size={27} weight="fill" /> : <Play size={27} weight="fill" />}
            </button>
            <button onClick={() => moveSurah(1)} aria-label={t("nextSurah")}><SkipForward size={22} weight="fill" /></button>
          </div>

          <div className="volume-control">
            <button
              onClick={() => updateAudioPreference({ muted: !state.quran.muted })}
              aria-label={state.quran.muted ? t("unmute") : t("mute")}
              title={state.quran.muted ? t("unmute") : t("mute")}
            >
              {state.quran.muted || state.quran.volume === 0 ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(state.quran.volume * 100)}
              onChange={(event) => updateAudioPreference({ volume: Number(event.target.value) / 100, muted: false })}
              aria-label={t("volume")}
            />
            <span>{Math.round(state.quran.volume * 100)}%</span>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={(event) => {
              setPlaying(false);
              if (!suppressPauseSave.current) persistPosition(event.currentTarget.currentTime, true);
            }}
            onTimeUpdate={(event) => {
              setProgress(event.currentTarget.currentTime);
              persistPosition(event.currentTarget.currentTime);
            }}
            onLoadedMetadata={(event) => {
              const nextDuration = event.currentTarget.duration;
              setDuration(nextDuration);
              const saved = Math.min(state.quran.positionSeconds, Math.max(0, nextDuration - 0.25));
              if (saved > 0) {
                event.currentTarget.currentTime = saved;
                setProgress(saved);
                persistedBucket.current = Math.floor(saved / 10);
              }
            }}
            onEnded={() => { setPlaying(false); moveSurah(1); }}
            onError={() => audioUrl && setError(t("audioError"))}
          />
        </section>
      </div>
    </div>
  );
}

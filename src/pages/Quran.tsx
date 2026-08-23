import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, Pause, Play, Queue, SkipBack, SkipForward, SpeakerHigh, SpeakerSlash, WarningCircle } from "@phosphor-icons/react";
import type { AppState, Language, Reciter, Surah } from "../types";
import { createTranslator } from "../i18n";
import { availableSurahs, buildSurahAudioUrl } from "../lib/prayers";

interface BilingualSurah {
  id: number;
  nameEn: string;
  nameAr: string;
}

export function Quran({ state, setState, language }: { state: AppState; setState(state: AppState): void; language: Language }) {
  const t = createTranslator(language);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [surahs, setSurahs] = useState<BilingualSurah[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      window.athanBuddy.getReciters(language),
      window.athanBuddy.getSurahs("en"),
      window.athanBuddy.getSurahs("ar"),
    ])
      .then(([nextReciters, englishSurahs, arabicSurahs]) => {
        setReciters(nextReciters);
        const arabicById = new Map(arabicSurahs.map((surah: Surah) => [surah.id, surah.name]));
        setSurahs(englishSurahs.map((surah: Surah) => ({
          id: surah.id,
          nameEn: surah.name,
          nameAr: arabicById.get(surah.id) ?? surah.name,
        })));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("audioError")))
      .finally(() => setLoading(false));
  }, [language]);

  const selectedReciter = reciters.find((reciter) => reciter.id === state.quran.reciterId) ?? null;
  const selectedMoshaf = selectedReciter?.moshaf.find((moshaf) => moshaf.id === state.quran.moshafId) ?? selectedReciter?.moshaf[0] ?? null;
  const available = selectedMoshaf ? availableSurahs(selectedMoshaf) : new Set<number>();
  const selectedSurah = surahs.find((surah) => surah.id === state.quran.surahId) ?? surahs[0] ?? null;
  const audioUrl = selectedMoshaf && selectedSurah ? buildSurahAudioUrl(selectedMoshaf, selectedSurah.id) : "";

  const filteredSurahs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return surahs;
    return surahs.filter((surah) =>
      surah.nameEn.toLocaleLowerCase().includes(query)
      || surah.nameAr.toLocaleLowerCase().includes(query)
      || String(surah.id) === query,
    );
  }, [surahs, search]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = state.quran.volume;
    audioRef.current.muted = state.quran.muted;
  }, [state.quran.volume, state.quran.muted, audioUrl]);

  async function updateSelection(partial: Partial<AppState["quran"]>) {
    setPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    setState(await window.athanBuddy.updateQuran(partial));
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

  return (
    <div className="page quran-page">
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
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchSurahs")} />
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
          <div className="player-selectors compact">
            <label>
              <span>{t("reciter")}</span>
              <select value={selectedReciter?.id ?? ""} onChange={(event) => selectReciter(Number(event.target.value))}>
                <option value="" disabled>{t("chooseReciter")}</option>
                {reciters.map((reciter) => <option key={reciter.id} value={reciter.id}>{reciter.name}</option>)}
              </select>
            </label>
            <label>
              <span>{t("narration")}</span>
              <select
                value={selectedMoshaf?.id ?? ""}
                disabled={!selectedReciter}
                onChange={(event) => updateSelection({ moshafId: Number(event.target.value) })}
              >
                <option value="" disabled>{t("chooseNarration")}</option>
                {selectedReciter?.moshaf.map((moshaf) => <option key={moshaf.id} value={moshaf.id}>{moshaf.name}</option>)}
              </select>
            </label>
          </div>

          <div className="now-playing-block">
            <span>{t("nowPlaying")}</span>
            <h2>{selectedSurah ? (language === "ar" ? selectedSurah.nameAr : selectedSurah.nameEn) : t("surah")}</h2>
            <p>{selectedReciter?.name ?? t("chooseReciter")}</p>
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
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onEnded={() => { setPlaying(false); moveSurah(1); }}
            onError={() => audioUrl && setError(t("audioError"))}
          />
        </section>
      </div>
    </div>
  );
}

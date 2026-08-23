import { useEffect, useState } from "react";
import { ArrowClockwise, BellSimpleRinging, CheckCircle, DownloadSimple, LinkSimple, Moon, SpeakerHigh, SpeakerSimpleNone, Sun, WarningCircle } from "@phosphor-icons/react";
import type {
  AppState,
  CalculationMethod,
  Language,
  LocationMode,
  NotificationMode,
  Settings as SettingsType,
  UpdateStatus,
  UserLocation,
} from "../types";
import { createTranslator } from "../i18n";
import { LocationPicker } from "../components/LocationPicker";
import { PrimaryButton, SecondaryButton, Segmented, Toggle } from "../components/Controls";

export function Settings({
  state,
  setState,
  language,
  updateStatus,
  onPrayerSettingsChanged,
}: {
  state: AppState;
  setState(state: AppState): void;
  language: Language;
  updateStatus: UpdateStatus;
  onPrayerSettingsChanged(): void;
}) {
  const t = createTranslator(language);
  const [methods, setMethods] = useState<CalculationMethod[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.athanBuddy.getCalculationMethods().then(setMethods).catch(console.error);
  }, []);

  async function update(partial: Partial<SettingsType>, prayerChange = false) {
    const updated = await window.athanBuddy.updateSettings(partial);
    setState(updated);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
    if (prayerChange) onPrayerSettingsChanged();
  }

  function updateLocation(mode: LocationMode, location: UserLocation) {
    update({ locationMode: mode, location }, true);
  }

  return (
    <div className="page settings-page">
      <header className="page-heading settings-heading">
        <div>
          <h1>{t("settings")}</h1>
          <p>{language === "ar" ? "اضبط رفيق الأذان بالطريقة التي تناسب يومك." : "Tune Athan Buddy to the way you move through your day."}</p>
        </div>
        <span className={saved ? "save-indicator visible" : "save-indicator"}>{t("saved")}</span>
      </header>

      <div className="settings-sections">
        <section className="settings-group">
          <header><h2>{t("appearance")}</h2></header>
          <div className="setting-control-stack">
            <div>
              <span className="field-label">{t("appearance")}</span>
              <Segmented
                value={state.settings.theme}
                onChange={(theme) => update({ theme })}
                ariaLabel={t("appearance")}
                options={[
                  { value: "light", label: t("light"), icon: <Sun size={20} /> },
                  { value: "dark", label: t("dark"), icon: <Moon size={20} /> },
                ]}
              />
            </div>
            <div>
              <span className="field-label">{t("language")}</span>
              <Segmented
                value={state.settings.language}
                onChange={(nextLanguage) => update({ language: nextLanguage })}
                ariaLabel={t("language")}
                options={[
                  { value: "en", label: t("english") },
                  { value: "ar", label: t("arabic") },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="settings-group">
          <header><h2>{t("prayerSettings")}</h2></header>
          <div className="setting-control-stack">
            <label>
              <span>{t("calculationMethod")}</span>
              <select
                value={state.settings.calculationMethod ?? ""}
                onChange={(event) => {
                  const calculationMethod = Number(event.target.value);
                  update({ calculationMethod, calculationMethodName: methods.find((item) => item.id === calculationMethod)?.name ?? null }, true);
                }}
              >
                {methods.map((method) => <option value={method.id} key={method.id}>{method.name}</option>)}
              </select>
            </label>
            <div>
              <span className="field-label">{t("asrSchool")}</span>
              <Segmented
                value={state.settings.school}
                onChange={(school) => update({ school }, true)}
                ariaLabel={t("asrSchool")}
                options={[
                  { value: 0, label: t("standard") },
                  { value: 1, label: t("hanafi") },
                ]}
              />
            </div>
            <div>
              <span className="field-label">{t("location")}</span>
              <LocationPicker
                language={language}
                mode={state.settings.locationMode}
                location={state.settings.location}
                onChange={updateLocation}
              />
            </div>
          </div>
        </section>

        <section className="settings-group">
          <header><h2>{t("notifications")}</h2></header>
          <div className="setting-control-stack">
            <Segmented
              value={state.settings.notificationMode}
              onChange={(notificationMode: NotificationMode) => update({ notificationMode })}
              ariaLabel={t("notifications")}
              options={[
                { value: "adhan", label: t("fullAdhan"), icon: <SpeakerHigh size={20} /> },
                { value: "sound", label: t("shortSound"), icon: <BellSimpleRinging size={20} /> },
                { value: "silent", label: t("silent"), icon: <SpeakerSimpleNone size={20} /> },
              ]}
            />
            <SecondaryButton className="test-alert" onClick={() => window.athanBuddy.testAlert(state.settings.notificationMode)}>
              {t("test")}
            </SecondaryButton>
            <label className="volume-setting">
              <span><strong>{t("adhanVolume")}</strong><small>{Math.round(state.settings.adhanVolume * 100)}%</small></span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(state.settings.adhanVolume * 100)}
                onChange={(event) => update({ adhanVolume: Number(event.target.value) / 100 })}
                aria-label={t("adhanVolume")}
              />
            </label>
            <div className="setting-row">
              <div><strong>{t("reminder")}</strong><span>{t("reminderHelp")}</span></div>
              <Toggle checked={state.settings.reminderEnabled} onChange={(reminderEnabled) => update({ reminderEnabled })} label={t("reminder")} />
            </div>
            {state.settings.reminderEnabled && (
              <label className="minutes-control">
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={state.settings.reminderMinutes}
                  onChange={(event) => update({ reminderMinutes: Math.max(5, Math.min(120, Number(event.target.value))) })}
                />
                <span>{t("minutesBefore")}</span>
              </label>
            )}
            <div className="snooze-setting">
              <div><strong>{t("snoozeLength")}</strong><span>{t("snoozeHelp")}</span></div>
              <Segmented
                value={state.settings.snoozeMinutes}
                onChange={(snoozeMinutes: 5 | 10 | 15) => update({ snoozeMinutes })}
                ariaLabel={t("snoozeLength")}
                options={[
                  { value: 5, label: "5 min" },
                  { value: 10, label: "10 min" },
                  { value: 15, label: "15 min" },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="settings-group">
          <header><h2>Windows</h2></header>
          <div className="setting-row">
            <div><strong>{t("startup")}</strong><span>{t("startupHelp")}</span></div>
            <Toggle
              checked={state.settings.launchAtStartup}
              onChange={async (launchAtStartup) => {
                await window.athanBuddy.setStartup(launchAtStartup);
                update({ launchAtStartup });
              }}
              label={t("startup")}
            />
          </div>
        </section>

        <section className="settings-group update-settings-group">
          <header><h2>{t("appUpdates")}</h2></header>
          <div className="setting-control-stack">
            <div className="update-version-line">
              <span>{t("currentVersion")}</span>
              <strong>v{updateStatus.currentVersion || "0.1.0"}</strong>
            </div>
            <div className="setting-row">
              <div><strong>{t("automaticUpdateChecks")}</strong><span>{t("automaticUpdateChecksHelp")}</span></div>
              <Toggle
                checked={state.settings.autoCheckUpdates}
                onChange={(autoCheckUpdates) => update({ autoCheckUpdates })}
                label={t("automaticUpdateChecks")}
              />
            </div>
            <div className={`update-status-panel ${updateStatus.phase}`} aria-live="polite">
              <div className="update-status-copy">
                {updateStatus.phase === "up-to-date" && <CheckCircle size={21} weight="fill" />}
                {updateStatus.phase === "error" && <WarningCircle size={21} weight="fill" />}
                {["checking", "downloading"].includes(updateStatus.phase) && <ArrowClockwise className="spin" size={21} />}
                {updateStatus.phase === "available" && <DownloadSimple size={21} weight="fill" />}
                {updateStatus.phase === "ready" && <CheckCircle size={21} weight="fill" />}
                <div>
                  <strong>{
                    updateStatus.phase === "checking" ? t("checkingForUpdates")
                      : updateStatus.phase === "up-to-date" ? t("upToDate")
                        : updateStatus.phase === "available" ? t("versionAvailable", { version: updateStatus.availableVersion ?? "" })
                          : updateStatus.phase === "downloading" ? t("downloadingPercent", { percent: updateStatus.percent ?? 0 })
                            : updateStatus.phase === "ready" ? t("updateReady")
                              : updateStatus.phase === "error" ? t("updateCheckFailed")
                                : updateStatus.phase === "unavailable" ? t("updatesInInstalledApp")
                                  : t("readyToCheck")
                  }</strong>
                  <span>{updateStatus.phase === "error" ? updateStatus.error : t("updateStatusHelp")}</span>
                </div>
              </div>
              <div className="update-status-actions">
                {!["downloading", "ready"].includes(updateStatus.phase) && (
                  <SecondaryButton disabled={updateStatus.phase === "checking"} onClick={() => window.athanBuddy.checkForUpdates()}>
                    {t("checkForUpdates")}
                  </SecondaryButton>
                )}
                {updateStatus.phase === "available" && (
                  <PrimaryButton onClick={() => window.athanBuddy.downloadUpdate()}><DownloadSimple size={17} /> {t("downloadUpdate")}</PrimaryButton>
                )}
                {updateStatus.phase === "ready" && (
                  <PrimaryButton onClick={() => window.athanBuddy.installUpdate()}><ArrowClockwise size={17} /> {t("restartAndInstall")}</PrimaryButton>
                )}
              </div>
              {updateStatus.phase === "downloading" && (
                <div className="settings-update-progress"><span style={{ width: `${updateStatus.percent ?? 0}%` }} /></div>
              )}
            </div>
          </div>
        </section>
      </div>

      <footer className="maker-footer">
        <button onClick={() => window.athanBuddy.openExternal("https://badrelgezeri.me/")}>
          <span>{t("madeBy")} <strong>Badr Elgezeri</strong></span>
          <LinkSimple size={16} />
        </button>
        <small>{t("createdWithAi")}</small>
      </footer>
    </div>
  );
}

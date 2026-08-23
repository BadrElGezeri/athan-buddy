import { useEffect, useState } from "react";
import {
  BellSimpleRinging,
  Check,
  CircleHalf,
  Moon,
  SpeakerHigh,
  SpeakerSimpleNone,
  Sun,
} from "@phosphor-icons/react";
import type {
  AppState,
  CalculationMethod,
  Language,
  LocationMode,
  NotificationMode,
  Theme,
  UserLocation,
} from "../types";
import { createTranslator } from "../i18n";
import { LocationPicker } from "../components/LocationPicker";
import { PrimaryButton, SecondaryButton, Segmented, Toggle } from "../components/Controls";

export function Onboarding({ state, onComplete }: { state: AppState; onComplete(state: AppState): void }) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Language | null>(state.settings.language);
  const [theme, setTheme] = useState<Theme | null>(state.settings.theme);
  const [method, setMethod] = useState<number | null>(state.settings.calculationMethod);
  const [methodName, setMethodName] = useState<string | null>(state.settings.calculationMethodName);
  const [school, setSchool] = useState<0 | 1 | null>(state.settings.school);
  const [locationMode, setLocationMode] = useState<LocationMode | null>(state.settings.locationMode);
  const [location, setLocation] = useState<UserLocation | null>(state.settings.location);
  const [notificationMode, setNotificationMode] = useState<NotificationMode | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(20);
  const [methods, setMethods] = useState<CalculationMethod[]>([]);
  const [methodError, setMethodError] = useState(false);
  const [validation, setValidation] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeLanguage = language ?? "en";
  const t = createTranslator(activeLanguage);

  useEffect(() => {
    setMethodError(false);
    window.athanBuddy.getCalculationMethods().then(setMethods).catch(() => setMethodError(true));
  }, []);

  useEffect(() => {
    document.documentElement.lang = activeLanguage;
    document.documentElement.dir = activeLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme ?? "light";
  }, [activeLanguage, theme]);

  function validStep() {
    if (step === 0) return language !== null && theme !== null;
    if (step === 1) return method !== null && school !== null;
    if (step === 2) return locationMode !== null && location !== null;
    return notificationMode !== null;
  }

  function next() {
    if (!validStep()) {
      setValidation(true);
      return;
    }
    setValidation(false);
    setStep((current) => Math.min(3, current + 1));
  }

  function selectLocation(nextMode: LocationMode, nextLocation: UserLocation) {
    setLocationMode(nextMode);
    setLocation(nextLocation);
    setValidation(false);
  }

  async function finish() {
    if (!validStep() || !language || !theme || method === null || school === null || !locationMode || !location || !notificationMode) {
      setValidation(true);
      return;
    }
    setSaving(true);
    const updated = await window.athanBuddy.updateSettings({
      language,
      theme,
      calculationMethod: method,
      calculationMethodName: methodName,
      school,
      locationMode,
      location,
      notificationMode,
      reminderEnabled,
      reminderMinutes,
      launchAtStartup: true,
      onboardingComplete: true,
    });
    await window.athanBuddy.setStartup(true);
    onComplete(updated);
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-brand-panel">
        <div className="onboarding-brand-lockup">
          <span className="brand-mark large"><img src="./assets/brand/athan-buddy-mark.png" alt="" /></span>
          <span>Athan Buddy</span>
        </div>
        <div className="onboarding-promise">
          <p className="arabic-display" lang="ar">حَيَّ عَلَى الصَّلَاةِ</p>
          <div className="gold-rule" />
          <p>{t("privacy")}</p>
        </div>
        <div className="step-indicator" aria-label={`${step + 1} of 4`}>
          {[0, 1, 2, 3].map((number) => <span key={number} className={number <= step ? "active" : ""} />)}
        </div>
      </section>

      <section className="onboarding-content">
        <div className="onboarding-inner">
          {step === 0 && (
            <>
              <header className="onboarding-header">
                <h1>{t("welcome")}</h1>
                <p>{t("welcomeBody")}</p>
              </header>
              <div className="choice-block">
                <h2>{t("chooseLanguage")}</h2>
                <Segmented
                  value={language}
                  onChange={(value) => { setLanguage(value); setValidation(false); }}
                  ariaLabel={t("chooseLanguage")}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "العربية" },
                  ]}
                />
              </div>
              <div className="choice-block">
                <h2>{t("chooseTheme")}</h2>
                <Segmented
                  value={theme}
                  onChange={(value) => { setTheme(value); setValidation(false); }}
                  ariaLabel={t("chooseTheme")}
                  options={[
                    { value: "light", label: t("light"), icon: <Sun size={20} /> },
                    { value: "dark", label: t("dark"), icon: <Moon size={20} /> },
                  ]}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <header className="onboarding-header">
                <CircleHalf size={32} weight="duotone" />
                <h1>{t("chooseCalculation")}</h1>
                <p>{t("chooseCalculationBody")}</p>
              </header>
              <div className="field-stack">
                <label>
                  <span>{t("calculationMethod")}</span>
                  <select
                    value={method ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setMethod(value);
                      setMethodName(methods.find((item) => item.id === value)?.name ?? null);
                      setValidation(false);
                    }}
                  >
                    <option value="" disabled>{t("calculationMethod")}</option>
                    {methods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                  </select>
                </label>
                {methodError && <p className="inline-error">{t("prayerLoadError")}</p>}
                <div>
                  <span className="field-label">{t("asrSchool")}</span>
                  <Segmented
                    value={school}
                    onChange={(value) => { setSchool(value); setValidation(false); }}
                    ariaLabel={t("asrSchool")}
                    options={[
                      { value: 0, label: t("standard") },
                      { value: 1, label: t("hanafi") },
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <header className="onboarding-header">
                <h1>{t("chooseLocation")}</h1>
                <p>{t("chooseLocationBody")}</p>
              </header>
              <LocationPicker
                language={activeLanguage}
                mode={locationMode}
                location={location}
                onChange={selectLocation}
              />
            </>
          )}

          {step === 3 && (
            <>
              <header className="onboarding-header">
                <BellSimpleRinging size={32} weight="duotone" />
                <h1>{t("chooseAlerts")}</h1>
                <p>{t("chooseAlertsBody")}</p>
              </header>
              <Segmented
                value={notificationMode}
                onChange={(value) => { setNotificationMode(value); setValidation(false); }}
                ariaLabel={t("notifications")}
                options={[
                  { value: "adhan", label: t("fullAdhan"), icon: <SpeakerHigh size={20} /> },
                  { value: "sound", label: t("shortSound"), icon: <BellSimpleRinging size={20} /> },
                  { value: "silent", label: t("silent"), icon: <SpeakerSimpleNone size={20} /> },
                ]}
              />
              <div className="setting-row onboarding-setting">
                <div>
                  <strong>{t("reminder")}</strong>
                  <span>{t("reminderHelp")}</span>
                </div>
                <Toggle checked={reminderEnabled} onChange={setReminderEnabled} label={t("reminder")} />
              </div>
              {reminderEnabled && (
                <label className="minutes-control">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    value={reminderMinutes}
                    onChange={(event) => setReminderMinutes(Math.max(5, Math.min(120, Number(event.target.value))))}
                  />
                  <span>{t("minutesBefore")}</span>
                </label>
              )}
              <div className="startup-confirmation"><Check size={20} weight="bold" /> {t("startupHelp")}</div>
            </>
          )}

          {validation && <p className="inline-error validation-message" role="alert">{t("required")}</p>}

          <footer className="onboarding-actions">
            {step > 0 ? <SecondaryButton onClick={() => { setStep(step - 1); setValidation(false); }}>{t("back")}</SecondaryButton> : <span />}
            {step < 3 ? <PrimaryButton onClick={next}>{t("continue")}</PrimaryButton> : <PrimaryButton disabled={saving} onClick={finish}>{t("finish")}</PrimaryButton>}
          </footer>
        </div>
      </section>
    </main>
  );
}

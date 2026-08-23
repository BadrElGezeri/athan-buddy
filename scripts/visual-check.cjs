const path = require("node:path");
const fs = require("node:fs");

const playwrightPath = process.argv[2];
if (!playwrightPath) throw new Error("Pass the Playwright module path as the first argument");
const { chromium } = require(playwrightPath);

const output = path.resolve(process.argv[3] || "artifacts/screenshots");
const browserExecutable = process.argv[4];
fs.mkdirSync(output, { recursive: true });

const prayerDays = [
  {
    dateKey: "2026-08-23",
    readableDate: "23 Aug 2026",
    hijriDate: "10 Rabi al-Awwal 1448",
    hijriDateAr: "١٠ ربيع الأول ١٤٤٨",
    timezone: "Africa/Cairo",
    methodName: "Egyptian General Authority of Survey",
    timings: [
      { name: "Fajr", time: "04:55", iso: "2026-08-23T04:55:00+03:00" },
      { name: "Dhuhr", time: "12:58", iso: "2026-08-23T12:58:00+03:00" },
      { name: "Asr", time: "16:31", iso: "2026-08-23T16:31:00+03:00" },
      { name: "Maghrib", time: "18:27", iso: "2026-08-23T18:27:00+03:00" },
      { name: "Isha", time: "19:49", iso: "2026-08-23T19:49:00+03:00" },
    ],
  },
  {
    dateKey: "2026-08-24",
    readableDate: "24 Aug 2026",
    hijriDate: "11 Rabi al-Awwal 1448",
    hijriDateAr: "١١ ربيع الأول ١٤٤٨",
    timezone: "Africa/Cairo",
    methodName: "Egyptian General Authority of Survey",
    timings: [
      { name: "Fajr", time: "04:56", iso: "2026-08-24T04:56:00+03:00" },
      { name: "Dhuhr", time: "12:58", iso: "2026-08-24T12:58:00+03:00" },
      { name: "Asr", time: "16:30", iso: "2026-08-24T16:30:00+03:00" },
      { name: "Maghrib", time: "18:26", iso: "2026-08-24T18:26:00+03:00" },
      { name: "Isha", time: "19:48", iso: "2026-08-24T19:48:00+03:00" },
    ],
  },
];

function makeState({ onboarding = true, language = "en", theme = "light" } = {}) {
  return {
    settings: {
      language: onboarding ? language : null,
      theme: onboarding ? theme : null,
      calculationMethod: onboarding ? 5 : null,
      calculationMethodName: onboarding ? "Egyptian General Authority of Survey" : null,
      school: onboarding ? 0 : null,
      locationMode: onboarding ? "ip" : null,
      location: onboarding
        ? { type: "coordinates", source: "ip", latitude: 30.0444, longitude: 31.2357, city: "Cairo", country: "Egypt" }
        : null,
      notificationMode: "sound",
      reminderEnabled: true,
      reminderMinutes: 20,
      snoozeMinutes: 10,
      adhanVolume: 0.8,
      sidebarCollapsed: false,
      autoCheckUpdates: true,
      launchAtStartup: true,
      onboardingComplete: onboarding,
    },
    prayerLogs: { "2026-08-23": { Fajr: { prayed: true, loggedAt: new Date().toISOString() }, Dhuhr: { prayed: true, loggedAt: new Date().toISOString() } } },
    quran: { reciterId: 1, moshafId: 1, surahId: 1, volume: 0.8, muted: false },
  };
}

async function openWithState(browser, state, name, destination, scrollMainToBottom = false) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 780 }, deviceScaleFactor: 1 });
  await page.addInitScript(({ state, prayerDays }) => {
    let current = state;
    window.athanBuddy = {
      getState: async () => current,
      updateSettings: async (partial) => (current = { ...current, settings: { ...current.settings, ...partial } }),
      updateQuran: async (partial) => (current = { ...current, quran: { ...current.quran, ...partial } }),
      togglePrayer: async () => current,
      getCalculationMethods: async () => [{ id: 5, name: "Egyptian General Authority of Survey" }],
      fetchPrayerDays: async () => prayerDays,
      detectIpLocation: async () => current.settings.location,
      reverseLocation: async (latitude, longitude) => ({ type: "coordinates", source: "precise", latitude, longitude, city: "Cairo", country: "Egypt" }),
      getReciters: async () => [
        { id: 1, name: "Mahmoud Khalil Al-Husary", letter: "M", moshaf: [{ id: 1, name: "Hafs A'n Assem - Murattal", server: "https://server.example/", surah_total: 114, surah_list: "1,2,3" }] },
        { id: 2, name: "Mishary Rashid Alafasy", letter: "M", moshaf: [{ id: 2, name: "Hafs A'n Assem - Murattal", server: "https://server.example/", surah_total: 114, surah_list: "1,2,3" }] },
      ],
      getSurahs: async (language) => [
        { id: 1, name: language === "ar" ? "الفاتحة" : "Al-Fatihah" },
        { id: 2, name: language === "ar" ? "البقرة" : "Al-Baqarah" },
        { id: 3, name: language === "ar" ? "آل عمران" : "Ali 'Imran" },
      ],
      setStartup: async () => true,
      openExternal: async () => undefined,
      getUpdateStatus: async () => state._updateStatus || ({ phase: "up-to-date", currentVersion: "0.1.0", lastCheckedAt: new Date().toISOString() }),
      checkForUpdates: async () => state._updateStatus || ({ phase: "up-to-date", currentVersion: "0.1.0" }),
      downloadUpdate: async () => state._updateStatus || ({ phase: "downloading", currentVersion: "0.1.0", percent: 0 }),
      installUpdate: async () => undefined,
      testAlert: async () => undefined,
      onPrayerAlert: () => () => undefined,
      onStateChanged: () => () => undefined,
      onUpdateStatus: () => () => undefined,
    };
  }, { state, prayerDays });
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  if (destination) {
    await page.getByRole("button", { name: destination }).click();
    await page.waitForTimeout(450);
  }
  if (scrollMainToBottom) {
    await page.locator(".app-main").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(300);
  const updatePrompt = page.locator(".update-prompt");
  if (await updatePrompt.count()) {
    const computed = await updatePrompt.evaluate((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, backgroundColor: style.backgroundColor };
    });
    if (computed.opacity !== "1" || computed.backgroundColor === "rgba(0, 0, 0, 0)") {
      throw new Error(`Update prompt did not settle visually: ${JSON.stringify(computed)}`);
    }
  }
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable || undefined });
  await openWithState(browser, makeState({ onboarding: false }), "onboarding-light");
  await openWithState(browser, makeState({ language: "en", theme: "light" }), "dashboard-light-en");
  await openWithState(browser, makeState({ language: "ar", theme: "dark" }), "dashboard-dark-ar");
  await openWithState(browser, makeState({ language: "en", theme: "light" }), "quran-light-en", "Quran");
  await openWithState(browser, makeState({ language: "en", theme: "light" }), "history-light-en", "Prayer log");
  const collapsedState = makeState({ language: "en", theme: "light" });
  collapsedState.settings.sidebarCollapsed = true;
  await openWithState(browser, collapsedState, "dashboard-collapsed-light-en");
  await openWithState(browser, makeState({ language: "en", theme: "dark" }), "settings-dark-en", "Settings");
  await openWithState(browser, makeState({ language: "en", theme: "dark" }), "settings-footer-dark-en", "Settings", true);
  const updateState = makeState({ language: "en", theme: "light" });
  updateState._updateStatus = { phase: "available", currentVersion: "0.1.0", availableVersion: "0.2.0", releaseNotes: "A clearer prayer timeline\nFaster Quran search in English and Arabic\nSecurity improvements" };
  await openWithState(browser, updateState, "update-available-light-en");
  await browser.close();
  console.log(output);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

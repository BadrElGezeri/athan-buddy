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

const reciterCatalog = [
  { id: 92, nameEn: "Yasser Al-Dosari", nameAr: "ياسر الدوسري", server: "https://server11.mp3quran.net/yasser/" },
  { id: 30, nameEn: "Saad Al-Ghamdi", nameAr: "سعد الغامدي", server: "https://server7.mp3quran.net/s_gmd/" },
  { id: 54, nameEn: "Abdul Rahman Al-Sudais", nameAr: "عبد الرحمن السديس", server: "https://server11.mp3quran.net/sds/" },
  { id: 74, nameEn: "Ali Al-Hudhaify", nameAr: "علي الحذيفي", server: "https://server9.mp3quran.net/hthfi/" },
  { id: 217, nameEn: "Bandar Baleelah", nameAr: "بندر بليلة", server: "https://server6.mp3quran.net/balilah/" },
  { id: 51, nameEn: "Abdul Basit Abdus Samad", nameAr: "عبد الباسط عبد الصمد", server: "https://server7.mp3quran.net/basit/" },
  { id: 123, nameEn: "Mishary Rashid Alafasy", nameAr: "مشاري راشد العفاسي", server: "https://server8.mp3quran.net/afs/" },
  { id: 1, nameEn: "Ibrahim Al-Akdar", nameAr: "إبراهيم الأخضر", server: "https://server6.mp3quran.net/akdr/" },
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
    prayerStreak: { current: 2, best: 2, breakAt: "2026-08-22#4" },
    quran: { reciterId: 92, moshafId: 1, surahId: 1, volume: 0.8, muted: false, positionSeconds: 0 },
  };
}

async function openWithState(browser, state, name, destination, scrollMainToBottom = false) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 780 }, deviceScaleFactor: 1 });
  await page.addInitScript(({ state, prayerDays, reciterCatalog }) => {
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
      getReciters: async (language) => reciterCatalog.map((reciter) => ({
        id: reciter.id,
        name: language === "ar" ? reciter.nameAr : reciter.nameEn,
        letter: reciter.nameEn[0],
        moshaf: [{ id: reciter.id, name: "Hafs A'n Assem - Murattal", server: reciter.server, surah_total: 114, surah_list: "1,2,3" }],
      })),
      getSurahs: async (language) => [
        { id: 1, name: language === "ar" ? "الفاتحة" : "Al-Fatihah" },
        { id: 2, name: language === "ar" ? "البقرة" : "Al-Baqarah" },
        { id: 3, name: language === "ar" ? "آل عمران" : "Ali 'Imran" },
      ],
      getAyahTimings: async () => [
        { ayah: 1, startTime: 0, endTime: 13000 },
        { ayah: 2, startTime: 13000, endTime: 20000 },
      ],
      setStartup: async () => true,
      openExternal: async () => undefined,
      getUpdateStatus: async () => state._updateStatus || ({ phase: "up-to-date", currentVersion: "0.1.0", lastCheckedAt: new Date().toISOString() }),
      checkForUpdates: async () => state._updateStatus || ({ phase: "up-to-date", currentVersion: "0.1.0" }),
      openUpdateRelease: async () => undefined,
      testAlert: async () => undefined,
      onPrayerAlert: () => () => undefined,
      onStreakCelebration: (callback) => {
        if (state._celebration) setTimeout(() => callback(state._celebration), 100);
        return () => undefined;
      },
      onStateChanged: () => () => undefined,
      onUpdateStatus: () => () => undefined,
    };
  }, { state, prayerDays, reciterCatalog });
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

async function verifyInteractiveBehaviors(browser) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 780 }, deviceScaleFactor: 1 });
  const state = makeState({ language: "en", theme: "light" });
  const futurePrayerDays = prayerDays.map((day) => ({
    ...day,
    timings: day.timings.map((timing) => ({ ...timing, iso: timing.iso.replace(/^2026/, "2099") })),
  }));
  await page.addInitScript(({ state, prayerDays, reciterCatalog }) => {
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
      getReciters: async (language) => reciterCatalog.map((reciter) => ({
        id: reciter.id,
        name: language === "ar" ? reciter.nameAr : reciter.nameEn,
        letter: reciter.nameEn[0],
        moshaf: [{ id: reciter.id, name: "Hafs", server: reciter.server, surah_total: 114, surah_list: "1,2,3" }],
      })),
      getSurahs: async (language) => [{ id: 1, name: language === "ar" ? "الفاتحة" : "Al-Fatihah" }],
      getAyahTimings: async () => [{ ayah: 1, startTime: 0, endTime: 13000 }],
      setStartup: async () => true,
      openExternal: async () => undefined,
      getUpdateStatus: async () => ({ phase: "up-to-date", currentVersion: "0.1.0" }),
      checkForUpdates: async () => ({ phase: "up-to-date", currentVersion: "0.1.0" }),
      openUpdateRelease: async () => undefined,
      testAlert: async () => undefined,
      onPrayerAlert: () => () => undefined,
      onStreakCelebration: () => () => undefined,
      onStateChanged: () => () => undefined,
      onUpdateStatus: () => () => undefined,
    };
  }, { state, prayerDays: futurePrayerDays, reciterCatalog });
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Quran" }).click();
  const initialReciterOptions = await page.locator(".reciter-select option:not([disabled])").allTextContents();
  if (initialReciterOptions.length !== 7 || initialReciterOptions.some((option) => option.includes("Ibrahim"))) throw new Error("The Quran picker was not restricted to the seven featured reciters");
  const reciterFlag = page.locator(".reciter-country-flag");
  if (!(await reciterFlag.getAttribute("class")).includes("fi-sa")) throw new Error("Verified reciter flag was not rendered");
  if ((await reciterFlag.evaluate((element) => getComputedStyle(element).backgroundImage)) === "none") throw new Error("Reciter flag artwork was not loaded");
  await page.getByPlaceholder("Search reciters").fill("مشاري");
  const options = await page.locator(".reciter-select option").allTextContents();
  if (!options.some((option) => option.includes("Mishary"))) throw new Error("Arabic reciter search did not find the English reciter entry");
  if (await page.getByText("Recitation", { exact: true }).count()) throw new Error("The removed Recitation selector is still visible");
  await page.locator(".player-panel audio").evaluate((audio) => { audio.dataset.persistenceCheck = "mounted"; });
  await page.locator(".nav-item", { hasText: "Today" }).click();
  const retained = await page.locator(".player-panel audio").evaluate((audio) => audio.dataset.persistenceCheck);
  if (retained !== "mounted" || !(await page.locator(".quran-page-hidden").count())) throw new Error("Quran player was remounted when leaving the tab");
  const unloggedPrayerButtons = page.locator(".log-button:not(.logged)");
  if ((await unloggedPrayerButtons.count()) === 0 || (await unloggedPrayerButtons.evaluateAll((buttons) => buttons.some((button) => !button.disabled)))) {
    throw new Error("A prayer that has not started can still be logged from Today");
  }
  await page.getByRole("button", { name: "Prayer log" }).click();
  if (!(await page.locator(".prayer-streak").textContent()).includes("2")) throw new Error("The individual-prayer streak was not shown in the Prayer Log");
  await page.getByRole("button", { name: "Settings" }).click();
  if (await page.getByLabel("Adhan volume").count()) throw new Error("Adhan volume is visible for the short-sound mode");
  await page.getByRole("radio", { name: "Full adhan" }).click();
  if ((await page.getByLabel("Adhan volume").count()) !== 1) throw new Error("Adhan volume did not appear for full adhan mode");
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable || undefined });
  await verifyInteractiveBehaviors(browser);
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
  updateState._updateStatus = { phase: "available", currentVersion: "0.1.0", availableVersion: "0.2.0", releaseUrl: "https://github.com/BadrElGezeri/athan-buddy/releases/tag/v0.2.0", releaseNotes: "A clearer prayer timeline\nFaster Quran search in English and Arabic\nSecurity improvements" };
  await openWithState(browser, updateState, "update-available-light-en");
  const celebrationState = makeState({ language: "en", theme: "light" });
  celebrationState._celebration = { count: 3 };
  await openWithState(browser, celebrationState, "streak-celebration-light-en", "Prayer log");
  const celebrationArabicState = makeState({ language: "ar", theme: "dark" });
  celebrationArabicState._celebration = { count: 3 };
  await openWithState(browser, celebrationArabicState, "streak-celebration-dark-ar", "سجل الصلوات");
  await browser.close();
  console.log(output);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

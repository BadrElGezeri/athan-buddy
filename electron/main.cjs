const { app, BrowserWindow, ipcMain, Menu, net, Notification, powerMonitor, protocol, session, shell, Tray } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const ADHAN_URL = "https://cdn.aladhan.com/audio/adhans/a9.mp3";
const isDev = !app.isPackaged;
const startupLaunch = process.argv.includes("--startup");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "athan-buddy",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, stream: true },
  },
]);

let mainWindow = null;
let tray = null;
let isQuitting = false;
let state = null;
let schedule = [];
let lastScheduleRefresh = 0;
let lastTickAt = Date.now();
const triggered = new Set();
const activeNotifications = new Set();
const snoozeTimers = new Set();
let updateStatus = { phase: "idle", currentVersion: app.getVersion() };
let updateCheckInterval = null;

const defaultState = {
  settings: {
    language: null,
    theme: null,
    calculationMethod: null,
    calculationMethodName: null,
    school: null,
    locationMode: null,
    location: null,
    notificationMode: "silent",
    reminderEnabled: true,
    reminderMinutes: 20,
    snoozeMinutes: 10,
    adhanVolume: 0.8,
    sidebarCollapsed: false,
    autoCheckUpdates: true,
    launchAtStartup: true,
    onboardingComplete: false,
  },
  prayerLogs: {},
  quran: {
    reciterId: null,
    moshafId: null,
    surahId: 1,
    volume: 0.8,
    muted: false,
  },
};

function storePath() {
  return path.join(app.getPath("userData"), "athan-buddy-data.json");
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return {
      ...cloneDefaultState(),
      ...parsed,
      settings: { ...cloneDefaultState().settings, ...(parsed.settings || {}) },
      quran: { ...cloneDefaultState().quran, ...(parsed.quran || {}) },
      prayerLogs: parsed.prayerLogs || {},
    };
  } catch {
    return cloneDefaultState();
  }
}

function saveState() {
  const target = storePath();
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(temporary, target);
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state:changed", state);
  }
  rebuildTrayMenu();
}

function setUpdateStatus(partial) {
  updateStatus = { ...updateStatus, ...partial, currentVersion: app.getVersion() };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status", updateStatus);
  }
  return updateStatus;
}

function isTrustedRendererUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (isDev) {
      return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname) && parsed.port === "5173";
    }
    return parsed.protocol === "athan-buddy:" && parsed.hostname === "app";
  } catch {
    return false;
  }
}

function registerAppProtocol() {
  const distRoot = path.resolve(__dirname, "..", "dist");
  protocol.handle("athan-buddy", (request) => {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname !== "app") return new Response("Not found", { status: 404 });
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
      const target = path.resolve(distRoot, relativePath);
      if (target !== distRoot && !target.startsWith(`${distRoot}${path.sep}`)) {
        return new Response("Not found", { status: 404 });
      }
      return net.fetch(pathToFileURL(target).toString());
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });
}

function trustedHandle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!event.senderFrame || !isTrustedRendererUrl(event.senderFrame.url)) {
      throw new Error("Blocked IPC request from an untrusted renderer");
    }
    return handler(event, ...args);
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function cleanText(value, maxLength = 160) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

function sanitizeLocation(location) {
  if (location === null) return null;
  if (!isPlainObject(location)) throw new Error("Invalid location");
  if (location.type === "city" && location.source === "manual") {
    const city = cleanText(location.city, 120);
    const country = cleanText(location.country, 120);
    if (!city || !country) throw new Error("Invalid city location");
    return { type: "city", source: "manual", city, country };
  }
  if (location.type === "coordinates" && ["precise", "ip"].includes(location.source)) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Invalid coordinates");
    }
    const next = { type: "coordinates", source: location.source, latitude, longitude };
    const city = cleanText(location.city, 120);
    const country = cleanText(location.country, 120);
    if (city) next.city = city;
    if (country) next.country = country;
    return next;
  }
  throw new Error("Invalid location");
}

function sanitizeSettingsPartial(partial) {
  if (!isPlainObject(partial)) throw new Error("Invalid settings update");
  const allowed = new Set([
    "language", "theme", "calculationMethod", "calculationMethodName", "school", "locationMode", "location",
    "notificationMode", "reminderEnabled", "reminderMinutes", "snoozeMinutes", "adhanVolume", "sidebarCollapsed",
    "autoCheckUpdates", "launchAtStartup", "onboardingComplete",
  ]);
  for (const key of Object.keys(partial)) if (!allowed.has(key)) throw new Error(`Unknown setting: ${key}`);
  const output = {};
  if (Object.hasOwn(partial, "language")) {
    if (partial.language !== null && !["en", "ar"].includes(partial.language)) throw new Error("Invalid language");
    output.language = partial.language;
  }
  if (Object.hasOwn(partial, "theme")) {
    if (partial.theme !== null && !["light", "dark"].includes(partial.theme)) throw new Error("Invalid theme");
    output.theme = partial.theme;
  }
  if (Object.hasOwn(partial, "calculationMethod")) {
    if (partial.calculationMethod !== null && (!Number.isInteger(partial.calculationMethod) || partial.calculationMethod < 0 || partial.calculationMethod > 100)) throw new Error("Invalid calculation method");
    output.calculationMethod = partial.calculationMethod;
  }
  if (Object.hasOwn(partial, "calculationMethodName")) {
    if (partial.calculationMethodName !== null && !cleanText(partial.calculationMethodName, 160)) throw new Error("Invalid calculation method name");
    output.calculationMethodName = partial.calculationMethodName === null ? null : cleanText(partial.calculationMethodName, 160);
  }
  if (Object.hasOwn(partial, "school")) {
    if (partial.school !== null && ![0, 1].includes(partial.school)) throw new Error("Invalid Asr school");
    output.school = partial.school;
  }
  if (Object.hasOwn(partial, "locationMode")) {
    if (partial.locationMode !== null && !["precise", "ip", "manual"].includes(partial.locationMode)) throw new Error("Invalid location mode");
    output.locationMode = partial.locationMode;
  }
  if (Object.hasOwn(partial, "location")) output.location = sanitizeLocation(partial.location);
  if (Object.hasOwn(partial, "notificationMode")) {
    if (!["adhan", "sound", "silent"].includes(partial.notificationMode)) throw new Error("Invalid notification mode");
    output.notificationMode = partial.notificationMode;
  }
  for (const key of ["reminderEnabled", "sidebarCollapsed", "autoCheckUpdates", "launchAtStartup", "onboardingComplete"]) {
    if (Object.hasOwn(partial, key)) {
      if (typeof partial[key] !== "boolean") throw new Error(`Invalid ${key}`);
      output[key] = partial[key];
    }
  }
  if (Object.hasOwn(partial, "reminderMinutes")) {
    if (!Number.isInteger(partial.reminderMinutes) || partial.reminderMinutes < 5 || partial.reminderMinutes > 120) throw new Error("Invalid reminder interval");
    output.reminderMinutes = partial.reminderMinutes;
  }
  if (Object.hasOwn(partial, "snoozeMinutes")) {
    if (![5, 10, 15].includes(partial.snoozeMinutes)) throw new Error("Invalid snooze interval");
    output.snoozeMinutes = partial.snoozeMinutes;
  }
  if (Object.hasOwn(partial, "adhanVolume")) {
    if (!Number.isFinite(partial.adhanVolume) || partial.adhanVolume < 0 || partial.adhanVolume > 1) throw new Error("Invalid adhan volume");
    output.adhanVolume = partial.adhanVolume;
  }
  return output;
}

function sanitizeQuranPartial(partial) {
  if (!isPlainObject(partial)) throw new Error("Invalid Quran settings");
  const allowed = new Set(["reciterId", "moshafId", "surahId", "volume", "muted"]);
  for (const key of Object.keys(partial)) if (!allowed.has(key)) throw new Error(`Unknown Quran setting: ${key}`);
  const output = {};
  for (const key of ["reciterId", "moshafId"]) {
    if (Object.hasOwn(partial, key)) {
      if (partial[key] !== null && (!Number.isInteger(partial[key]) || partial[key] < 1)) throw new Error(`Invalid ${key}`);
      output[key] = partial[key];
    }
  }
  if (Object.hasOwn(partial, "surahId")) {
    if (!Number.isInteger(partial.surahId) || partial.surahId < 1 || partial.surahId > 114) throw new Error("Invalid surah");
    output.surahId = partial.surahId;
  }
  if (Object.hasOwn(partial, "volume")) {
    if (!Number.isFinite(partial.volume) || partial.volume < 0 || partial.volume > 1) throw new Error("Invalid Quran volume");
    output.volume = partial.volume;
  }
  if (Object.hasOwn(partial, "muted")) {
    if (typeof partial.muted !== "boolean") throw new Error("Invalid mute setting");
    output.muted = partial.muted;
  }
  return output;
}

function brandAsset(name) {
  return path.join(__dirname, "..", "assets", "brand", name);
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function localizedText() {
  const arabic = state?.settings.language === "ar";
  return arabic
    ? { open: "فتح رفيق الأذان", quit: "خروج", tooltip: "رفيق الأذان" }
    : { open: "Open Athan Buddy", quit: "Quit", tooltip: "Athan Buddy" };
}

function rebuildTrayMenu() {
  if (!tray) return;
  const text = localizedText();
  tray.setToolTip(text.tooltip);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: text.open, click: showWindow },
      { type: "separator" },
      {
        label: text.quit,
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createTray() {
  tray = new Tray(brandAsset("tray.png"));
  tray.on("double-click", showWindow);
  tray.on("click", showWindow);
  rebuildTrayMenu();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 660,
    show: false,
    backgroundColor: "#0B1512",
    icon: brandAsset("athan-buddy-mark.png"),
    title: "Athan Buddy",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadURL("athan-buddy://app/");
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isTrustedRendererUrl(navigationUrl)) event.preventDefault();
  });

  mainWindow.once("ready-to-show", () => {
    if (!startupLaunch || !state.settings.onboardingComplete) showWindow();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function setStartup(enabled) {
  if (process.platform !== "win32") return false;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    enabled,
    name: "Athan Buddy",
    args: ["--startup"],
  });
  return app.getLoginItemSettings({ args: ["--startup"] }).openAtLogin;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Athan-Buddy/0.1",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function formatApiDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function apiDateToKey(date) {
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}`;
}

function fallbackIso(dateKey, timing) {
  const clean = String(timing).replace(/\s*\(.+\)$/, "").slice(0, 5);
  return new Date(`${dateKey}T${clean}:00`).toISOString();
}

async function fetchPrayerDay(date, settings) {
  if (!settings.location || settings.calculationMethod == null || settings.school == null) {
    throw new Error("Prayer settings are incomplete");
  }

  const apiDate = formatApiDate(date);
  const params = new URLSearchParams({
    method: String(settings.calculationMethod),
    school: String(settings.school),
    iso8601: "true",
  });

  let endpoint;
  if (settings.location.type === "city") {
    params.set("city", settings.location.city);
    params.set("country", settings.location.country);
    endpoint = `https://api.aladhan.com/v1/timingsByCity/${apiDate}?${params}`;
  } else {
    params.set("latitude", String(settings.location.latitude));
    params.set("longitude", String(settings.location.longitude));
    endpoint = `https://api.aladhan.com/v1/timings/${apiDate}?${params}`;
  }

  const response = await fetchJson(endpoint);
  if (response.code !== 200 || !response.data) throw new Error("Prayer provider returned an invalid response");
  const dateKey = apiDateToKey(response.data.date.gregorian.date);
  const timings = PRAYERS.map((name) => {
    const raw = response.data.timings[name];
    const iso = /^\d{4}-\d{2}-\d{2}T/.test(raw) ? raw : fallbackIso(dateKey, raw);
    return { name, time: raw, iso };
  });

  return {
    dateKey,
    readableDate: response.data.date.readable,
    hijriDate: `${response.data.date.hijri.day} ${response.data.date.hijri.month.en} ${response.data.date.hijri.year}`,
    hijriDateAr: `${response.data.date.hijri.day} ${response.data.date.hijri.month.ar} ${response.data.date.hijri.year}`,
    timezone: response.data.meta.timezone,
    methodName: response.data.meta.method.name,
    timings,
  };
}

async function fetchPrayerDays(settings) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return Promise.all([fetchPrayerDay(today, settings), fetchPrayerDay(tomorrow, settings)]);
}

async function refreshSchedule(force = false) {
  if (!state.settings.onboardingComplete) return;
  if (!force && Date.now() - lastScheduleRefresh < 15 * 60 * 1000) return;
  try {
    schedule = await fetchPrayerDays(state.settings);
    lastScheduleRefresh = Date.now();
  } catch (error) {
    console.error("Unable to refresh prayer schedule", error);
  }
}

function prayerLabel(prayer, language) {
  const ar = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
  return language === "ar" ? ar[prayer] : prayer;
}

function playAlertInRenderer(mode) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("alerts:play", mode);
  }
}

function togglePrayerLog(dateKey, prayer, forcePrayed = null) {
  const existing = state.prayerLogs[dateKey]?.[prayer]?.prayed === true;
  const prayed = forcePrayed == null ? !existing : forcePrayed;
  state.prayerLogs[dateKey] = state.prayerLogs[dateKey] || {};
  if (prayed) {
    state.prayerLogs[dateKey][prayer] = { prayed: true, loggedAt: new Date().toISOString() };
  } else {
    delete state.prayerLogs[dateKey][prayer];
    if (Object.keys(state.prayerLogs[dateKey]).length === 0) delete state.prayerLogs[dateKey];
  }
  saveState();
  broadcastState();
  return state;
}

function showNotification(payload) {
  if (!Notification.isSupported()) return;
  const { title, body, mode, dateKey, prayer } = payload;
  const language = state.settings.language || "en";
  const markText = language === "ar" ? "تمت الصلاة" : "Mark as prayed";
  const snoozeText = language === "ar" ? "ذكرني لاحقًا" : "Remind me later";
  const closeText = language === "ar" ? "إغلاق" : "Close";
  const actions = prayer
    ? [
        { type: "button", text: markText },
        { type: "button", text: snoozeText },
        { type: "button", text: closeText },
      ]
    : [{ type: "button", text: closeText }];
  const notification = new Notification({
    title,
    body,
    silent: true,
    icon: brandAsset("athan-buddy-mark.png"),
    timeoutType: "never",
    actions,
  });
  notification.on("click", showWindow);
  notification.on("action", (_event, index) => {
    if (prayer) {
      if (index === 0 && dateKey) {
        togglePrayerLog(dateKey, prayer, true);
        notification.close();
      } else if (index === 1) {
        notification.close();
        const timer = setTimeout(() => {
          snoozeTimers.delete(timer);
          showNotification({ ...payload, mode: "silent" });
        }, state.settings.snoozeMinutes * 60000);
        snoozeTimers.add(timer);
      } else if (index === 2) {
        notification.close();
      }
    } else if (index === 0) {
      notification.close();
    }
  });
  const release = () => activeNotifications.delete(notification);
  notification.on("close", release);
  notification.on("failed", release);
  activeNotifications.add(notification);
  notification.show();
  playAlertInRenderer(mode);
}

function notifyPrayer(day, prayer) {
  const language = state.settings.language || "en";
  const label = prayerLabel(prayer.name, language);
  showNotification({
    title: language === "ar" ? `حان وقت صلاة ${label}` : `It is time for ${label}`,
    body: language === "ar" ? "خذ لحظة واستعد للصلاة." : "Take a moment and prepare for prayer.",
    mode: state.settings.notificationMode,
    dateKey: day.dateKey,
    prayer: prayer.name,
  });
}

function notifyReminder(day, prayer, minutes) {
  const language = state.settings.language || "en";
  const label = prayerLabel(prayer.name, language);
  showNotification({
    title: language === "ar" ? `لم تُسجل صلاة ${label} بعد` : `${label} is not logged yet`,
    body: language === "ar" ? `باقي ${minutes} دقيقة على الصلاة التالية.` : `The next prayer is in ${minutes} minutes.`,
    mode: "silent",
    dateKey: day.dateKey,
    prayer: prayer.name,
  });
}

async function scheduleTick() {
  await refreshSchedule();
  if (schedule.length === 0) return;
  const now = Date.now();
  const previousTick = lastTickAt;
  lastTickAt = now;
  const flattened = schedule.flatMap((day) => day.timings.map((prayer) => ({ day, prayer })));

  for (const item of flattened) {
    const prayerTime = new Date(item.prayer.iso).getTime();
    const prayerKey = `prayer:${item.day.dateKey}:${item.prayer.name}`;
    if (prayerTime > previousTick && prayerTime <= now && !triggered.has(prayerKey)) {
      triggered.add(prayerKey);
      notifyPrayer(item.day, item.prayer);
    }
  }

  if (state.settings.reminderEnabled) {
    const lead = state.settings.reminderMinutes * 60000;
    for (let index = 0; index < flattened.length - 1; index += 1) {
      const current = flattened[index];
      const next = flattened[index + 1];
      const currentTime = new Date(current.prayer.iso).getTime();
      const nextTime = new Date(next.prayer.iso).getTime();
      const logged = state.prayerLogs[current.day.dateKey]?.[current.prayer.name]?.prayed === true;
      const reminderKey = `reminder:${current.day.dateKey}:${current.prayer.name}`;
      if (!logged && now > currentTime && now >= nextTime - lead && now < nextTime && !triggered.has(reminderKey)) {
        triggered.add(reminderKey);
        const minutes = Math.max(1, Math.ceil((nextTime - now) / 60000));
        notifyReminder(current.day, current.prayer, minutes);
      }
    }
  }

  if (triggered.size > 100) {
    const recentDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    for (const key of triggered) if (key.includes(":") && key.split(":")[1] < recentDate) triggered.delete(key);
  }
}

function plainReleaseNotes(info) {
  const raw = Array.isArray(info?.releaseNotes)
    ? info.releaseNotes.map((entry) => entry?.note || "").join("\n\n")
    : info?.releaseNotes || "";
  return String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2400);
}

function configureUpdater() {
  if (!app.isPackaged) {
    setUpdateStatus({ phase: "unavailable" });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => setUpdateStatus({ phase: "checking", error: undefined }));
  autoUpdater.on("update-available", (info) => setUpdateStatus({
    phase: "available",
    availableVersion: info.version,
    releaseNotes: plainReleaseNotes(info),
    percent: undefined,
    error: undefined,
    lastCheckedAt: new Date().toISOString(),
  }));
  autoUpdater.on("update-not-available", () => setUpdateStatus({
    phase: "up-to-date",
    availableVersion: undefined,
    releaseNotes: undefined,
    percent: undefined,
    error: undefined,
    lastCheckedAt: new Date().toISOString(),
  }));
  autoUpdater.on("download-progress", (progress) => setUpdateStatus({
    phase: "downloading",
    percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
    error: undefined,
  }));
  autoUpdater.on("update-downloaded", (info) => setUpdateStatus({
    phase: "ready",
    availableVersion: info.version,
    percent: 100,
    error: undefined,
  }));
  autoUpdater.on("error", (error) => setUpdateStatus({
    phase: "error",
    error: String(error?.message || "Update check failed").replace(/https?:\/\/\S+/g, "the update service").slice(0, 240),
  }));

  setTimeout(() => {
    if (state.settings.onboardingComplete && state.settings.autoCheckUpdates) checkForUpdates();
  }, 30000);
  updateCheckInterval = setInterval(() => {
    if (state.settings.onboardingComplete && state.settings.autoCheckUpdates) checkForUpdates();
  }, 12 * 60 * 60 * 1000);
}

async function checkForUpdates() {
  if (!app.isPackaged) return setUpdateStatus({ phase: "unavailable" });
  if (["checking", "downloading"].includes(updateStatus.phase)) return updateStatus;
  setUpdateStatus({ phase: "checking", error: undefined });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateStatus({ phase: "error", error: String(error?.message || "Update check failed").replace(/https?:\/\/\S+/g, "the update service").slice(0, 240) });
  }
  return updateStatus;
}

async function downloadUpdate() {
  if (updateStatus.phase !== "available") throw new Error("No update is ready to download");
  setUpdateStatus({ phase: "downloading", percent: 0, error: undefined });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    setUpdateStatus({ phase: "error", error: String(error?.message || "Update download failed").replace(/https?:\/\/\S+/g, "the update service").slice(0, 240) });
  }
  return updateStatus;
}

function registerIpc() {
  trustedHandle("state:get", () => state);

  trustedHandle("settings:update", async (_event, partial) => {
    const sanitized = sanitizeSettingsPartial(partial);
    state.settings = { ...state.settings, ...sanitized };
    saveState();
    if (Object.hasOwn(sanitized, "launchAtStartup")) {
      setStartup(sanitized.launchAtStartup);
    }
    broadcastState();
    if (sanitized.location || sanitized.calculationMethod != null || sanitized.school != null) {
      lastScheduleRefresh = 0;
      await refreshSchedule(true);
    }
    if (sanitized.onboardingComplete === true && state.settings.autoCheckUpdates) {
      setTimeout(checkForUpdates, 5000);
    }
    return state;
  });

  trustedHandle("quran:update", (_event, partial) => {
    state.quran = { ...state.quran, ...sanitizeQuranPartial(partial) };
    saveState();
    broadcastState();
    return state;
  });

  trustedHandle("logs:toggle", (_event, dateKey, prayer) => {
    if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(new Date(`${dateKey}T12:00:00`).getTime())) throw new Error("Invalid prayer date");
    if (!PRAYERS.includes(prayer)) throw new Error("Invalid prayer name");
    return togglePrayerLog(dateKey, prayer);
  });

  trustedHandle("prayer:methods", async () => {
    const response = await fetchJson("https://api.aladhan.com/v1/methods");
    return Object.values(response.data)
      .filter((method) => typeof method.id === "number" && method.name)
      .map((method) => ({ id: method.id, name: method.name }))
      .sort((a, b) => a.id - b.id);
  });

  trustedHandle("prayer:days", () => fetchPrayerDays(state.settings));

  trustedHandle("location:ip", async () => {
    const response = await fetchJson("https://ipwho.is/");
    if (!response.success || !Number.isFinite(response.latitude) || !Number.isFinite(response.longitude)) {
      throw new Error(response.message || "IP location was unavailable");
    }
    return {
      type: "coordinates",
      source: "ip",
      latitude: response.latitude,
      longitude: response.longitude,
      city: response.city,
      country: response.country,
    };
  });

  trustedHandle("location:reverse", async (_event, latitude, longitude) => {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Invalid coordinates");
    }
    const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: "en" });
    const response = await fetchJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
    const city = response.city || response.locality || response.principalSubdivision;
    const country = response.countryName;
    if (!city || !country) throw new Error("The city and country could not be determined");
    return { type: "coordinates", source: "precise", latitude, longitude, city, country };
  });

  trustedHandle("quran:reciters", async (_event, language) => {
    if (!["en", "ar"].includes(language)) throw new Error("Invalid language");
    const code = language === "ar" ? "ar" : "eng";
    const response = await fetchJson(`https://www.mp3quran.net/api/v3/reciters?language=${code}`);
    return response.reciters || [];
  });

  trustedHandle("quran:surahs", async (_event, language) => {
    if (!["en", "ar"].includes(language)) throw new Error("Invalid language");
    const code = language === "ar" ? "ar" : "eng";
    const response = await fetchJson(`https://www.mp3quran.net/api/v3/suwar?language=${code}`);
    return response.suwar || [];
  });

  trustedHandle("app:startup", (_event, enabled) => {
    if (typeof enabled !== "boolean") throw new Error("Invalid startup setting");
    return setStartup(enabled);
  });

  trustedHandle("app:open-external", async (_event, url) => {
    const target = new URL(url);
    if (target.origin !== "https://badrelgezeri.me") throw new Error("This web link is not allowed");
    await shell.openExternal(target.toString());
  });

  trustedHandle("updates:get-status", () => updateStatus);
  trustedHandle("updates:check", () => checkForUpdates());
  trustedHandle("updates:download", () => downloadUpdate());
  trustedHandle("updates:install", () => {
    if (updateStatus.phase !== "ready") throw new Error("The update has not finished downloading");
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
  });

  trustedHandle("alerts:test", (_event, mode) => {
    if (!["adhan", "sound", "silent"].includes(mode)) throw new Error("Invalid alert mode");
    const language = state.settings.language || "en";
    showNotification({
      title: language === "ar" ? "تجربة رفيق الأذان" : "Athan Buddy test",
      body: language === "ar" ? "تنبيه الصلاة جاهز." : "Your prayer alert is ready.",
      mode,
    });
  });
}

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on("second-instance", showWindow);
  app.whenReady().then(() => {
    app.setAppUserModelId("com.athanbuddy.desktop");
    state = loadState();
    registerAppProtocol();

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      const rendererUrl = webContents?.getURL?.() || requestingOrigin;
      return isTrustedRendererUrl(rendererUrl) && permission === "geolocation";
    });
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(isTrustedRendererUrl(webContents.getURL()) && permission === "geolocation");
    });

    registerIpc();
    createWindow();
    createTray();
    configureUpdater();

    if (state.settings.onboardingComplete && state.settings.launchAtStartup) setStartup(true);
    refreshSchedule(true);
    setInterval(scheduleTick, 30000);
    setInterval(() => refreshSchedule(true), 4 * 60 * 60 * 1000);
    powerMonitor.on("resume", () => {
      lastScheduleRefresh = 0;
      scheduleTick();
    });
  });
}

app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  isQuitting = true;
  if (updateCheckInterval) clearInterval(updateCheckInterval);
  for (const timer of snoozeTimers) clearTimeout(timer);
});

module.exports = { ADHAN_URL };

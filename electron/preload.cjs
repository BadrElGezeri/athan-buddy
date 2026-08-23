const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("athanBuddy", {
  getState: () => ipcRenderer.invoke("state:get"),
  updateSettings: (settings) => ipcRenderer.invoke("settings:update", settings),
  updateQuran: (quran) => ipcRenderer.invoke("quran:update", quran),
  togglePrayer: (dateKey, prayer) => ipcRenderer.invoke("logs:toggle", dateKey, prayer),
  getCalculationMethods: () => ipcRenderer.invoke("prayer:methods"),
  fetchPrayerDays: (settings) => ipcRenderer.invoke("prayer:days", settings),
  detectIpLocation: () => ipcRenderer.invoke("location:ip"),
  reverseLocation: (latitude, longitude) => ipcRenderer.invoke("location:reverse", latitude, longitude),
  getReciters: (language) => ipcRenderer.invoke("quran:reciters", language),
  getSurahs: (language) => ipcRenderer.invoke("quran:surahs", language),
  getAyahTimings: (server, surahId) => ipcRenderer.invoke("quran:ayah-timings", server, surahId),
  setStartup: (enabled) => ipcRenderer.invoke("app:startup", enabled),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  getUpdateStatus: () => ipcRenderer.invoke("updates:get-status"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  openUpdateRelease: () => ipcRenderer.invoke("updates:open-release"),
  testAlert: (mode) => ipcRenderer.invoke("alerts:test", mode),
  onPrayerAlert: (callback) => {
    const listener = (_event, mode) => callback(mode);
    ipcRenderer.on("alerts:play", listener);
    return () => ipcRenderer.removeListener("alerts:play", listener);
  },
  onStreakCelebration: (callback) => {
    const listener = (_event, celebration) => callback(celebration);
    ipcRenderer.on("streak:celebrate", listener);
    return () => ipcRenderer.removeListener("streak:celebrate", listener);
  },
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("state:changed", listener);
    return () => ipcRenderer.removeListener("state:changed", listener);
  },
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  },
});

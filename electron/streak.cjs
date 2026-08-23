const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function moveDateKey(dateKey, offset) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function makeSlotKey(dateKey, prayerIndex) {
  return `${dateKey}#${prayerIndex}`;
}

function slotDateKey(slotKey) {
  return typeof slotKey === "string" ? slotKey.slice(0, 10) : null;
}

function latestFloorDate(prayerLogs, breakAt, todayKey) {
  const loggedDates = Object.keys(prayerLogs).filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey));
  const candidates = [moveDateKey(todayKey, -1), ...loggedDates];
  const breakDate = slotDateKey(breakAt);
  if (breakDate) candidates.push(breakDate);
  const earliest = candidates.sort()[0];
  return moveDateKey(earliest, -1);
}

function timingMap(schedule) {
  return new Map(schedule.flatMap((day) => day.timings.map((timing) => [
    makeSlotKey(day.dateKey, PRAYERS.indexOf(timing.name)),
    new Date(timing.iso).getTime(),
  ])));
}

function calculatePrayerStreak({ prayerLogs, previous, schedule, now = Date.now() }) {
  const prior = previous && typeof previous === "object" ? previous : {};
  const previousBreak = typeof prior.breakAt === "string" ? prior.breakAt : null;
  const best = Number.isSafeInteger(prior.best) && prior.best >= 0 ? prior.best : 0;
  const todayKey = localDateKey(new Date(now));
  const yesterdayKey = moveDateKey(todayKey, -1);
  const floorDate = latestFloorDate(prayerLogs, previousBreak, todayKey);
  const timings = timingMap(schedule);
  let current = 0;
  let breakAt = previousBreak;

  for (let dateKey = todayKey; dateKey >= floorDate; dateKey = moveDateKey(dateKey, -1)) {
    for (let prayerIndex = PRAYERS.length - 1; prayerIndex >= 0; prayerIndex -= 1) {
      const prayer = PRAYERS[prayerIndex];
      const key = makeSlotKey(dateKey, prayerIndex);
      if (breakAt && key <= breakAt) {
        return { current, best: Math.max(best, current), breakAt };
      }

      const exactDueAt = timings.get(key);
      const definitelyExpired = dateKey < yesterdayKey;
      if (exactDueAt == null && !definitelyExpired) continue;
      if (exactDueAt != null && exactDueAt > now) continue;

      const logged = prayerLogs[dateKey]?.[prayer]?.prayed === true;
      const expired = !logged && (definitelyExpired || (exactDueAt != null && now >= exactDueAt + DAY_MS));
      if (expired) {
        breakAt = key;
        return { current, best: Math.max(best, current), breakAt };
      }
      if (logged) current += 1;
    }
  }

  return { current, best: Math.max(best, current), breakAt };
}

module.exports = { calculatePrayerStreak };

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function prayerHasStarted({ schedule, dateKey, prayer, now = Date.now() }) {
  const todayKey = localDateKey(new Date(now));
  if (dateKey > todayKey) return false;
  if (dateKey < todayKey) return true;

  const day = schedule.find((item) => item.dateKey === dateKey);
  const timing = day?.timings.find((item) => item.name === prayer);
  return Boolean(timing && new Date(timing.iso).getTime() <= now);
}

module.exports = { localDateKey, prayerHasStarted };

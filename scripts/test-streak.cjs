const assert = require("node:assert/strict");
const { calculatePrayerStreak } = require("../electron/streak.cjs");

const schedule = [
  {
    dateKey: "2026-08-22",
    timings: [
      { name: "Fajr", iso: "2026-08-22T05:00:00+03:00" },
      { name: "Dhuhr", iso: "2026-08-22T13:00:00+03:00" },
      { name: "Asr", iso: "2026-08-22T16:30:00+03:00" },
      { name: "Maghrib", iso: "2026-08-22T18:30:00+03:00" },
      { name: "Isha", iso: "2026-08-22T20:00:00+03:00" },
    ],
  },
  {
    dateKey: "2026-08-23",
    timings: [
      { name: "Fajr", iso: "2026-08-23T05:00:00+03:00" },
      { name: "Dhuhr", iso: "2026-08-23T13:00:00+03:00" },
      { name: "Asr", iso: "2026-08-23T16:30:00+03:00" },
      { name: "Maghrib", iso: "2026-08-23T18:30:00+03:00" },
      { name: "Isha", iso: "2026-08-23T20:00:00+03:00" },
    ],
  },
  {
    dateKey: "2026-08-24",
    timings: [
      { name: "Fajr", iso: "2026-08-24T05:00:00+03:00" },
      { name: "Dhuhr", iso: "2026-08-24T13:00:00+03:00" },
      { name: "Asr", iso: "2026-08-24T16:30:00+03:00" },
      { name: "Maghrib", iso: "2026-08-24T18:30:00+03:00" },
      { name: "Isha", iso: "2026-08-24T20:00:00+03:00" },
    ],
  },
];

const logged = (names, dateKey = "2026-08-23") => ({
  [dateKey]: Object.fromEntries(names.map((name) => [name, { prayed: true, loggedAt: "2026-08-23T18:00:00Z" }])),
});

const beforeExpiry = new Date("2026-08-23T18:00:00+03:00").getTime();
const pending = calculatePrayerStreak({
  prayerLogs: logged(["Fajr", "Asr"]),
  previous: { current: 0, best: 0, breakAt: "2026-08-22#4" },
  schedule,
  now: beforeExpiry,
});
assert.equal(pending.current, 2, "a prayer pending for less than 24 hours must not break the streak");

const complete = calculatePrayerStreak({
  prayerLogs: logged(["Fajr", "Dhuhr", "Asr"]),
  previous: { current: 0, best: 0, breakAt: "2026-08-22#4" },
  schedule,
  now: beforeExpiry,
});
assert.equal(complete.current, 3, "each logged prayer must add one to the streak");

const afterExpiry = new Date("2026-08-24T14:00:01+03:00").getTime();
const broken = calculatePrayerStreak({
  prayerLogs: {
    ...logged(["Fajr", "Asr"]),
    "2026-08-24": { Fajr: { prayed: true, loggedAt: "2026-08-24T06:00:00Z" } },
  },
  previous: { current: 2, best: 2, breakAt: "2026-08-22#4" },
  schedule,
  now: afterExpiry,
});
assert.equal(broken.breakAt, "2026-08-23#1", "an unlogged prayer must become a permanent break after 24 hours");
assert.equal(broken.current, 2, "only newer logged prayers remain after the break");

const cannotRestore = calculatePrayerStreak({
  prayerLogs: logged(["Fajr", "Dhuhr", "Asr"]),
  previous: broken,
  schedule,
  now: afterExpiry,
});
assert.equal(cannotRestore.breakAt, broken.breakAt, "logging after the 24-hour deadline must not restore the old streak");

console.log("Prayer streak tests passed");

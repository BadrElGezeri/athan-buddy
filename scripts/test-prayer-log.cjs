const assert = require("node:assert/strict");
const { prayerHasStarted } = require("../electron/prayer-log.cjs");

const now = new Date("2026-08-23T18:00:00+03:00").getTime();
const schedule = [
  {
    dateKey: "2026-08-23",
    timings: [
      { name: "Asr", iso: "2026-08-23T16:30:00+03:00" },
      { name: "Isha", iso: "2026-08-23T20:00:00+03:00" },
    ],
  },
  {
    dateKey: "2026-08-24",
    timings: [
      // A bad upstream timestamp must never make a future day's prayer loggable.
      { name: "Fajr", iso: "2026-08-22T05:00:00+03:00" },
    ],
  },
];

assert.equal(prayerHasStarted({ schedule, dateKey: "2026-08-22", prayer: "Isha", now }), true, "past dates remain loggable");
assert.equal(prayerHasStarted({ schedule, dateKey: "2026-08-23", prayer: "Asr", now }), true, "a prayer earlier today is loggable");
assert.equal(prayerHasStarted({ schedule, dateKey: "2026-08-23", prayer: "Isha", now }), false, "a prayer later today is not loggable");
assert.equal(prayerHasStarted({ schedule, dateKey: "2026-08-24", prayer: "Fajr", now }), false, "future dates are never loggable");

console.log("Prayer log eligibility tests passed");

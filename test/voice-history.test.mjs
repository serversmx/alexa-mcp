// Offline checks for src/voice-history.js (no Amazon session needed). Run: npm test
import assert from 'node:assert/strict';
import { nightWindows, collectHistory, formatRecord } from '../src/voice-history.js';

const U = (...a) => Date.UTC(...a);
const iso = (w) => w.map(([s, e]) => [new Date(s).toISOString(), new Date(e).toISOString()]);

// 1. Plain nights, noon CDT on Oct 18: tonight hasn't started, so newest is Oct 17->18.
let w = nightWindows({ days: 3, startHour: 22, endHour: 7, timeZone: 'America/Chicago', now: U(2026, 9, 18, 17) });
assert.deepEqual(w, [
  [U(2026, 9, 18, 3), U(2026, 9, 18, 12)],
  [U(2026, 9, 17, 3), U(2026, 9, 17, 12)],
  [U(2026, 9, 16, 3), U(2026, 9, 16, 12)],
]);

// 2. DST ends Nov 1 2026: 22:00 CDT -> 07:00 CST is a 10h night.
w = nightWindows({ days: 1, startHour: 22, endHour: 7, timeZone: 'America/Chicago', now: U(2026, 10, 1, 18) });
assert.deepEqual(w, [[U(2026, 10, 1, 3), U(2026, 10, 1, 13)]]);

// 3. DST starts Mar 8 2026: 22:00 CST -> 07:00 CDT is an 8h night.
w = nightWindows({ days: 1, startHour: 22, endHour: 7, timeZone: 'America/Chicago', now: U(2026, 2, 8, 18) });
assert.deepEqual(w, [[U(2026, 2, 8, 4), U(2026, 2, 8, 12)]]);

// 4. Same-day window (00-06 CT).
w = nightWindows({ days: 1, startHour: 0, endHour: 6, timeZone: 'America/Chicago', now: U(2026, 9, 18, 17) });
assert.deepEqual(w, [[U(2026, 9, 18, 5), U(2026, 9, 18, 11)]]);

// 5. Mid-night "now" (00:00 CDT Oct 18): current night is clamped to now.
w = nightWindows({ days: 2, startHour: 22, endHour: 7, timeZone: 'America/Chicago', now: U(2026, 9, 18, 5) });
assert.deepEqual(w, [[U(2026, 9, 18, 3), U(2026, 9, 18, 5)], [U(2026, 9, 17, 3), U(2026, 9, 17, 12)]]);

// 6. Eastern zone, and month boundary (Oct 1 -> Sep 30).
w = nightWindows({ days: 2, startHour: 22, endHour: 7, timeZone: 'America/New_York', now: U(2026, 9, 1, 16) });
assert.deepEqual(w, [[U(2026, 9, 1, 2), U(2026, 9, 1, 11)], [U(2026, 8, 30, 2), U(2026, 8, 30, 11)]]);

// 7. Paging: 37 records in a 9h window, API returns newest 10 per call and
// ignores everything outside [start, end]. Expect all 37 back, sorted, deduped.
const start = U(2026, 9, 18, 3), end = U(2026, 9, 18, 12);
const data = Array.from({ length: 37 }, (_, i) => ({ timestamp: start + i * 13 * 60 * 1000 + 7, serialNumber: i % 2 ? 'NYC' : 'CHI', said: `r${i}` }));
let calls = 0;
const fetchFn = async (s, e) => { calls++; return data.filter((r) => r.timestamp >= s && r.timestamp <= e).sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); };
let res = await collectHistory(fetchFn, [[start, end]]);
assert.equal(res.records.length, 37);
assert.deepEqual(res.records.map((r) => r.said), data.map((r) => r.said));
assert.equal(res.truncated.length, 0);


// 8. Burst denser than the cap inside the minimum window -> reported as truncated.
const burst = Array.from({ length: 12 }, (_, i) => ({ timestamp: start + i * 1000, serialNumber: 'NYC', said: `b${i}` }));
const fetchBurst = async (s, e) => burst.filter((r) => r.timestamp >= s && r.timestamp <= e).slice(0, 10);
res = await collectHistory(fetchBurst, [[start, end]]);
assert.equal(res.truncated.length, 1);
assert.equal(res.records.length, 10);

// 9. Formatting in several zones.
assert.deepEqual(formatRecord({ timestamp: U(2026, 9, 18, 7, 41), device: 'X', said: 'turn on bedroom lights', alexa: '', serialNumber: 'S' }, ['America/Chicago', 'America/New_York']),
  { time: { 'America/Chicago': '2026-10-18 02:41', 'America/New_York': '2026-10-18 03:41' }, device: 'X', said: 'turn on bedroom lights', alexa: '', serialNumber: 'S' });

// 10. Equal start/end hour -> whole-day windows.
w = nightWindows({ days: 1, startHour: 0, endHour: 0, timeZone: 'America/Chicago', now: U(2026, 9, 18, 17) });
assert.deepEqual(w, [[U(2026, 9, 18, 5), U(2026, 9, 18, 17)]]);



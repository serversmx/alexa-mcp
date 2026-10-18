// Helpers for alexa_get_voice_history. Pure functions with no network access,
// so the window math and paging can be checked without an Amazon session.

const PARTS_FORMAT = {
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

function zonedParts(epochMs, timeZone) {
  const parts = {};
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, ...PARTS_FORMAT });
  for (const { type, value } of formatter.formatToParts(new Date(epochMs))) {
    parts[type] = value;
  }
  return parts;
}

/** Offset of `timeZone` from UTC at `epochMs`, in ms (e.g. -5h during CDT). */
function zoneOffsetMs(epochMs, timeZone) {
  const p = zonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/** UTC instant of `hour`:00 on local day (year, month0, day) in `timeZone`. */
function zonedHourToEpoch(year, month0, day, hour, timeZone) {
  const guess = Date.UTC(year, month0, day, hour);
  const first = guess - zoneOffsetMs(guess, timeZone);
  // Re-check at the candidate instant in case a DST switch lies in between.
  return guess - zoneOffsetMs(first, timeZone);
}

/**
 * One [startMs, endMs] window per night, newest first. A window whose end
 * hour is at or before its start hour runs past midnight into the next day.
 * Nights that haven't started yet are skipped; the current one ends at `now`.
 */
export function nightWindows({ days, startHour, endHour, timeZone, now = Date.now() }) {
  const today = zonedParts(now, timeZone);
  const year = +today.year;
  const month0 = +today.month - 1;
  const day = +today.day;
  const crossesMidnight = endHour <= startHour;

  const windows = [];
  for (let k = 0; windows.length < days && k <= days; k++) {
    const start = zonedHourToEpoch(year, month0, day - k, startHour, timeZone);
    const end = zonedHourToEpoch(
      year,
      month0,
      day - k + (crossesMidnight ? 1 : 0),
      endHour,
      timeZone
    );
    if (start >= now) continue;
    windows.push([start, Math.min(end, now)]);
  }
  return windows;
}

/**
 * Fetch every window through `fetchFn(startMs, endMs)`. alexa-remote2 returns
 * a single page per request, so a window that comes back full is split in
 * half and fetched again until pages fit or the window reaches `minWindowMs`
 * (those are reported in `truncated`).
 */
export async function collectHistory(
  fetchFn,
  windows,
  { pageCap = 10, minWindowMs = 5 * 60 * 1000 } = {}
) {
  const byKey = new Map();
  const truncated = [];

  async function visit(start, end) {
    const page = await fetchFn(start, end);
    const inWindow = page.filter((r) => r.timestamp >= start && r.timestamp <= end);
    if (inWindow.length >= pageCap) {
      if (end - start > minWindowMs) {
        const mid = Math.floor((start + end) / 2);
        await visit(start, mid);
        await visit(mid, end);
        return;
      }
      truncated.push([start, end]);
    }
    for (const r of inWindow) byKey.set(`${r.timestamp}|${r.serialNumber}`, r);
  }

  for (const [start, end] of windows) await visit(start, end);
  const records = [...byKey.values()].sort((a, b) => a.timestamp - b.timestamp);
  return { records, truncated };
}

function wallClock(epochMs, timeZone) {
  const p = zonedParts(epochMs, timeZone);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/**
 * Record with its wall-clock time in each of `timeZones` (handy when the
 * Echos in one account live in different zones), keyed by zone name.
 */
export function formatRecord(r, timeZones) {
  return {
    time: Object.fromEntries(timeZones.map((tz) => [tz, wallClock(r.timestamp, tz)])),
    device: r.device,
    said: r.said,
    alexa: r.alexa,
    serialNumber: r.serialNumber,
  };
}

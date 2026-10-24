import { movies } from '@/data/catalog';

export const DAILY_TZ = 'Europe/Stockholm';
const MIN_SCORE = 7;
const MIN_POOL = 30;

// Calendar date in Stockholm, as YYYY-MM-DD.
export function stockholmDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayNumber(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// FNV-1a 32-bit — stable across browsers and reloads.
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// mulberry32 PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(list, seedStr) {
  const out = [...list];
  const rand = rng(hashString(seedStr));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const streamable = (m) => Array.isArray(m.retailers) && m.retailers.length > 0;

// Stable, id-sorted pool so catalog order changes don't reshuffle history.
function eligiblePool() {
  const base = movies.filter(streamable);
  let pool = base.filter((m) => typeof m.imdbScore === 'number' && m.imdbScore >= MIN_SCORE);
  if (pool.length < MIN_POOL) pool = base.filter((m) => m.imdbScore == null || m.imdbScore >= MIN_SCORE);
  if (!pool.length) pool = base.length ? base : movies;
  return [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * One film per Stockholm calendar day. The eligible list is shuffled once per
 * "cycle" (pool length days), and each day walks one step, so no repeats until
 * the whole pool has been shown.
 */
export function getDailyPicks(dateKey = stockholmDateKey(), backupCount = 3) {
  const pool = eligiblePool();
  const n = pool.length;
  const day = dayNumber(dateKey);
  const cycle = Math.floor(day / n);
  const order = seededShuffle(pool, `tonight-daily-${cycle}`);
  const pick = order[((day % n) + n) % n];

  const rest = seededShuffle(
    pool.filter((m) => m.id !== pick.id),
    `tonight-backup-${dateKey}`,
  );
  // Prefer backups in a different lead mood, so "not today" really offers a change.
  const backups = [];
  const usedMoods = new Set([pick.moods?.[0]]);
  for (const m of rest) {
    if (backups.length >= backupCount) break;
    if (!usedMoods.has(m.moods?.[0])) {
      backups.push(m);
      usedMoods.add(m.moods?.[0]);
    }
  }
  for (const m of rest) {
    if (backups.length >= backupCount) break;
    if (!backups.includes(m)) backups.push(m);
  }

  return { dateKey, pick, backups, poolSize: n };
}

function stockholmClock(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get('hour') * 3600 + get('minute') * 60 + get('second');
}

// Milliseconds until the Stockholm date rolls over (DST-safe).
export function msUntilStockholmMidnight(now = new Date()) {
  const today = stockholmDateKey(now);
  let ms = (86400 - stockholmClock(now)) * 1000 - now.getMilliseconds();
  // Adjust for DST days (23h / 25h) by nudging until the date actually flips.
  for (let i = 0; i < 3; i += 1) {
    const at = new Date(now.getTime() + ms);
    const key = stockholmDateKey(at);
    const secs = stockholmClock(at);
    if (key !== today && secs === 0) break;
    if (key === today) ms += (86400 - secs) * 1000;
    else ms -= secs * 1000;
  }
  return Math.max(0, ms);
}

export function formatStockholmDate(dateKey, locale = 'en-GB') {
  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, mo - 1, d)));
}

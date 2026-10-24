import { movies, normalizeGenre } from '@/data/catalog';

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Films on at least one service every member has, scored by IMDb + the group's liked moods/genres. */
export function recommendForRoom(room, shared, { exclude = new Set(), limit = 30 } = {}) {
  if (!room || !shared.length) return [];
  const members = room.members || [];
  // Normalise each member's likes so one enthusiastic swiper doesn't drown the others.
  const prefs = members.map((m) => {
    const moods = m.likes?.moods || {};
    const genres = m.likes?.genres || {};
    const total = Object.values(moods).reduce((a, b) => a + b, 0) + Object.values(genres).reduce((a, b) => a + b, 0) || 1;
    return { moods, genres, total };
  });
  const seed = room.code || '';
  return movies
    .filter((m) => m.retailers.some((r) => shared.includes(r)) && !exclude.has(m.id))
    .map((m) => {
      let taste = 0;
      for (const p of prefs) {
        let s = 0;
        for (const mood of m.moods) s += p.moods[mood] || 0;
        for (const g of m.genres) s += p.genres[normalizeGenre(g)] || p.genres[g] || 0;
        taste += s / p.total;
      }
      const imdb = typeof m.imdbScore === 'number' ? m.imdbScore : 6.6;
      const jitter = (hash(seed + m.id) % 1000) / 1000;
      return { movie: m, score: imdb + taste * 2.2 + jitter * 0.9 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.movie);
}

export function searchShared(query, shared, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q || !shared.length) return [];
  return movies
    .filter((m) => m.retailers.some((r) => shared.includes(r)) && m.title.toLowerCase().includes(q))
    .sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0))
    .slice(0, limit);
}

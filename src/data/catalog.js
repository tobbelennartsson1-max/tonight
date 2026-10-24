import live from './live.json';
import {
  movies as snapshotMovies,
  MOODS,
  RETAILERS,
  GENRE_PILLS,
  GENRE_ALIASES,
  SUBGENRES,
  normalizeGenre,
  movieHasGenre,
  pickRandom,
  getRetailer,
} from './movies.js';

export {
  MOODS,
  RETAILERS,
  GENRE_PILLS,
  GENRE_ALIASES,
  SUBGENRES,
  normalizeGenre,
  movieHasGenre,
  pickRandom,
  getRetailer,
  snapshotMovies,
};

const liveMovies = Array.isArray(live?.movies) ? live.movies : [];

export const movies = liveMovies.length ? liveMovies : snapshotMovies;

export const catalogMeta = {
  updatedAt: live?.updatedAt || null,
  region: live?.region || 'SE',
  sources: Array.isArray(live?.sources) && live.sources.length ? live.sources : ['IMDb', 'JustWatch'],
  live: liveMovies.length > 0,
};

export function getMoviesByMood(mood) {
  return movies.filter((m) => m.moods.includes(mood));
}

export function getMovieById(id) {
  return movies.find((m) => m.id === id) || null;
}

export function getMoviesByRetailer(id) {
  return movies.filter((m) => m.retailers.includes(id));
}

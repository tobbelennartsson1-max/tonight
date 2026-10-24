#!/usr/bin/env node
/**
 * Refresh Tonight's catalog from JustWatch (Sweden FLATRATE) + IMDb scores
 * JustWatch already returns. Not an official Netflix/Disney/Prime/Viaplay API.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  snapshotMovies,
  GENRE_PILLS,
  SUBGENRES,
  MOODS,
  movieHasGenre,
} from '../src/data/movies.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'src/data/live.json');

const ENDPOINT = 'https://apis.justwatch.com/graphql';
const COUNTRY = 'SE';
const LANGUAGE = 'en';
const PAGE_SIZE = 50;
const PAGES_PER_PROVIDER = 2;
const REQUEST_GAP_MS = 400;

const PROVIDERS = [
  { shortName: 'nfx', retailer: 'netflix', label: 'Netflix' },
  { shortName: 'dnp', retailer: 'disney', label: 'Disney+' },
  { shortName: 'prv', retailer: 'prime', label: 'Prime Video' },
  { shortName: 'vip', retailer: 'viaplay', label: 'Viaplay' },
];

const SHORT_TO_RETAILER = {
  nfx: 'netflix',
  dnp: 'disney',
  prv: 'prime',
  vip: 'viaplay',
  mxx: 'hbo',
  hbm: 'hbo',
  hbo: 'hbo',
  play: 'hbo',
};

const QUERY = `query ($country: Country!, $filter: TitleFilter, $after: String) {
  popularTitles(country: $country, first: ${PAGE_SIZE}, after: $after, filter: $filter) {
    pageInfo { hasNextPage endCursor }
    totalCount
    edges {
      node {
        id
        objectType
        content(country: $country, language: "${LANGUAGE}") {
          title
          originalReleaseYear
          shortDescription
          posterUrl
          genres { technicalName translation(language: "${LANGUAGE}") }
          scoring { imdbScore imdbVotes }
          runtime
        }
        offers(country: $country, platform: WEB) {
          monetizationType
          package { technicalName clearName shortName }
        }
      }
    }
  }
}`;

const GENRE_MAP = {
  action: 'Action',
  adventure: 'Adventure',
  animation: 'Animated',
  animated: 'Animated',
  comedy: 'Comedy',
  drama: 'Drama',
  fantasy: 'Fantasy',
  history: 'Historical',
  historical: 'Historical',
  horror: 'Horror',
  scifi: 'Sci-Fi',
  'sci-fi': 'Sci-Fi',
  science_fiction: 'Sci-Fi',
  'science-fiction': 'Sci-Fi',
  'science fiction': 'Sci-Fi',
  thriller: 'Thriller',
  romance: 'Romance',
  crime: 'Crime',
  family: 'Family',
  sport: 'Sport',
  sports: 'Sport',
  war: 'War',
  western: 'Western',
  documentary: 'Documentary',
  music: 'Music',
  musical: 'Musical',
  mystery: 'Mystery',
  biography: 'Biography',
  reality: 'Reality',
  european: 'European',
  sportfilm: 'Sport',
};

const SUBGENRE_RULES = [
  { re: /\bvampires?\b/, sub: 'Vampire', parent: 'Horror' },
  { re: /\bwerewol(?:f|ves)\b/, sub: 'Werewolf', parent: 'Horror' },
  { re: /\bzombies?\b/, sub: 'Zombie', parent: 'Horror' },
  { re: /\b(?:ghosts?|haunted|haunting)\b/, sub: 'Ghost', parent: 'Horror' },
  { re: /\bslasher\b/, sub: 'Slasher', parent: 'Horror' },
  { re: /\bfound footage\b/, sub: 'Found footage', parent: 'Horror' },
  { re: /\b(?:splatter|gore)\b/, sub: 'Splatter', parent: 'Horror' },
  { re: /\bsupernatural\b/, sub: 'Supernatural horror', parent: 'Horror' },
  { re: /\b(?:monsters?|kaiju|creature feature)\b/, sub: 'Monster', parent: 'Horror' },
  { re: /\b(?:superheroes?|marvel|dc comics|batman|superman|spider-?man|avengers|x-men|wonder woman|black panther)\b/, sub: 'Superhero', parent: 'Action' },
  { re: /\b(?:martial arts|kung fu|karate|wuxia|judo|taekwondo)\b/, sub: 'Martial arts', parent: 'Action' },
  { re: /\b(?:spy|spies|espionage|cia|mi6|james bond|00\d)\b/, sub: 'Spy', parent: 'Action' },
  { re: /\b(?:world war|wwii|ww2|wwi\b|vietnam war|civil war|korean war)\b/, sub: 'War', parent: 'Action' },
  { re: /\b(?:disaster|earthquake|tsunami|asteroid|volcano)\b/, sub: 'Disaster', parent: 'Action' },
  { re: /\bpirates?\b/, sub: 'Pirate', parent: 'Adventure' },
  { re: /\bsamurai\b/, sub: 'Samurai', parent: 'Adventure' },
  { re: /\bswashbuckl/, sub: 'Swashbuckler', parent: 'Adventure' },
  { re: /\b(?:stop[ -]?motion)\b/, sub: 'Stop motion', parent: 'Animated' },
  { re: /\bclaymation\b/, sub: 'Claymation', parent: 'Animated' },
  { re: /\b(?:cgi|computer.?animat|3d animat)\b/, sub: 'CGI animation', parent: 'Animated' },
  { re: /\b(?:hand[ -]?drawn|traditional animation|2d animat)\b/, sub: 'Traditional animation', parent: 'Animated' },
  { re: /\bcut[ -]?out\b/, sub: 'Cutout animation', parent: 'Animated' },
  { re: /\blive[ -]?action animat/, sub: 'Live-action animated', parent: 'Animated' },
  { re: /\b(?:mockumentary)\b/, sub: 'Mockumentary', parent: 'Comedy' },
  { re: /\b(?:parody|spoof)\b/, sub: 'Parody/spoof', parent: 'Comedy' },
  { re: /\bslapstick\b/, sub: 'Slapstick', parent: 'Comedy' },
  { re: /\b(?:dark comedy|black comedy|black humour|gallows)\b/, sub: 'Dark/black comedy', parent: 'Comedy' },
  { re: /\bbuddy (?:comedy|cop|film|movie)\b/, sub: 'Buddy comedy', parent: 'Comedy' },
  { re: /\baction comedy\b/, sub: 'Action comedy', parent: 'Comedy' },
  { re: /\bscrewball\b/, sub: 'Screwball', parent: 'Comedy' },
  { re: /\b(?:teen drama|high school)\b/, sub: 'Teen drama', parent: 'Drama' },
  { re: /\b(?:legal drama|courtroom|lawyer)\b/, sub: 'Legal drama', parent: 'Drama' },
  { re: /\b(?:medical drama|hospital|surgeon)\b/, sub: 'Medical drama', parent: 'Drama' },
  { re: /\b(?:political drama|president|election|white house)\b/, sub: 'Political drama', parent: 'Drama' },
  { re: /\bpsychological drama\b/, sub: 'Psychological drama', parent: 'Drama' },
  { re: /\bdocudrama\b/, sub: 'Docudrama', parent: 'Drama' },
  { re: /\bdark fantasy\b/, sub: 'Dark fantasy', parent: 'Fantasy' },
  { re: /\burban fantasy\b/, sub: 'Urban fantasy', parent: 'Fantasy' },
  { re: /\b(?:high fantasy|epic fantasy|middle[ -]earth)\b/, sub: 'High/epic fantasy', parent: 'Fantasy' },
  { re: /\bcontemporary fantasy\b/, sub: 'Contemporary fantasy', parent: 'Fantasy' },
  { re: /\balternate history\b/, sub: 'Alternate history', parent: 'Historical' },
  { re: /\b(?:biopic|biograph)/, sub: 'Biopic', parent: 'Historical' },
  { re: /\bhistorical epic\b/, sub: 'Historical epic', parent: 'Historical' },
  { re: /\bperiod (?:piece|drama|film)\b/, sub: 'Period piece', parent: 'Historical' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function normalizeTitle(title) {
  let t = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/['’]/g, '');
  t = t.replace(/^(the|a|an)\s+/, '');
  return t.replace(/[^a-z0-9]+/g, '');
}

function matchKey(title, year) {
  return `${normalizeTitle(title)}|${year || ''}`;
}

function slugify(title, year) {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return year ? `${base || 'film'}-${year}` : base || 'film';
}

function posterUrl(raw) {
  if (!raw || typeof raw !== 'string') return undefined;
  const pathPart = raw.replace('{profile}', 's592').replace('{format}', 'jpg');
  if (pathPart.startsWith('http')) return pathPart;
  return `https://images.justwatch.com${pathPart}`;
}

function mapGenres(jwGenres) {
  const out = [];
  for (const g of jwGenres || []) {
    const tech = String(g?.technicalName || '').toLowerCase().replace(/\s+/g, '_');
    const trans = String(g?.translation || '').trim();
    const mapped =
      GENRE_MAP[tech] ||
      GENRE_MAP[trans.toLowerCase()] ||
      trans ||
      null;
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function inferSubgenres({ title, description, genres }) {
  const hay = `${title} ${description} ${genres.join(' ')}`.toLowerCase();
  const found = [];
  const allowed = new Set(Object.values(SUBGENRES).flat());
  for (const rule of SUBGENRE_RULES) {
    if (!rule.re.test(hay)) continue;
    if (!allowed.has(rule.sub)) continue;
    const hasParent = genres.some(
      (g) => g === rule.parent || (rule.parent === 'Animated' && g === 'Animation'),
    );
    if (!hasParent) continue;
    if (!found.includes(rule.sub)) found.push(rule.sub);
  }
  // Honest genre-as-subgenre: War films that are also Action
  if (genres.includes('War') && genres.includes('Action') && !found.includes('War')) {
    found.push('War');
  }
  return found;
}

function inferMoods(genres) {
  const set = new Set();
  const g = new Set(genres.map((x) => String(x).toLowerCase()));
  if (g.has('horror')) set.add('Scary');
  if (g.has('comedy')) set.add('Funny');
  if (g.has('romance')) set.add('Romantic');
  if (g.has('action') || g.has('adventure') || g.has('thriller') || g.has('crime') || g.has('war') || g.has('sport')) {
    set.add('Thrilling');
  }
  if (g.has('thriller') || g.has('crime') || g.has('war') || g.has('action') || g.has('drama') || g.has('horror')) {
    set.add('Intense');
  }
  if (g.has('sci-fi') || g.has('mystery') || g.has('fantasy')) set.add('Mind-bending');
  if (g.has('animated') || g.has('animation') || g.has('family') || g.has('comedy') || g.has('romance')) {
    set.add('Feel-good');
  }
  if (g.has('animated') || g.has('animation') || g.has('family') || g.has('romance')) set.add('Cozy');
  const moods = [...set].filter((m) => MOODS.includes(m)).slice(0, 3);
  return moods.length ? moods : ['Feel-good'];
}

function makeHook(content, genres) {
  const desc = String(content?.shortDescription || '').trim();
  if (desc) return desc;
  const title = content?.title || 'This film';
  const year = content?.originalReleaseYear;
  const genre = genres[0];
  if (genre && year) return `${title} (${year}) — a ${genre.toLowerCase()} film streaming in Sweden.`;
  if (year) return `${title} (${year}), streaming in Sweden.`;
  return `${title}, streaming in Sweden.`;
}

function retailersFromOffers(offers) {
  const ids = [];
  for (const offer of offers || []) {
    if (offer?.monetizationType !== 'FLATRATE') continue;
    const short = offer?.package?.shortName;
    const retailer = SHORT_TO_RETAILER[short];
    if (retailer && !ids.includes(retailer)) ids.push(retailer);
  }
  return ids;
}

async function graphql(variables, attempt = 0) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      Origin: 'https://www.justwatch.com',
      Referer: 'https://www.justwatch.com/se',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (attempt < 1) {
      await sleep(1000);
      return graphql(variables, attempt + 1);
    }
    throw new Error(`JustWatch HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    if (attempt < 1) {
      await sleep(1000);
      return graphql(variables, attempt + 1);
    }
    throw new Error(`JustWatch GraphQL: ${json.errors[0]?.message || 'unknown error'}`);
  }
  return json.data;
}

async function fetchProvider(shortName) {
  const nodes = [];
  let after = null;
  for (let page = 0; page < PAGES_PER_PROVIDER; page += 1) {
    const data = await graphql({
      country: COUNTRY,
      after,
      filter: {
        objectTypes: ['MOVIE'],
        packages: [shortName],
        monetizationTypes: ['FLATRATE'],
      },
    });
    const popular = data?.popularTitles;
    if (!popular) break;
    for (const edge of popular.edges || []) {
      if (edge?.node) nodes.push(edge.node);
    }
    console.log(
      `  ${shortName} page ${page + 1}: +${(popular.edges || []).length} (totalCount ${popular.totalCount})`,
    );
    if (!popular.pageInfo?.hasNextPage) break;
    after = popular.pageInfo.endCursor;
    await sleep(REQUEST_GAP_MS);
  }
  return nodes;
}

function nodeToLiveMovie(node) {
  const content = node.content || {};
  const genres = mapGenres(content.genres);
  const retailers = retailersFromOffers(node.offers);
  const title = content.title || 'Untitled';
  const year = content.originalReleaseYear || null;
  const description = content.shortDescription || '';
  const score = content.scoring || {};
  return {
    jwId: node.id,
    title,
    year,
    runtime: content.runtime || 0,
    genres,
    moods: inferMoods(genres),
    hook: makeHook(content, genres),
    wikipedia: title,
    retailers,
    subgenres: inferSubgenres({ title, description, genres }),
    poster: posterUrl(content.posterUrl),
    imdbScore: typeof score.imdbScore === 'number' ? score.imdbScore : null,
    imdbVotes: typeof score.imdbVotes === 'number' ? score.imdbVotes : 0,
  };
}

function stripRank(movie) {
  const next = { ...movie };
  delete next.top10;
  delete next.newArrivalRank;
  delete next.status;
  next.top10ByGenre = {};
  return next;
}

function cleanMovie(movie) {
  const out = {
    id: movie.id,
    title: movie.title,
    year: movie.year,
    runtime: movie.runtime || 0,
    genres: movie.genres || [],
    moods: movie.moods?.length ? movie.moods : ['Feel-good'],
    hook: movie.hook,
    wikipedia: movie.wikipedia || movie.title,
    retailers: unique(movie.retailers || []),
    subgenres: movie.subgenres || [],
    top10ByGenre: movie.top10ByGenre || {},
  };
  if (movie.status) out.status = movie.status;
  if (movie.top10) out.top10 = movie.top10;
  if (movie.newArrivalRank) out.newArrivalRank = movie.newArrivalRank;
  if (movie.poster) out.poster = movie.poster;
  if (typeof movie.imdbScore === 'number') out.imdbScore = movie.imdbScore;
  if (typeof movie.imdbVotes === 'number') out.imdbVotes = movie.imdbVotes;
  return out;
}

function assignRanks(merged) {
  const withScores = merged
    .filter((m) => (m.imdbVotes || 0) >= 25000 && typeof m.imdbScore === 'number')
    .sort((a, b) => (b.imdbScore - a.imdbScore) || (b.imdbVotes - a.imdbVotes) || a.title.localeCompare(b.title));
  withScores.slice(0, 10).forEach((m, i) => {
    m.top10 = i + 1;
    m.status = 'Most Watched';
  });

  for (const genre of GENRE_PILLS) {
    let pool = merged.filter(
      (m) => movieHasGenre(m, genre) && (m.imdbVotes || 0) >= 25000 && typeof m.imdbScore === 'number',
    );
    if (pool.length < 10) {
      pool = merged.filter(
        (m) => movieHasGenre(m, genre) && (m.imdbVotes || 0) >= 5000 && typeof m.imdbScore === 'number',
      );
    }
    pool.sort((a, b) => (b.imdbScore - a.imdbScore) || (b.imdbVotes - a.imdbVotes) || a.title.localeCompare(b.title));
    pool.slice(0, 10).forEach((m, i) => {
      m.top10ByGenre = { ...m.top10ByGenre, [genre]: i + 1 };
    });
  }

  const arrivals = merged
    .filter((m) => m._live && (m.year || 0) >= 2024)
    .sort((a, b) => (b.year - a.year) || ((b.imdbVotes || 0) - (a.imdbVotes || 0)) || a.title.localeCompare(b.title));
  arrivals.slice(0, 10).forEach((m, i) => {
    m.newArrivalRank = i + 1;
    m.status = 'New Arrival';
  });
}

function printSummary(payload, liveByRetailer) {
  const movies = payload.movies;
  const retailerCounts = {};
  for (const id of ['netflix', 'disney', 'prime', 'viaplay', 'hbo']) {
    retailerCounts[id] = movies.filter((m) => m.retailers.includes(id)).length;
  }
  const genreCounts = {};
  for (const g of GENRE_PILLS) {
    genreCounts[g] = movies.filter((m) => movieHasGenre(m, g)).length;
  }
  const extra = {};
  for (const m of movies) {
    for (const g of m.genres || []) {
      if (!GENRE_PILLS.includes(g) && g !== 'Animation' && g !== 'History') {
        extra[g] = (extra[g] || 0) + 1;
      }
    }
  }
  const top10 = movies
    .filter((m) => m.top10)
    .sort((a, b) => a.top10 - b.top10);
  const arrivals = movies
    .filter((m) => m.newArrivalRank)
    .sort((a, b) => a.newArrivalRank - b.newArrivalRank);

  console.log('\n=== Catalog refresh ===');
  console.log(`updatedAt: ${payload.updatedAt}`);
  console.log(`region: ${payload.region}`);
  console.log(`sources: ${payload.sources.join(', ')}`);
  console.log(`merged movies: ${movies.length} (snapshot ${snapshotMovies.length})`);
  console.log('\nLive titles per retailer (JustWatch unique):');
  for (const p of PROVIDERS) {
    console.log(`  ${p.label}: ${liveByRetailer[p.retailer] || 0}`);
  }
  console.log('\nMerged catalog per retailer:');
  for (const [id, n] of Object.entries(retailerCounts)) {
    console.log(`  ${id}: ${n}`);
  }
  console.log('\nPer genre:');
  for (const [g, n] of Object.entries(genreCounts)) {
    console.log(`  ${g}: ${n}`);
  }
  const extraKeys = Object.keys(extra).sort();
  if (extraKeys.length) {
    console.log('  extra:', extraKeys.map((g) => `${g} ${extra[g]}`).join(', '));
  }
  console.log('\nTop 10:');
  for (const m of top10) {
    const score = typeof m.imdbScore === 'number' ? m.imdbScore.toFixed(1) : '?';
    const votes = m.imdbVotes ? ` (${m.imdbVotes.toLocaleString('en-US')} votes)` : '';
    console.log(`  ${m.top10}. ${m.title} (${m.year}) — ${score} IMDb${votes}`);
  }
  console.log('\nNew arrivals:');
  for (const m of arrivals) {
    console.log(`  ${m.newArrivalRank}. ${m.title} (${m.year})`);
  }
  console.log(`\nWrote ${path.relative(ROOT, OUT_PATH)}`);
}

async function main() {
  console.log('Fetching JustWatch popular movies (Sweden, FLATRATE, 2 pages/provider)…');
  const allNodes = [];
  for (const provider of PROVIDERS) {
    console.log(`\n${provider.label} (${provider.shortName})`);
    try {
      const nodes = await fetchProvider(provider.shortName);
      allNodes.push(...nodes);
    } catch (err) {
      console.error(`  failed: ${err.message}`);
    }
    await sleep(REQUEST_GAP_MS);
  }

  const byJwId = new Map();
  for (const node of allNodes) {
    if (!node?.id) continue;
    const mapped = nodeToLiveMovie(node);
    const existing = byJwId.get(node.id);
    if (existing) {
      existing.retailers = unique([...existing.retailers, ...mapped.retailers]);
    } else {
      byJwId.set(node.id, mapped);
    }
  }

  const liveByKey = new Map();
  for (const movie of byJwId.values()) {
    const key = matchKey(movie.title, movie.year);
    const existing = liveByKey.get(key);
    if (existing) {
      existing.retailers = unique([...existing.retailers, ...movie.retailers]);
      if (!existing.poster && movie.poster) existing.poster = movie.poster;
      if ((movie.imdbVotes || 0) > (existing.imdbVotes || 0)) {
        existing.imdbScore = movie.imdbScore;
        existing.imdbVotes = movie.imdbVotes;
      }
    } else {
      liveByKey.set(key, movie);
    }
  }

  const liveByRetailer = { netflix: 0, disney: 0, prime: 0, viaplay: 0 };
  for (const movie of liveByKey.values()) {
    for (const id of movie.retailers) {
      if (id in liveByRetailer) liveByRetailer[id] += 1;
    }
  }

  const usedLive = new Set();
  const takenIds = new Set();
  const merged = [];

  for (const snap of snapshotMovies) {
    const key = matchKey(snap.title, snap.year);
    const live = liveByKey.get(key);
    const base = stripRank(snap);
    if (live) {
      usedLive.add(key);
      const retailers = unique([
        ...live.retailers,
        ...(snap.retailers || []).includes('hbo') ? ['hbo'] : [],
      ]);
      merged.push({
        ...base,
        retailers,
        poster: live.poster || snap.poster,
        imdbScore: live.imdbScore,
        imdbVotes: live.imdbVotes,
        runtime: live.runtime || snap.runtime,
        hook: snap.hook,
        subgenres: snap.subgenres || [],
        moods: snap.moods,
        wikipedia: snap.wikipedia,
        _live: true,
      });
    } else {
      merged.push({ ...base, _live: false });
    }
    takenIds.add(snap.id);
  }

  for (const live of liveByKey.values()) {
    const key = matchKey(live.title, live.year);
    if (usedLive.has(key)) continue;
    let id = slugify(live.title, live.year);
    if (takenIds.has(id)) id = slugify(live.title, `${live.year}-${live.jwId || 'jw'}`);
    takenIds.add(id);
    merged.push({
      id,
      title: live.title,
      year: live.year,
      runtime: live.runtime,
      genres: live.genres,
      moods: live.moods,
      hook: live.hook,
      wikipedia: live.wikipedia,
      retailers: live.retailers,
      subgenres: live.subgenres,
      top10ByGenre: {},
      poster: live.poster,
      imdbScore: live.imdbScore,
      imdbVotes: live.imdbVotes,
      _live: true,
    });
  }

  assignRanks(merged);

  const movies = merged.map((m) => {
    const { _live, jwId, ...rest } = m;
    return cleanMovie(rest);
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    region: 'SE',
    sources: ['IMDb', 'JustWatch'],
    movies,
  };

  await fs.writeFile(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  printSummary(payload, liveByRetailer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

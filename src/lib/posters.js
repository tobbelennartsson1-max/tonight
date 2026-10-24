const cache = new Map();

const BATCH_SIZE = 40;
const DEBOUNCE_MS = 80;
const RETRY_MS = 1000;

let queue = [];
let timer = null;
let flushing = false;

function wikiQueryUrl(titles) {
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageimages',
    format: 'json',
    pithumbsize: '600',
    origin: '*',
    redirects: '1',
    piprop: 'thumbnail',
  });
  return `https://en.wikipedia.org/w/api.php?${params.toString()}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function followMaps(original, maps) {
  let title = original;
  const seen = new Set();
  while (!seen.has(title)) {
    seen.add(title);
    const hit = maps.find((m) => m.from === title);
    if (!hit) break;
    title = hit.to;
  }
  return title;
}

function pageForTitle(original, query) {
  const maps = [...(query.normalized || []), ...(query.redirects || [])];
  const resolved = followMaps(original, maps);
  const pages = query.pages ? Object.values(query.pages) : [];
  return pages.find((page) => page.title === resolved) || null;
}

async function fromRestSummary(wikipediaTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaTitle)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.originalimage?.source || data.thumbnail?.source || null;
}

async function fetchBatch(titles) {
  const url = wikiQueryUrl(titles);
  let res = await fetch(url);
  if (res.status === 429) {
    await sleep(RETRY_MS);
    res = await fetch(url);
  }
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function processChunk(items) {
  const titles = items.map((item) => item.title);
  let data;
  try {
    data = await fetchBatch(titles);
  } catch {
    data = null;
  }

  const query = data?.query;
  const missing = [];

  for (const item of items) {
    if (!query) {
      item.resolve(null);
      continue;
    }
    const page = pageForTitle(item.title, query);
    const thumb = page && page.missing == null && page.invalid == null ? page.thumbnail?.source : null;
    if (thumb) {
      item.resolve(thumb);
    } else {
      missing.push(item);
    }
  }

  await Promise.all(
    missing.map(async (item) => {
      try {
        const restThumb = await fromRestSummary(item.title);
        item.resolve(restThumb || null);
      } catch {
        item.resolve(null);
      }
    }),
  );
}

async function flush() {
  timer = null;
  if (flushing) return;
  flushing = true;
  try {
    while (queue.length) {
      const chunk = queue.splice(0, BATCH_SIZE);
      await processChunk(chunk);
    }
  } finally {
    flushing = false;
    if (queue.length && !timer) {
      timer = setTimeout(flush, DEBOUNCE_MS);
    }
  }
}

export function getPosterUrl(wikipediaTitle) {
  if (!wikipediaTitle) return Promise.resolve(null);
  if (cache.has(wikipediaTitle)) return cache.get(wikipediaTitle);
  const pending = new Promise((resolve) => {
    queue.push({ title: wikipediaTitle, resolve });
    if (!timer && !flushing) timer = setTimeout(flush, DEBOUNCE_MS);
  });
  cache.set(wikipediaTitle, pending);
  return pending;
}

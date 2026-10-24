export const SERVICE_URLS = {
  netflix: 'https://www.netflix.com/se/',
  hbo: 'https://play.hbomax.com/',
  disney: 'https://www.disneyplus.com/sv-se',
  prime: 'https://www.primevideo.com/',
  viaplay: 'https://viaplay.se/',
};

export function justWatchUrl(title) {
  return `https://www.justwatch.com/se/search?q=${encodeURIComponent(title)}`;
}

export function serviceUrl(id, title) {
  return SERVICE_URLS[id] || justWatchUrl(title || '');
}

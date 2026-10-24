// Runs on the Tonight web app: lets a room page hand its room to the extension ("Open overlay").
(() => {
  const mark = () => {
    document.documentElement.dataset.tonightExt = '1';
  };
  mark();
  document.addEventListener('DOMContentLoaded', mark);

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'tonight-web') return;
    if (e.data.type !== 'join-room') return;
    const d = e.data;
    let lang = null;
    try {
      lang = localStorage.getItem('tonight.lang');
    } catch {
      /* ignore */
    }
    const patch = {
      room: String(d.room || '').toUpperCase().slice(0, 8),
      name: String(d.name || '').slice(0, 32),
      memberId: String(d.memberId || '').slice(0, 64),
      services: Array.isArray(d.services) ? d.services.slice(0, 8) : [],
    };
    if (lang) patch.lang = lang;
    // Only a local dev page may point the extension at its server; hosted pages can't
    // redirect it (set the server in the extension options instead).
    const local = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
    if (local && /^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(d.wsUrl || '')) patch.wsUrl = d.wsUrl;
    chrome.storage.local.set(patch, () => {
      window.postMessage({ source: 'tonight-ext', type: 'room-saved', room: patch.room }, window.location.origin);
    });
  });
})();

/* global TonightI18n */
(async () => {
  const s = await chrome.storage.local.get(['wsUrl', 'lang']);
  const lang = TonightI18n.has(s.lang) ? s.lang : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = TonightI18n.t(lang, el.dataset.i18n);
  const ws = document.getElementById('ws');
  ws.value = s.wsUrl || 'wss://tonight-together.onrender.com/ws';
  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = ws.value.trim();
    if (!/^wss?:\/\//.test(v)) return;
    await chrome.storage.local.set({ wsUrl: v });
    document.getElementById('saved').hidden = false;
  });
})();

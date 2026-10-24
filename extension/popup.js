/* global TonightI18n */
const $ = (id) => document.getElementById(id);
let lang = 'en';

function applyI18n() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = TonightI18n.t(lang, el.dataset.i18n);
  $('code').placeholder = TonightI18n.t(lang, 'together.codePh');
  $('name').placeholder = TonightI18n.t(lang, 'together.namePh');
}

async function refresh() {
  const s = await chrome.storage.local.get(['room', 'name', 'lang']);
  lang = TonightI18n.has(s.lang) ? s.lang : 'en';
  $('lang').value = lang;
  applyI18n();
  $('name').value = s.name || '';
  $('join').hidden = !!s.room;
  $('joined').hidden = !s.room;
  $('roomCode').textContent = s.room || '';
  if (s.room) {
    chrome.runtime.sendMessage({ type: 'status' }, (r) => {
      if (chrome.runtime.lastError || !r) return;
      $('status').textContent = r.open ? TonightI18n.t(lang, 'ext.connected', { code: s.room }) : '';
    });
  }
}

for (const l of TonightI18n.langs) $('lang').append(new Option(l.label, l.code));
$('lang').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ lang: e.target.value });
  refresh();
});
$('code').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
$('join').addEventListener('submit', async (e) => {
  e.preventDefault();
  const room = $('code').value.trim().toUpperCase();
  const name = $('name').value.trim();
  if (room.length < 4 || !name) return;
  await chrome.storage.local.set({ room, name });
  refresh();
});
$('leave').addEventListener('click', async () => {
  await chrome.storage.local.remove('room');
  refresh();
});
refresh();

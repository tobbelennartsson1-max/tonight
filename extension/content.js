/* global TonightI18n, TonightFx */
// Tonight Together overlay for streaming sites. Never touches the site's player —
// it only draws chat, reactions, effects and the synced countdown on top.
(() => {
  if (window.__tonightOverlay) return;
  window.__tonightOverlay = true;

  const SERVICE_NAMES = { netflix: 'Netflix', hbo: 'HBO Max', disney: 'Disney+', prime: 'Prime Video', viaplay: 'Viaplay' };
  const state = {
    lang: 'en',
    room: null,
    memberId: null,
    status: 'connecting',
    snapshot: null,
    offset: 0,
    collapsed: false,
    pos: null,
    countdown: null,
    unread: 0,
    lastChatCount: 0,
  };
  const t = (key, vars) => TonightI18n.t(state.lang, key, vars);

  let host = null;
  let root = null;
  let fx = null;
  let port = null;
  let els = {};
  let cdTimer = null;

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .layer { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 2147483646;
    font-family: Outfit, "Segoe UI", system-ui, -apple-system, "Noto Sans JP", "Noto Sans SC", sans-serif; color: #f5efe3; }
  .fx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .panel { position: absolute; width: 320px; max-height: min(560px, calc(100% - 32px)); display: flex; flex-direction: column;
    pointer-events: auto; background: rgba(8,8,10,.86); border: 1px solid rgba(255,255,255,.14); border-radius: 14px;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; }
  .panel.collapsed { width: auto; max-height: none; border-radius: 999px; }
  .head { display: flex; align-items: center; gap: 8px; padding: 10px 10px 10px 14px; cursor: grab; user-select: none;
    border-bottom: 1px solid rgba(255,255,255,.1); touch-action: none; }
  .collapsed .head { border-bottom: 0; padding: 7px 8px 7px 14px; }
  .head:active { cursor: grabbing; }
  .logo { font: 400 20px/1 "Bebas Neue", Impact, "Arial Narrow", sans-serif; letter-spacing: .18em; color: #fff; }
  .code { font: 600 11px/1 Outfit, system-ui, sans-serif; letter-spacing: .2em; color: #E8B04A; text-transform: uppercase; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; flex: none; }
  .dot.off { background: #f59e0b; }
  .online { font-size: 11px; color: rgba(255,255,255,.6); white-space: nowrap; }
  .spacer { flex: 1; }
  .badge { min-width: 18px; height: 18px; border-radius: 999px; background: #E8B04A; color: #111; font: 700 10px/18px system-ui; text-align: center; padding: 0 5px; }
  .iconbtn { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: rgba(255,255,255,.75); font-size: 16px; line-height: 1; }
  .iconbtn:hover { background: rgba(255,255,255,.12); color: #fff; }
  .body { display: flex; flex-direction: column; min-height: 0; flex: 1; }
  .now { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
  .now img { width: 30px; height: 45px; object-fit: cover; border-radius: 4px; background: #222; flex: none; }
  .now .meta { min-width: 0; flex: 1; }
  .eyebrow { font: 600 9px/1.2 system-ui, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: #E8B04A; }
  .title { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .start { all: unset; cursor: pointer; background: #E8B04A; color: #141414; font: 700 10px/1 system-ui, sans-serif; letter-spacing: .12em;
    text-transform: uppercase; padding: 8px 10px; border-radius: 999px; white-space: nowrap; }
  .start:hover { filter: brightness(1.08); }
  .chat { list-style: none; margin: 0; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; min-height: 120px; flex: 1;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent; }
  .msg { display: flex; gap: 7px; align-items: flex-start; font-size: 13px; line-height: 1.35; }
  .msg.mine { flex-direction: row-reverse; }
  .av { width: 20px; height: 20px; border-radius: 50%; color: #111; font: 700 10px/20px system-ui; text-align: center; flex: none; }
  .bubble { background: rgba(255,255,255,.1); padding: 5px 10px; border-radius: 12px; border-top-left-radius: 3px; max-width: 220px; word-wrap: break-word; white-space: pre-wrap; }
  .mine .bubble { background: #E8B04A; color: #141414; border-radius: 12px; border-top-right-radius: 3px; }
  .who { display: block; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 2px; }
  .mine .who { text-align: right; }
  .empty { color: rgba(255,255,255,.45); font-size: 12px; text-align: center; margin: auto; }
  .tools { padding: 8px 10px 10px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
  .emoji { all: unset; cursor: pointer; width: 30px; height: 30px; display: grid; place-items: center; font-size: 18px; border-radius: 50%; transition: transform .15s; }
  .emoji:hover { transform: scale(1.25); background: rgba(255,255,255,.1); }
  .fxbtn { all: unset; cursor: pointer; font: 600 10px/1 system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.8);
    border: 1px solid rgba(255,255,255,.2); border-radius: 999px; padding: 6px 9px; margin-right: 4px; }
  .fxbtn:hover { border-color: #E8B04A; color: #fff; }
  form { display: flex; gap: 6px; }
  input { all: unset; flex: 1; min-width: 0; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.2);
    background: rgba(0,0,0,.4); color: #fff; font-size: 13px; }
  input:focus { border-color: rgba(255,255,255,.6); }
  .send { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; background: #fff; color: #111; display: grid; place-items: center; font-size: 15px; }
  .status { padding: 8px 14px; font-size: 11px; color: #fcd34d; }
  .cd { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; text-align: center;
    background: rgba(0,0,0,.72); pointer-events: auto; }
  .cd.on { display: flex; }
  .cd .by { font: 600 11px/1 system-ui, sans-serif; letter-spacing: .3em; text-transform: uppercase; color: rgba(255,255,255,.6); }
  .cd .film { font: 400 30px/1.15 Fraunces, Georgia, serif; color: #fff; margin-top: 14px; max-width: 80vw; }
  .cd .big { font: 400 min(30vh, 220px)/1 "Bebas Neue", Impact, "Arial Narrow", sans-serif; color: #E8B04A; margin: 18px 0; min-height: 1em;
    text-shadow: 0 10px 40px rgba(0,0,0,.6); }
  .cd .big.word { font-size: min(14vh, 110px); letter-spacing: .06em; }
  .cd .hint { font-size: 13px; color: rgba(255,255,255,.7); }
  .pop { animation: pop .35s cubic-bezier(.2,.8,.3,1) both; }
  @keyframes pop { from { opacity: 0; transform: scale(1.6); } to { opacity: 1; transform: scale(1); } }
  `;

  function h(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  }

  const serverNow = () => Date.now() + state.offset;
  const send = (type, payload = {}) => port?.postMessage({ type, ...payload });

  function mount() {
    if (host) return;
    host = document.createElement('tonight-overlay');
    host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';
    root = host.attachShadow({ mode: 'open' });
    root.append(h('style', {}, CSS));
    const layer = h('div', { class: 'layer' });
    const fxLayer = h('div', { class: 'fx' });
    const panel = h('div', { class: 'panel' });
    const cd = h('div', { class: 'cd', role: 'alert' });
    layer.append(fxLayer, cd, panel);
    root.append(layer);
    els = { layer, fxLayer, panel, cd };
    fx = TonightFx.createFx(fxLayer);
    placeHost();
    render();
    applyPos();
  }

  function unmount() {
    host?.remove();
    host = null;
    port?.disconnect();
    port = null;
  }

  // Fullscreen: re-parent the overlay into the fullscreen element so it stays visible.
  function placeHost() {
    if (!host) return;
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    const target = fs && fs.tagName !== 'VIDEO' ? fs : document.documentElement;
    if (host.parentNode !== target) target.appendChild(host);
  }
  document.addEventListener('fullscreenchange', placeHost);
  document.addEventListener('webkitfullscreenchange', placeHost);
  // Some players rebuild their DOM; make sure we're still attached.
  setInterval(() => host && !host.isConnected && placeHost(), 2000);

  function applyPos() {
    const p = els.panel;
    if (!p) return;
    const pos = state.pos || { right: 24, top: 84 };
    p.style.left = pos.left != null ? `${pos.left}px` : '';
    p.style.right = pos.left == null ? `${pos.right}px` : '';
    p.style.top = `${pos.top}px`;
  }

  function startDrag(e) {
    if (e.target.closest('button')) return;
    const p = els.panel;
    const r = p.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const W = els.layer.clientWidth;
      const H = els.layer.clientHeight;
      const left = Math.max(8, Math.min(W - r.width - 8, ev.clientX - dx));
      const top = Math.max(8, Math.min(H - 48, ev.clientY - dy));
      state.pos = { left, top };
      applyPos();
    };
    const up = () => {
      e.currentTarget.removeEventListener('pointermove', move);
      e.currentTarget.removeEventListener('pointerup', up);
      chrome.storage.local.set({ overlayPos: state.pos });
    };
    e.currentTarget.addEventListener('pointermove', move);
    e.currentTarget.addEventListener('pointerup', up);
  }

  function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function render() {
    if (!host) return;
    const s = state.snapshot;
    const p = els.panel;
    p.className = `panel${state.collapsed ? ' collapsed' : ''}`;
    p.textContent = '';
    const online = s ? s.members.filter((m) => m.online).length : 0;
    const head = h(
      'div',
      { class: 'head', onpointerdown: startDrag },
      h('span', { class: 'logo' }, 'TONIGHT'),
      h('span', { class: 'code' }, state.room || ''),
      h('span', { class: 'spacer' }),
      state.status === 'open'
        ? [h('span', { class: 'dot' }), h('span', { class: 'online' }, t('together.online', { n: online }))]
        : h('span', { class: 'dot off', title: state.status }),
      state.collapsed && state.unread ? h('span', { class: 'badge' }, state.unread) : null,
      h(
        'button',
        {
          class: 'iconbtn',
          title: state.collapsed ? t('ext.expand') : t('ext.collapse'),
          'aria-label': state.collapsed ? t('ext.expand') : t('ext.collapse'),
          onclick: () => {
            state.collapsed = !state.collapsed;
            if (!state.collapsed) state.unread = 0;
            chrome.storage.local.set({ overlayCollapsed: state.collapsed });
            render();
          },
        },
        state.collapsed ? '+' : '–',
      ),
    );
    p.append(head);
    if (state.collapsed) return;

    const body = h('div', { class: 'body' });
    if (state.status !== 'open') {
      const msg =
        state.status === 'notFound'
          ? t('together.notFound', { code: state.room })
          : state.status === 'offline'
            ? t('together.offline')
            : t('together.connecting');
      body.append(h('div', { class: 'status' }, msg));
    }

    if (s?.nowPlaying) {
      const m = s.nowPlaying.meta || {};
      body.append(
        h(
          'div',
          { class: 'now' },
          m.poster ? h('img', { src: m.poster, alt: '' }) : null,
          h('div', { class: 'meta' }, h('div', { class: 'eyebrow' }, t('together.nowPlaying')), h('div', { class: 'title' }, m.title || '')),
          h('button', { class: 'start', onclick: () => send('countdown', { itemId: s.nowPlaying.id }) }, t('together.startTogether')),
        ),
      );
    }

    const list = h('ol', { class: 'chat' });
    const chat = s?.chat || [];
    if (!chat.length) list.append(h('li', { class: 'empty' }, t('together.chatEmpty')));
    for (const c of chat.slice(-40)) {
      const mine = c.by === state.memberId;
      list.append(
        h(
          'li',
          { class: `msg${mine ? ' mine' : ''}` },
          h('span', { class: 'av', style: `background:${c.color || '#E8B04A'}` }, initial(c.name)),
          h('div', {}, h('span', { class: 'who' }, mine ? t('together.you') : c.name), h('div', { class: 'bubble' }, c.text)),
        ),
      );
    }
    body.append(list);

    const input = h('input', { placeholder: t('together.chatPh'), maxlength: '400', 'aria-label': t('together.chatPh') });
    // Keep keystrokes away from the player's keyboard shortcuts (space = pause, f = fullscreen, …).
    for (const ev of ['keydown', 'keyup', 'keypress']) input.addEventListener(ev, (e) => e.stopPropagation());
    const tools = h(
      'div',
      { class: 'tools' },
      h('div', { class: 'row' }, TonightFx.REACTIONS.map((e) => h('button', { class: 'emoji', 'aria-label': e, onclick: () => send('reaction', { emoji: e }) }, e))),
      h('div', { class: 'row' }, TonightFx.EFFECT_KINDS.map(({ kind, emoji }) => h('button', { class: 'fxbtn', onclick: () => send('effect', { kind }) }, `${emoji} ${t(`together.fx.${kind}`)}`))),
      h(
        'form',
        {
          onsubmit: (e) => {
            e.preventDefault();
            const v = input.value.trim();
            if (!v) return;
            send('chat', { text: v });
            input.value = '';
          },
        },
        input,
        h('button', { class: 'send', type: 'submit', 'aria-label': t('together.send') }, '➤'),
      ),
    );
    body.append(tools);
    p.append(body);
    list.scrollTop = list.scrollHeight;
  }

  function renderCountdown() {
    const cd = els.cd;
    const c = state.countdown;
    if (!cd) return;
    if (!c) {
      cd.className = 'cd';
      return;
    }
    const left = c.startAt - serverNow();
    if (left < -6000) {
      state.countdown = null;
      clearInterval(cdTimer);
      cd.className = 'cd';
      return;
    }
    const n = Math.ceil(left / 1000);
    const phase = left > 3000 ? 'ready' : left > 0 ? `n${n}` : 'go';
    if (cd.dataset.phase === phase) return;
    cd.dataset.phase = phase;
    cd.className = 'cd on';
    cd.textContent = '';
    const service = SERVICE_NAMES[c.service] || '';
    cd.append(
      h('div', { class: 'by' }, t('together.cd.startedBy', { name: c.name || '—' })),
      h('div', { class: 'film' }, c.meta?.title || ''),
      phase === 'ready'
        ? h('div', { class: 'big word pop' }, t('together.cd.ready'))
        : phase === 'go'
          ? h('div', { class: 'big word pop' }, t('together.cd.press'))
          : h('div', { class: 'big pop' }, String(n)),
      service ? h('div', { class: 'hint' }, service) : null,
    );
  }

  function onMessage(msg) {
    if (msg.serverNow && msg.type === 'pong') {
      const t1 = Date.now();
      state.offset = msg.serverNow - (msg.t0 + (t1 - msg.t0) / 2);
      return;
    }
    switch (msg.type) {
      case 'ext-status':
        state.status = msg.status;
        if (msg.memberId) state.memberId = msg.memberId;
        render();
        break;
      case 'state': {
        const count = msg.room.chat.length;
        if (state.collapsed && state.snapshot && count > state.lastChatCount) state.unread += count - state.lastChatCount;
        state.lastChatCount = count;
        state.snapshot = msg.room;
        if (msg.room.countdown && msg.room.countdown.id !== state.countdown?.id && msg.room.countdown.startAt > serverNow() - 5000) {
          startCountdown(msg.room.countdown);
        }
        render();
        break;
      }
      case 'reaction':
        fx?.reaction(msg.emoji, msg.name);
        break;
      case 'effect':
        fx?.effect(msg.kind);
        break;
      case 'countdown':
        startCountdown(msg.countdown);
        break;
      default:
        break;
    }
  }

  function startCountdown(c) {
    state.countdown = c;
    if (els.cd) els.cd.dataset.phase = '';
    clearInterval(cdTimer);
    cdTimer = setInterval(renderCountdown, 50);
    renderCountdown();
  }

  function connect() {
    port = chrome.runtime.connect({ name: 'tonight-overlay' });
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(() => {
      port = null;
      // Service worker restarted — reconnect if we still have a room.
      if (host) setTimeout(() => state.room && !port && connect(), 1000);
    });
  }

  async function boot() {
    const s = await chrome.storage.local.get(['room', 'lang', 'overlayPos', 'overlayCollapsed', 'memberId']);
    state.lang = TonightI18n.has(s.lang) ? s.lang : 'en';
    state.pos = s.overlayPos || null;
    state.collapsed = !!s.overlayCollapsed;
    state.memberId = s.memberId || null;
    if (!s.room) return;
    state.room = s.room;
    mount();
    connect();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.lang) {
      state.lang = TonightI18n.has(changes.lang.newValue) ? changes.lang.newValue : 'en';
      render();
    }
    if (changes.room) {
      const room = changes.room.newValue;
      state.room = room || null;
      state.snapshot = null;
      if (!room) unmount();
      else if (!host) {
        mount();
        connect();
      } else render();
    }
  });

  boot();
})();

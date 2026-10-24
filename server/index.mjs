// Tonight Together — tiny realtime room server.
// In-memory rooms, persisted to server/data/rooms.json. One WebSocket per tab/overlay.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.WS_PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.ROOMS_FILE || path.join(__dirname, 'data', 'rooms.json');
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CHAT = 120;
const COUNTDOWN_LEAD_MS = 4500; // 1.5 s "get ready" + 3-2-1
const ROOM_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const COLORS = ['#E8B04A', '#E8735A', '#7FB3E8', '#9AD18B', '#C79BE8', '#E89BC0', '#6FD3C7', '#F2D16B'];
const EFFECTS = new Set(['confetti', 'hearts', 'popcorn']);

/** @type {Map<string, any>} */
const rooms = new Map();
/** @type {Map<string, Set<import('ws').WebSocket>>} */
const sockets = new Map();

const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const now = () => Date.now();

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    for (const r of raw.rooms || []) {
      if (now() - (r.updatedAt || 0) > ROOM_TTL_MS) continue;
      rooms.set(r.code, r);
    }
    console.log(`[together] loaded ${rooms.size} room(s)`);
  } catch {
    /* first run */
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify({ rooms: [...rooms.values()] }));
    } catch (err) {
      console.warn('[together] save failed', err.message);
    }
  }, 500);
}

function newCode() {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i += 1) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!rooms.has(c)) return c;
  }
}

function normCode(c) {
  return clip(c, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function createRoom(code) {
  const room = {
    code,
    createdAt: now(),
    updatedAt: now(),
    members: {},
    queue: [],
    nowPlaying: null,
    swipes: {},
    chat: [],
  };
  rooms.set(code, room);
  return room;
}

function onlineIds(code) {
  const ids = new Set();
  for (const ws of sockets.get(code) || []) if (ws.memberId) ids.add(ws.memberId);
  return ids;
}

function sortQueue(room) {
  room.queue.sort((a, b) => b.votes.length - a.votes.length || a.addedAt - b.addedAt);
}

function snapshot(room) {
  const online = onlineIds(room.code);
  return {
    code: room.code,
    members: Object.values(room.members).map((m) => ({ ...m, online: online.has(m.id) })),
    queue: room.queue,
    nowPlaying: room.nowPlaying,
    chat: room.chat.slice(-60),
    countdown: room.countdown && room.countdown.startAt > now() - 8000 ? room.countdown : null,
  };
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ ...msg, serverNow: now() }));
}

function broadcast(code, msg) {
  for (const ws of sockets.get(code) || []) send(ws, msg);
}

function pushState(room) {
  room.updatedAt = now();
  broadcast(room.code, { type: 'state', room: snapshot(room) });
  save();
}

function addLikes(member, meta) {
  if (!member || !meta) return;
  member.likes ||= { moods: {}, genres: {} };
  for (const m of (meta.moods || []).slice(0, 6)) member.likes.moods[m] = (member.likes.moods[m] || 0) + 1;
  for (const g of (meta.genres || []).slice(0, 6)) member.likes.genres[g] = (member.likes.genres[g] || 0) + 1;
}

function cleanMeta(meta = {}) {
  return {
    title: clip(meta.title, 120),
    year: Number(meta.year) || null,
    poster: /^https:\/\//.test(meta.poster || '') ? clip(meta.poster, 400) : null,
    wikipedia: clip(meta.wikipedia, 160) || null,
    imdbScore: typeof meta.imdbScore === 'number' ? meta.imdbScore : null,
    retailers: Array.isArray(meta.retailers) ? meta.retailers.slice(0, 6).map((r) => clip(r, 20)) : [],
    moods: Array.isArray(meta.moods) ? meta.moods.slice(0, 6).map((r) => clip(r, 30)) : [],
    genres: Array.isArray(meta.genres) ? meta.genres.slice(0, 6).map((r) => clip(r, 30)) : [],
  };
}

function addToQueue(room, movieId, meta, memberId) {
  const existing = room.queue.find((q) => q.movieId === movieId);
  if (existing) {
    if (!existing.votes.includes(memberId)) existing.votes.push(memberId);
    return existing;
  }
  if (room.nowPlaying?.movieId === movieId) return room.nowPlaying;
  const item = {
    id: randomUUID().slice(0, 8),
    movieId: clip(movieId, 80),
    meta: cleanMeta(meta),
    addedBy: memberId,
    addedAt: now(),
    votes: [memberId],
  };
  room.queue.push(item);
  if (room.queue.length > 60) room.queue.shift();
  return item;
}

function handle(ws, msg) {
  if (msg.type === 'ping') {
    send(ws, { type: 'pong', t0: msg.t0 });
    return;
  }

  if (msg.type === 'join') {
    let code = normCode(msg.room);
    let room = code ? rooms.get(code) : null;
    if (!room) {
      if (!msg.create) {
        send(ws, { type: 'error', code: 'notFound', room: code });
        return;
      }
      code = code && code.length >= 4 ? code : newCode();
      room = rooms.get(code) || createRoom(code);
    }
    const memberId = clip(msg.memberId, 64) || randomUUID();
    const existing = room.members[memberId];
    const services = Array.isArray(msg.services) ? msg.services.slice(0, 8).map((s) => clip(s, 20)) : null;
    room.members[memberId] = {
      id: memberId,
      name: clip(msg.name, 32) || existing?.name || 'Guest',
      services: services && services.length ? services : existing?.services || [],
      color: existing?.color || COLORS[Object.keys(room.members).length % COLORS.length],
      likes: existing?.likes || { moods: {}, genres: {} },
      joinedAt: existing?.joinedAt || now(),
    };
    ws.room = code;
    ws.memberId = memberId;
    ws.client = msg.client === 'ext' ? 'ext' : 'web';
    ws.swipe = !!msg.swipe;
    if (!sockets.has(code)) sockets.set(code, new Set());
    sockets.get(code).add(ws);
    send(ws, { type: 'joined', room: code, memberId });
    pushState(room);
    return;
  }

  const room = ws.room ? rooms.get(ws.room) : null;
  if (!room) {
    send(ws, { type: 'error', code: 'notJoined' });
    return;
  }
  const me = room.members[ws.memberId];

  switch (msg.type) {
    case 'mode': {
      ws.swipe = !!msg.swipe;
      break;
    }
    case 'profile': {
      if (msg.name) me.name = clip(msg.name, 32);
      if (Array.isArray(msg.services)) me.services = msg.services.slice(0, 8).map((s) => clip(s, 20));
      pushState(room);
      break;
    }
    case 'queue-add': {
      if (!msg.movieId) return;
      addToQueue(room, msg.movieId, msg.meta, me.id);
      addLikes(me, msg.meta);
      sortQueue(room);
      pushState(room);
      break;
    }
    case 'queue-vote': {
      const item = room.queue.find((q) => q.id === msg.itemId);
      if (!item) return;
      if (item.votes.includes(me.id)) item.votes = item.votes.filter((v) => v !== me.id);
      else {
        item.votes.push(me.id);
        addLikes(me, item.meta);
      }
      sortQueue(room);
      pushState(room);
      break;
    }
    case 'queue-remove': {
      const item = room.queue.find((q) => q.id === msg.itemId);
      if (!item || item.addedBy !== me.id) return;
      room.queue = room.queue.filter((q) => q.id !== msg.itemId);
      pushState(room);
      break;
    }
    case 'queue-play': {
      const item = room.queue.find((q) => q.id === msg.itemId);
      if (!item) return;
      room.queue = room.queue.filter((q) => q.id !== msg.itemId);
      room.nowPlaying = { ...item, startedBy: me.id, startedAt: now() };
      pushState(room);
      break;
    }
    case 'swipe': {
      if (!msg.movieId) return;
      const s = (room.swipes[msg.movieId] ||= {});
      s[me.id] = !!msg.yes;
      if (msg.yes) addLikes(me, msg.meta);
      // Everyone currently in swipe mode (phones) has to say yes; desktop list users don't block a match.
      const swipers = new Set();
      for (const sock of sockets.get(room.code) || []) if (sock.swipe && sock.memberId) swipers.add(sock.memberId);
      const online = [...swipers];
      const allYes = online.length >= 2 && online.every((id) => s[id] === true);
      if (allYes && !s.__matched) {
        s.__matched = true;
        addToQueue(room, msg.movieId, msg.meta, me.id);
        const item = room.queue.find((q) => q.movieId === msg.movieId);
        if (item) item.votes = [...new Set([...item.votes, ...online])];
        sortQueue(room);
        broadcast(room.code, { type: 'match', movieId: msg.movieId, meta: cleanMeta(msg.meta) });
        broadcast(room.code, { type: 'effect', kind: 'confetti', by: me.id });
      }
      pushState(room);
      break;
    }
    case 'chat': {
      const text = clip(msg.text, 400);
      if (!text) return;
      room.chat.push({ id: randomUUID().slice(0, 8), by: me.id, name: me.name, color: me.color, text, at: now() });
      if (room.chat.length > MAX_CHAT) room.chat.splice(0, room.chat.length - MAX_CHAT);
      pushState(room);
      break;
    }
    case 'reaction': {
      const emoji = clip(msg.emoji, 8);
      if (!emoji) return;
      broadcast(room.code, { type: 'reaction', emoji, by: me.id, name: me.name });
      break;
    }
    case 'effect': {
      if (!EFFECTS.has(msg.kind)) return;
      broadcast(room.code, { type: 'effect', kind: msg.kind, by: me.id, name: me.name });
      break;
    }
    case 'countdown': {
      const item = room.nowPlaying?.id === msg.itemId ? room.nowPlaying : room.queue.find((q) => q.id === msg.itemId);
      if (item && room.nowPlaying?.id !== item.id) {
        room.queue = room.queue.filter((q) => q.id !== item.id);
        room.nowPlaying = { ...item, startedBy: me.id, startedAt: now() };
      }
      const film = room.nowPlaying;
      if (!film) return;
      const service = (film.meta.retailers || []).find((r) => Object.values(room.members).every((m) => !m.services.length || m.services.includes(r))) || film.meta.retailers?.[0] || null;
      room.countdown = { id: randomUUID().slice(0, 8), startAt: now() + COUNTDOWN_LEAD_MS, movieId: film.movieId, meta: film.meta, service, by: me.id, name: me.name };
      broadcast(room.code, { type: 'countdown', countdown: room.countdown });
      pushState(room);
      break;
    }
    default:
      break;
  }
}

load();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end('Tonight Together WebSocket server — connect to /ws');
});

const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    try {
      handle(ws, msg);
    } catch (err) {
      console.warn('[together] handler error', err);
    }
  });
  ws.on('close', () => {
    const code = ws.room;
    if (!code) return;
    sockets.get(code)?.delete(ws);
    const room = rooms.get(code);
    if (room) pushState(room);
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

server.listen(PORT, HOST, () => {
  console.log(`[together] listening on ws://${HOST}:${PORT}/ws`);
});

// Tonight Together — service worker. Owns the WebSocket for each overlay tab and relays
// messages over a runtime port, so streaming-site CSP / private-network rules don't apply.
const DEFAULT_WS = 'wss://tonight-together.onrender.com/ws';

async function settings() {
  const s = await chrome.storage.local.get(['room', 'name', 'memberId', 'services', 'wsUrl', 'joinedRoom']);
  if (!s.memberId) {
    s.memberId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await chrome.storage.local.set({ memberId: s.memberId });
  }
  return { ...s, wsUrl: s.wsUrl || DEFAULT_WS };
}

const conns = new Set();

function makeConn(port) {
  const conn = { port, ws: null, closed: false, retry: 0, timer: null, ping: null, status: 'connecting' };

  const post = (msg) => {
    try {
      port.postMessage(msg);
    } catch {
      /* port gone */
    }
  };

  conn.connect = async () => {
    clearTimeout(conn.timer);
    clearInterval(conn.ping);
    const s = await settings();
    if (!s.room) {
      post({ type: 'ext-status', status: 'noRoom' });
      return;
    }
    post({ type: 'ext-status', status: 'connecting', room: s.room });
    let ws;
    try {
      ws = new WebSocket(s.wsUrl);
    } catch {
      post({ type: 'ext-status', status: 'offline', room: s.room });
      return;
    }
    conn.ws = ws;
    ws.onopen = () => {
      conn.retry = 0;
      ws.send(JSON.stringify({ type: 'join', room: s.room, memberId: s.memberId, name: s.name || 'Guest', services: s.services, client: 'ext', create: false, resume: s.joinedRoom === s.room }));
      const ping = () => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'ping', t0: Date.now() }));
      ping();
      conn.ping = setInterval(ping, 20000);
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'joined') {
        conn.status = 'open';
        if (s.joinedRoom !== msg.room) chrome.storage.local.set({ joinedRoom: msg.room });
        post({ type: 'ext-status', status: 'open', room: msg.room, memberId: msg.memberId });
      }
      if (msg.type === 'error' && msg.code === 'notFound') {
        conn.status = 'notFound';
        post({ type: 'ext-status', status: 'notFound', room: s.room });
        conn.closed = true;
        ws.close();
        return;
      }
      post(msg);
    };
    ws.onclose = () => {
      clearInterval(conn.ping);
      if (conn.closed || conn.ws !== ws) return;
      conn.status = 'offline';
      post({ type: 'ext-status', status: 'offline', room: s.room });
      conn.retry += 1;
      conn.timer = setTimeout(conn.connect, Math.min(10000, 700 * 2 ** conn.retry));
    };
  };

  conn.restart = () => {
    conn.closed = false;
    const old = conn.ws;
    conn.ws = null;
    old?.close();
    conn.connect();
  };

  conn.close = () => {
    conn.closed = true;
    clearTimeout(conn.timer);
    clearInterval(conn.ping);
    conn.ws?.close();
  };

  port.onMessage.addListener((msg) => {
    if (!msg || typeof msg.type !== 'string') return;
    if (conn.ws?.readyState === 1) conn.ws.send(JSON.stringify(msg));
  });
  port.onDisconnect.addListener(() => {
    conn.close();
    conns.delete(conn);
  });

  conns.add(conn);
  conn.connect();
  return conn;
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'tonight-overlay') makeConn(port);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.room || changes.wsUrl || changes.name) for (const c of conns) c.restart();
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'status') {
    const open = [...conns].filter((c) => c.status === 'open').length;
    reply({ overlays: conns.size, open });
  }
  return false;
});

import { useCallback, useEffect, useRef, useState } from 'react';

const PROFILE_KEY = 'tonight.together.profile';
const MEMBER_KEY = 'tonight.together.memberId';

// Live rooms need the realtime server: in dev it's proxied at /ws; in a static build
// (GitHub Pages) it only exists when VITE_WS_URL points at a hosted server.
export const TOGETHER_LIVE = !!import.meta.env.VITE_WS_URL || import.meta.env.DEV;

export function getWsUrl() {
  const env = import.meta.env.VITE_WS_URL;
  if (env) return env;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export function getMemberId() {
  try {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 16);
      localStorage.setItem(MEMBER_KEY, id);
    }
    return id;
  } catch {
    return `anon${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function readProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (p && typeof p.name === 'string') return { name: p.name, services: Array.isArray(p.services) ? p.services : [] };
  } catch {
    /* ignore */
  }
  return { name: '', services: [] };
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function movieMeta(movie) {
  return {
    title: movie.title,
    year: movie.year,
    poster: movie.poster || null,
    wikipedia: movie.wikipedia || null,
    imdbScore: typeof movie.imdbScore === 'number' ? movie.imdbScore : null,
    retailers: movie.retailers,
    moods: movie.moods,
    genres: movie.genres,
  };
}

export function sharedServices(members) {
  const withServices = (members || []).filter((m) => m.services?.length);
  if (!withServices.length) return [];
  return withServices.reduce((acc, m) => acc.filter((s) => m.services.includes(s)), withServices[0].services.slice());
}

/**
 * Realtime room connection. `onEvent` gets ephemeral events (reaction, effect, countdown, match).
 * status: idle | connecting | open | notFound | offline
 */
export function useRoom({ code, create, profile, enabled, onEvent }) {
  const [status, setStatus] = useState('idle');
  const [room, setRoom] = useState(null);
  const [joinedCode, setJoinedCode] = useState(null);
  const wsRef = useRef(null);
  const offsetRef = useRef(0);
  const eventRef = useRef(onEvent);
  const profileRef = useRef(profile);
  const [memberId] = useState(getMemberId);

  useEffect(() => {
    eventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!enabled) return undefined;
    let closed = false;
    let retry = 0;
    let timer = null;
    let pingTimer = null;
    let createFlag = create;

    const connect = () => {
      setStatus((s) => (s === 'open' ? 'connecting' : s === 'idle' ? 'connecting' : s));
      let ws;
      try {
        ws = new WebSocket(getWsUrl());
      } catch {
        setStatus('offline');
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        const p = profileRef.current || {};
        ws.send(JSON.stringify({ type: 'join', room: code, create: createFlag, memberId, name: p.name, services: p.services, client: 'web' }));
        const ping = () => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'ping', t0: Date.now() }));
        ping();
        pingTimer = setInterval(ping, 15000);
      };
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === 'pong') {
          const t1 = Date.now();
          offsetRef.current = msg.serverNow - (msg.t0 + (t1 - msg.t0) / 2);
          return;
        }
        if (msg.type === 'joined') {
          createFlag = false;
          setJoinedCode(msg.room);
          setStatus('open');
          return;
        }
        if (msg.type === 'state') {
          setRoom(msg.room);
          return;
        }
        if (msg.type === 'error' && msg.code === 'notFound') {
          closed = true;
          setStatus('notFound');
          ws.close();
          return;
        }
        eventRef.current?.(msg);
      };
      ws.onclose = () => {
        clearInterval(pingTimer);
        if (closed) return;
        setStatus('offline');
        retry += 1;
        timer = setTimeout(connect, Math.min(8000, 600 * 2 ** retry));
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      clearInterval(pingTimer);
      wsRef.current?.close();
    };
  }, [code, create, enabled, memberId]);

  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...payload }));
  }, []);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { status, room, joinedCode, memberId, send, serverNow };
}

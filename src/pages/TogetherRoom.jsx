import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Copy, Check, LogOut, MonitorPlay, Pencil, WifiOff } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { createFx } from '@/lib/effects';
import ComingSoon from '@/components/together/ComingSoon';
import { TOGETHER_LIVE, getWsUrl, readProfile, saveProfile, sharedServices, useRoom } from '@/lib/together';
import { recommendForRoom } from '@/lib/togetherRecs';
import { Avatar, NameField, SectionLabel, ServiceBadge, ServicePicker } from '@/components/together/parts';
import { AddFilm, NowPlaying, QueueList, RecsRail } from '@/components/together/Queue';
import Chat from '@/components/together/Chat';
import SwipeDeck from '@/components/together/SwipeDeck';
import Countdown from '@/components/together/Countdown';

const SWIPE_QUERY = '(max-width: 767px), (pointer: coarse)';

function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

function useSwiped(code) {
  const key = `tonight.together.swiped.${code}`;
  const [ids, setIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(key) || '[]'));
    } catch {
      return new Set();
    }
  });
  const add = useCallback(
    (id) =>
      setIds((prev) => {
        const next = new Set(prev).add(id);
        try {
          sessionStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [key],
  );
  return [ids, add];
}

function ProfileGate({ code, initial, onDone }) {
  const { t } = useI18n();
  const [p, setP] = useState(initial);
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-12">
      <p className="text-xs uppercase tracking-[0.28em] text-primary">{t('together.room')}</p>
      <h1 className="font-poster mt-1 text-6xl tracking-[0.12em] text-white">{code}</h1>
      <form
        className="mt-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!p.name.trim()) return;
          const next = { name: p.name.trim(), services: p.services };
          saveProfile(next);
          onDone(next);
        }}
      >
        <NameField value={p.name} onChange={(name) => setP((x) => ({ ...x, name }))} autoFocus />
        <ServicePicker value={p.services} onChange={(services) => setP((x) => ({ ...x, services }))} />
        <button
          type="submit"
          disabled={!p.name.trim()}
          className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground disabled:opacity-40"
        >
          {t('together.join')}
        </button>
      </form>
    </div>
  );
}

function Members({ room, memberId, onEdit }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-2">
      {room.members.map((m) => (
        <li key={m.id} className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 ${m.online ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 opacity-50'}`}>
          <Avatar member={m} size="sm" />
          <span className="text-sm text-white">
            {m.name}
            {m.id === memberId && <span className="text-white/45"> ({t('together.you')})</span>}
          </span>
          <span className="hidden gap-1 sm:flex">
            {m.services.map((s) => (
              <ServiceBadge key={s} id={s} dim />
            ))}
          </span>
          {m.id === memberId && (
            <button type="button" onClick={onEdit} aria-label={t('together.edit')} className="text-white/45 hover:text-white">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ExtensionCard({ code, profile, memberId }) {
  const { t } = useI18n();
  const [state, setState] = useState('idle');
  useEffect(() => {
    const on = (e) => {
      if (e.source === window && e.data?.source === 'tonight-ext' && e.data.type === 'room-saved') setState('sent');
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  const open = () => {
    if (document.documentElement.dataset.tonightExt !== '1') {
      setState('missing');
      return;
    }
    window.postMessage({ source: 'tonight-web', type: 'join-room', room: code, name: profile.name, services: profile.services, memberId, wsUrl: getWsUrl() }, window.location.origin);
  };
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <MonitorPlay className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('together.ext.title')}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/55">{t('together.ext.body')}</p>
      <button
        type="button"
        onClick={open}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white hover:text-black"
      >
        {t('together.ext.send')}
      </button>
      {state === 'sent' && <p className="mt-2 text-xs text-emerald-400">{t('together.ext.sent')}</p>}
      {state === 'missing' && <p className="mt-2 text-xs text-white/50">{t('together.ext.missing')}</p>}
    </div>
  );
}

export default function TogetherRoom() {
  const { t } = useI18n();
  const { code: rawCode } = useParams();
  const code = (rawCode || '').toUpperCase();
  const location = useLocation();
  const create = !!location.state?.create;
  const [profile, setProfile] = useState(readProfile);
  const [editing, setEditing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('swipe');
  const swipeMode = useMedia(SWIPE_QUERY);
  const [swiped, addSwiped] = useSwiped(code);
  const fxLayer = useRef(null);
  const fx = useRef(null);

  useEffect(() => {
    if (fxLayer.current) fx.current = createFx(fxLayer.current);
  }, []);

  const onEvent = useCallback((msg) => {
    if (msg.type === 'reaction') fx.current?.reaction(msg.emoji, msg.name);
    else if (msg.type === 'effect') fx.current?.effect(msg.kind);
    else if (msg.type === 'countdown') setCountdown(msg.countdown);
    else if (msg.type === 'match') {
      setToast(msg.meta?.title || '');
      setTimeout(() => setToast(null), 4200);
    }
  }, []);

  const { status, room, memberId, send, serverNow } = useRoom({
    code,
    create,
    profile,
    enabled: TOGETHER_LIVE && !!profile.name,
    onEvent,
  });

  useEffect(() => {
    if (status === 'open') send('mode', { swipe: swipeMode });
  }, [status, swipeMode, send]);

  // Late joiners / reloads pick up a countdown that is still running.
  const [seenCd, setSeenCd] = useState(null);
  if (room?.countdown && room.countdown.id !== seenCd) {
    setSeenCd(room.countdown.id);
    if (!countdown || countdown.id !== room.countdown.id) setCountdown(room.countdown);
  }

  const shared = useMemo(() => sharedServices(room?.members), [room?.members]);
  const recs = useMemo(() => {
    if (!room) return [];
    const exclude = new Set([...room.queue.map((q) => q.movieId), room.nowPlaying?.movieId].filter(Boolean));
    return recommendForRoom(room, shared, { exclude, limit: 40 });
  }, [room, shared]);
  const deck = useMemo(() => recs.filter((m) => !swiped.has(m.id)), [recs, swiped]);

  useEffect(() => {
    document.title = `${t('together.room')} ${code} — Tonight`;
    return () => {
      document.title = 'Tonight';
    };
  }, [code, t]);

  const fxNode = <div ref={fxLayer} className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden="true" />;

  if (!TOGETHER_LIVE) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-20 pt-12">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">{t('together.room')}</p>
        <h1 className="font-poster mb-8 mt-1 text-6xl tracking-[0.12em] text-white">{code}</h1>
        <ComingSoon />
      </div>
    );
  }

  if (!profile.name || editing) {
    return (
      <>
        {fxNode}
        <ProfileGate
          code={code}
          initial={profile}
          onDone={(p) => {
            setProfile(p);
            if (editing) send('profile', p);
            setEditing(false);
          }}
        />
      </>
    );
  }

  if (status === 'notFound') {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center">
        {fxNode}
        <p className="font-poster text-6xl tracking-[0.12em] text-white">{code}</p>
        <p className="mt-4 text-white/65">{t('together.notFound', { code })}</p>
        <Link to="/together" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          {t('together.create')}
        </Link>
      </div>
    );
  }

  const online = room?.members.filter((m) => m.online).length || 0;
  const link = `${window.location.origin}${window.location.pathname}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const header = (
    <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">{t('together.room')}</p>
            <h1 className="font-poster text-5xl leading-none tracking-[0.14em] text-white sm:text-6xl">{code}</h1>
          </div>
          <button
            type="button"
            onClick={copy}
            className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 transition-colors hover:border-white hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? t('together.copied') : t('together.copyLink')}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/55">
          {status !== 'open' && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              {status === 'offline' ? t('together.offline') : t('together.connecting')}
            </span>
          )}
          {status === 'open' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              {t('together.online', { n: online })}
            </span>
          )}
          <Link to="/together" className="inline-flex items-center gap-1 hover:text-white" aria-label={t('together.leave')} title={t('together.leave')}>
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {room && <Members room={room} memberId={memberId} onEdit={() => setEditing(true)} />}
      {room && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">{t('together.shared')}</span>
          {shared.length ? (
            shared.map((s) => <ServiceBadge key={s} id={s} />)
          ) : (
            <span className="text-amber-200/80">{t('together.noShared')}</span>
          )}
          {online < 2 && <span className="basis-full text-white/40 sm:basis-auto sm:pl-2">{t('together.invite')}</span>}
        </div>
      )}
    </div>
  );

  const overlays = (
    <>
      {fxNode}
      <Countdown countdown={countdown} serverNow={serverNow} />
      {toast != null && (
        <div className="fixed inset-x-0 top-24 z-[58] flex justify-center px-4" role="status">
          <div className="rec-enter rounded-2xl border border-primary/40 bg-black/90 px-6 py-4 text-center shadow-2xl backdrop-blur">
            <p className="font-poster text-4xl tracking-[0.1em] text-primary">{t('together.match')}</p>
            <p className="mt-1 text-sm text-white/80">{t('together.matchSub', { title: toast })}</p>
          </div>
        </div>
      )}
    </>
  );

  if (!room) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        {overlays}
        {header}
      </div>
    );
  }

  const listView = (
    <div className="flex flex-col gap-8">
      <NowPlaying room={room} send={send} />
      <section className="flex flex-col gap-4">
        <SectionLabel right={<span className="text-xs text-white/40">{room.queue.length}</span>}>{t('together.upNext')}</SectionLabel>
        <AddFilm room={room} send={send} />
        <QueueList room={room} memberId={memberId} send={send} />
      </section>
      <RecsRail room={room} recs={recs} send={send} />
    </div>
  );

  if (swipeMode) {
    const tabs = [
      ['swipe', t('together.swipe')],
      ['list', `${t('together.list')}${room.queue.length ? ` · ${room.queue.length}` : ''}`],
      ['chat', t('together.chat')],
    ];
    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-5">
        {overlays}
        {header}
        <div className="sticky top-24 z-20 -mx-4 mt-4 flex gap-1 bg-black/90 px-4 py-2 backdrop-blur" role="tablist">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-full py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                tab === id ? 'bg-white text-black' : 'text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === 'swipe' && (
            <div>
              <p className="mb-4 text-center text-xs text-white/50">{t('together.swipeHint')}</p>
              {shared.length ? (
                <SwipeDeck
                  deck={deck}
                  shared={shared}
                  onSwipe={(movie, yes, meta) => {
                    addSwiped(movie.id);
                    send('swipe', { movieId: movie.id, yes, meta });
                  }}
                />
              ) : (
                <p className="mt-10 text-center text-sm text-amber-200/80">{t('together.noShared')}</p>
              )}
            </div>
          )}
          {tab === 'list' && listView}
          {tab === 'chat' && <Chat room={room} memberId={memberId} send={send} className="h-[calc(100dvh-15rem)] min-h-[26rem]" />}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      {overlays}
      {header}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">{listView}</div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:h-[calc(100dvh-8.5rem)]">
          <Chat room={room} memberId={memberId} send={send} className="min-h-[24rem] flex-1" />
          <ExtensionCard code={code} profile={profile} memberId={memberId} />
        </aside>
      </div>
    </div>
  );
}

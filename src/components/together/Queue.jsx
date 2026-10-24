import { useMemo, useState } from 'react';
import { ChevronUp, ExternalLink, Play, Plus, Search, Trash2, Check, Timer } from 'lucide-react';
import Poster from '@/components/Poster';
import { getMovieById, getRetailer } from '@/data/catalog';
import { useI18n } from '@/i18n/context';
import { serviceUrl } from '@/lib/services';
import { movieMeta, sharedServices } from '@/lib/together';
import { searchShared } from '@/lib/togetherRecs';
import { Avatar, SectionLabel, ServiceBadge } from './parts';

function itemMovie(item) {
  return getMovieById(item.movieId) || { id: item.movieId, ...item.meta };
}

function pickService(retailers, shared) {
  return (retailers || []).find((r) => shared.includes(r)) || retailers?.[0];
}

export function NowPlaying({ room, send }) {
  const { t } = useI18n();
  const shared = sharedServices(room.members);
  const item = room.nowPlaying;
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/55">{t('together.nothingPlaying')}</div>
    );
  }
  const movie = itemMovie(item);
  const svc = getRetailer(pickService(item.meta.retailers, shared));
  return (
    <div className="flex gap-4 rounded-xl border border-primary/30 bg-primary/[0.06] p-3 sm:gap-5 sm:p-4">
      <div className="w-20 shrink-0 sm:w-24">
        <Poster movie={movie} className="!rounded-md" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{t('together.nowPlaying')}</p>
        <p className="font-display mt-1 truncate text-2xl leading-tight text-white sm:text-3xl">{movie.title}</p>
        <p className="mt-1 text-xs text-white/55">
          {movie.year}
          {typeof movie.imdbScore === 'number' && <> · IMDb {movie.imdbScore.toFixed(1)}</>}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => send('countdown', { itemId: item.id })}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.8)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Timer className="h-4 w-4" aria-hidden="true" />
            {t('together.startTogether')}
          </button>
          {svc && (
            <a
              href={serviceUrl(svc.id, movie.title)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-primary"
            >
              {svc.short}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function QueueList({ room, memberId, send }) {
  const { t } = useI18n();
  const shared = sharedServices(room.members);
  const byId = useMemo(() => Object.fromEntries(room.members.map((m) => [m.id, m])), [room.members]);

  if (!room.queue.length) {
    return <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/55">{t('together.queueEmpty')}</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {room.queue.map((item, index) => {
        const movie = itemMovie(item);
        const adder = byId[item.addedBy];
        const voted = item.votes.includes(memberId);
        const svc = pickService(item.meta.retailers, shared);
        return (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 pr-3 transition-colors hover:border-white/20 hover:bg-white/[0.05] sm:gap-4"
          >
            <span className="w-5 shrink-0 text-center font-cond text-lg text-white/35">{index + 1}</span>
            <div className="w-12 shrink-0 sm:w-14">
              <Poster movie={movie} className="!rounded-md" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-white sm:text-base">{movie.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
                <span>{movie.year}</span>
                {typeof movie.imdbScore === 'number' && <span>IMDb {movie.imdbScore.toFixed(1)}</span>}
                {svc && <ServiceBadge id={svc} />}
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/60">
                <Avatar member={adder} size="sm" />
                <span className="truncate">{t('together.addedBy', { name: adder?.id === memberId ? t('together.you') : adder?.name || '—' })}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => send('queue-vote', { itemId: item.id })}
                aria-pressed={voted}
                aria-label={t('together.vote')}
                title={t('together.vote')}
                className={`flex h-12 w-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
                  voted ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white'
                }`}
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                {item.votes.length}
              </button>
              <button
                type="button"
                onClick={() => send('queue-play', { itemId: item.id })}
                className="hidden h-9 items-center gap-1.5 rounded-full border border-white/25 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground sm:inline-flex"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {t('together.watchNow')}
              </button>
              <button
                type="button"
                onClick={() => send('queue-play', { itemId: item.id })}
                aria-label={t('together.watchNow')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 sm:hidden"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {item.addedBy === memberId && (
                <button
                  type="button"
                  onClick={() => send('queue-remove', { itemId: item.id })}
                  aria-label={t('together.remove')}
                  title={t('together.remove')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AddFilm({ room, send }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const shared = sharedServices(room.members);
  const inList = new Set([...room.queue.map((i) => i.movieId), room.nowPlaying?.movieId]);
  const results = searchShared(q, shared);

  const add = (movie) => {
    send('queue-add', { movieId: movie.id, meta: movieMeta(movie) });
    setQ('');
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) add(results[0]);
          if (e.key === 'Escape') setQ('');
        }}
        disabled={!shared.length}
        placeholder={t('together.searchPh')}
        aria-label={t('together.searchPh')}
        className="h-11 w-full rounded-full border border-white/20 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-white/60 disabled:opacity-50"
      />
      {q.trim() && (
        <ul className="absolute inset-x-0 top-12 z-30 max-h-80 overflow-auto rounded-xl border border-white/15 bg-neutral-950/95 p-1 shadow-2xl backdrop-blur-md">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-white/50">{t('together.noResults')}</li>}
          {results.map((m) => {
            const already = inList.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => add(m)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
                >
                  <div className="w-8 shrink-0">
                    <Poster movie={m} className="!rounded" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{m.title}</span>
                    <span className="text-xs text-white/50">
                      {m.year}
                      {typeof m.imdbScore === 'number' && <> · IMDb {m.imdbScore.toFixed(1)}</>}
                    </span>
                  </span>
                  {already ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : <Plus className="h-4 w-4 text-white/60" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RecsRail({ room, recs, send }) {
  const { t } = useI18n();
  const shared = sharedServices(room.members);
  const inList = new Set([...room.queue.map((i) => i.movieId), room.nowPlaying?.movieId]);
  if (!shared.length) return null;
  const names = shared.map((s) => getRetailer(s)?.label).filter(Boolean).join(', ');
  return (
    <section>
      <SectionLabel>{t('together.recsTitle')}</SectionLabel>
      <p className="mt-1 text-sm text-white/50">{t('together.recsSub', { services: names })}</p>
      <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">
        {recs.slice(0, 14).map((m) => {
          const already = inList.has(m.id);
          return (
            <article key={m.id} className="group relative w-36 shrink-0 snap-start sm:w-40">
              <Poster movie={m} className="!rounded-md" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-10">
                <p className="font-poster text-lg leading-[0.95] tracking-wide text-white">{m.title.toUpperCase()}</p>
                <p className="mt-0.5 text-[10px] text-white/60">
                  {m.year}
                  {typeof m.imdbScore === 'number' && <> · IMDb {m.imdbScore.toFixed(1)}</>}
                </p>
              </div>
              <button
                type="button"
                disabled={already}
                onClick={() => send('queue-add', { movieId: m.id, meta: movieMeta(m) })}
                className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-lg transition-colors ${
                  already ? 'bg-black/70 text-primary' : 'bg-white text-black hover:bg-primary'
                }`}
              >
                {already ? <Check className="h-3 w-3" aria-hidden="true" /> : <Plus className="h-3 w-3" aria-hidden="true" />}
                {already ? t('together.inList') : t('together.add')}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, ExternalLink, Shuffle, Star } from 'lucide-react';
import Poster from '@/components/Poster';
import { getRetailer, normalizeGenre } from '@/data/catalog';
import { useI18n } from '@/i18n/context';
import { SERVICE_URLS, justWatchUrl as jwUrl } from '@/lib/services';
import {
  formatStockholmDate,
  getDailyPicks,
  msUntilStockholmMidnight,
  stockholmDateKey,
} from '@/lib/daily';

function justWatchUrl(movie) {
  return jwUrl(movie.title);
}

function useStockholmDay() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return { dateKey: stockholmDateKey(now), msLeft: msUntilStockholmMidnight(now) };
}

// Keep the pitch to a line or two: use the catalog text, cut at a sentence boundary.
function shortPitch(text, max = 220) {
  if (!text || text.length <= max) return text;
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  return (out.trim() || `${text.slice(0, max).replace(/\s+\S*$/, '')}…`);
}

function pickLink(movie) {
  return `/pick?mood=${encodeURIComponent(movie.moods[0])}&id=${movie.id}`;
}

function BackupCard({ movie }) {
  const { mood: tMood } = useI18n();
  const retailer = getRetailer(movie.retailers[0]);
  return (
    <Link
      to={pickLink(movie)}
      className="group flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-primary/40 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div className="w-16 shrink-0 sm:w-[4.5rem]">
        <Poster movie={movie} className="!rounded-md" />
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{tMood(movie.moods[0])}</p>
        <p className="font-poster mt-1 truncate text-2xl leading-none tracking-wide text-white">
          {movie.title.toUpperCase()}
        </p>
        <p className="mt-1.5 text-xs text-white/60">
          {movie.year}
          {typeof movie.imdbScore === 'number' && <> · IMDb {movie.imdbScore.toFixed(1)}</>}
          {retailer && <> · {retailer.label}</>}
        </p>
      </div>
    </Link>
  );
}

export default function Today() {
  const { t, locale, mood: tMood, genre: tGenre, subgenre: tSub, runtime: fmtRuntime, countdown } = useI18n();
  const { dateKey, msLeft } = useStockholmDay();
  const { pick: film, backups } = useMemo(() => getDailyPicks(dateKey), [dateKey]);

  useEffect(() => {
    document.title = `${t('today.title')} · ${film.title} — Tonight`;
    return () => {
      document.title = 'Tonight';
    };
  }, [film.title, t]);

  const runtime = fmtRuntime(film.runtime);
  const genres = film.genres.map((g) => tGenre(normalizeGenre(g)));
  const subgenres = film.subgenres || [];

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 cinematic-wash" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
            <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {formatStockholmDate(dateKey, locale)}
          </p>
          <p
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70"
            title={t('today.changesAt')}
          >
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t('today.newPickIn', { time: countdown(msLeft) })}
          </p>
        </div>

        <article
          key={film.id}
          className="rec-enter grid items-start gap-8 md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-14"
        >
          <div className="mx-auto w-full max-w-[300px] md:max-w-none">
            <div className="poster-frame">
              <Poster movie={film} />
            </div>
          </div>

          <div className="flex flex-col md:pt-4">
            <p className="font-poster text-2xl tracking-[0.2em] text-primary sm:text-3xl">{t('today.title')}</p>
            <h1 className="font-display mt-2 text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              {film.title}
            </h1>

            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:text-base">
              <span>{film.year}</span>
              {runtime && (
                <>
                  <span className="text-primary/70">·</span>
                  <span>{runtime}</span>
                </>
              )}
              <span className="text-primary/70">·</span>
              <span>{genres.join(' / ')}</span>
              {typeof film.imdbScore === 'number' && (
                <>
                  <span className="text-primary/70">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Star className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
                    {film.imdbScore.toFixed(1)}
                    <span className="font-normal text-muted-foreground">IMDb</span>
                  </span>
                </>
              )}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {film.moods.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary"
                >
                  {tMood(m)}
                </span>
              ))}
              {subgenres.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/25 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75"
                >
                  {tSub(s)}
                </span>
              ))}
            </div>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/90">{shortPitch(film.hook)}</p>

            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">{t('today.stream')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {film.retailers.map((id) => {
                  const r = getRetailer(id);
                  if (!r) return null;
                  return (
                    <a
                      key={id}
                      href={SERVICE_URLS[id] || justWatchUrl(film)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {r.short}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  );
                })}
                <a
                  href={justWatchUrl(film)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {t('today.justwatch')}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </article>

        <section className="mt-16 border-t border-white/10 pt-8" aria-labelledby="not-today">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="not-today" className="font-poster text-3xl tracking-[0.12em] text-white">
                {t('today.notToday')}
              </h2>
              <p className="mt-1 text-sm text-white/55">{t('today.backupsSub')}</p>
            </div>
            <Link
              to="/pick"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              {t('today.pickByMood')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {backups.map((m) => (
              <BackupCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { RETAILERS, getMovieById } from '@/data/catalog';
import { getPosterUrl } from '@/lib/posters';
import { getDailyPicks } from '@/lib/daily';
import { useI18n } from '@/i18n/context';

function ColumnImage({ movie }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (movie?.poster) {
      setSrc(movie.poster);
      return undefined;
    }
    if (!movie?.wikipedia) return undefined;
    let cancelled = false;
    getPosterUrl(movie.wikipedia).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [movie]);

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-black" aria-hidden="true" />
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] grayscale contrast-[1.1] transition-[filter] duration-500 ease-out group-hover:grayscale-0 group-focus-visible:grayscale-0 motion-reduce:transition-none"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40"
        aria-hidden="true"
      />
    </>
  );
}

function DailyTeaser() {
  const { t } = useI18n();
  const { pick } = getDailyPicks();
  const [src, setSrc] = useState(pick.poster || null);

  useEffect(() => {
    if (pick.poster || !pick.wikipedia) return undefined;
    let cancelled = false;
    getPosterUrl(pick.wikipedia).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [pick]);

  return (
    <Link
      to="/today"
      aria-label={`${t('nav.today')}: ${pick.title}`}
      className="group/teaser absolute right-4 top-36 z-20 flex w-[10.5rem] items-center gap-2.5 border border-white/20 bg-black/70 p-2 backdrop-blur-md transition-colors hover:border-primary/70 hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:w-[12.5rem]"
    >
      <div className="hidden aspect-[2/3] w-11 shrink-0 overflow-hidden bg-neutral-800 sm:block">
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">{t('nav.today')}</p>
        <p className="font-poster mt-1 truncate text-xl leading-none tracking-wide text-white">
          {pick.title.toUpperCase()}
        </p>
        <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-white/60 transition-colors group-hover/teaser:text-white">
          {t('landing.teaserCta')}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}

export default function Landing() {
  const { t } = useI18n();
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="flex h-full w-full" role="list">
        {RETAILERS.map((retailer, index) => {
          const film = getMovieById(retailer.featured);
          return (
            <Link
              key={retailer.id}
              role="listitem"
              to={`/archive?retailer=${retailer.id}`}
              aria-label={t('landing.browse', { name: retailer.label })}
              className="retailer-col group relative flex min-w-0 flex-col overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              <ColumnImage movie={film} />
              <span
                className="pointer-events-none absolute left-2 top-[4.75rem] font-cond text-3xl font-medium tracking-wider text-white/25 sm:left-4 sm:text-5xl md:text-6xl"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className="retailer-vert pointer-events-none absolute bottom-8 left-2 font-poster text-[1.85rem] leading-none tracking-[0.2em] text-white sm:bottom-10 sm:left-4 sm:text-4xl md:text-[2.75rem]"
              >
                {retailer.short}
              </span>
            </Link>
          );
        })}
      </div>

      <DailyTeaser />

      <Link
        to="/archive"
        className="absolute bottom-6 right-6 z-20 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {t('landing.enter')}
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

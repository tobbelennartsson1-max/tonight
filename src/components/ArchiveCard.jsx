import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPosterUrl } from '@/lib/posters';
import { getRetailer, normalizeGenre } from '@/data/catalog';
import { useI18n } from '@/i18n/context';

export default function ArchiveCard({
  movie,
  preferredRetailer,
  onRetailerClick,
  list,
  listRank,
  activeSubgenre,
}) {
  const { t, genre: tGenre, subgenre: tSub, status: tStatus } = useI18n();
  const [src, setSrc] = useState(null);
  const retailerId = movie.retailers.includes(preferredRetailer)
    ? preferredRetailer
    : movie.retailers[0];
  const retailer = getRetailer(retailerId);
  const genreTag = activeSubgenre
    ? tSub(activeSubgenre)
    : movie.genres[0]
      ? tGenre(normalizeGenre(movie.genres[0]))
      : null;

  let meta = movie.status ? `${tStatus(movie.status)} · ${movie.year}` : String(movie.year);
  if (list === 'top10' && listRank) meta = t('card.top10', { n: listRank });
  else if (list === 'new' && listRank) meta = t('card.new', { n: listRank });

  useEffect(() => {
    let cancelled = false;
    if (movie.poster) {
      setSrc(movie.poster);
      return undefined;
    }
    getPosterUrl(movie.wikipedia).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [movie.poster, movie.wikipedia]);

  return (
    <article className="group relative aspect-[2/3] overflow-hidden bg-neutral-950">
      <Link
        to={`/pick?mood=${encodeURIComponent(movie.moods[0])}&id=${movie.id}`}
        className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
        aria-label={`${movie.title} (${movie.year})`}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/20" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={() => onRetailerClick(retailerId)}
        className="absolute left-2 top-2 z-10 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {retailer?.short}
      </button>

      {genreTag && (
        <span className="pointer-events-none absolute right-2 top-2 z-10 border border-white/75 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
          {genreTag}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-3">
        <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/70">
          {meta}
        </p>
        <h2 className="font-poster mt-1 text-[clamp(1.35rem,2.4vw,2.15rem)] leading-[0.85] tracking-wide text-white">
          {movie.title.toUpperCase()}
        </h2>
      </div>
    </article>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPosterUrl } from '@/lib/posters';
import { useI18n } from '@/i18n/context';

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return 20 + (h % 40);
}

function FallbackPoster({ movie, className }) {
  const hue = useMemo(() => hashHue(movie.id || movie.title), [movie.id, movie.title]);
  return (
    <div
      className={`relative flex aspect-[2/3] w-full flex-col justify-end overflow-hidden rounded-lg p-5 ${className || ''}`}
      style={{
        background: `linear-gradient(160deg, hsl(${hue} 28% 14%) 0%, hsl(240 10% 6%) 70%)`,
      }}
      aria-label={`${movie.title} (${movie.year})`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,rgba(232,197,120,0.25),transparent_55%)]" />
      <p className="font-display text-2xl leading-tight text-foreground sm:text-3xl">{movie.title}</p>
      <p className="mt-2 text-sm tracking-[0.2em] text-primary">{movie.year}</p>
    </div>
  );
}

export default function Poster({ movie, className = '', imgClassName = '' }) {
  const { t } = useI18n();
  const [src, setSrc] = useState(movie.poster || null);
  const [phase, setPhase] = useState('loading');
  const [loadedSrc, setLoadedSrc] = useState(null);
  const imgRef = useRef(null);

  // Cached images can finish loading before React's onLoad is attached; catch that case.
  useEffect(() => {
    const img = imgRef.current;
    if (img && src && img.complete && img.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');

    if (movie.poster) {
      setSrc(movie.poster);
      return () => {
        cancelled = true;
      };
    }

    setSrc(null);
    getPosterUrl(movie.wikipedia).then((url) => {
      if (cancelled) return;
      if (url) setSrc(url);
      else setPhase('fallback');
    });
    return () => {
      cancelled = true;
    };
  }, [movie.poster, movie.wikipedia]);

  const onError = () => {
    if (src && movie.poster && src === movie.poster && movie.wikipedia) {
      getPosterUrl(movie.wikipedia).then((url) => {
        if (url) setSrc(url);
        else setPhase('fallback');
      });
      return;
    }
    setPhase('fallback');
  };

  if (phase === 'fallback') {
    return <FallbackPoster movie={movie} className={className} />;
  }

  return (
    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted ${className}`}>
      {loadedSrc !== src && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-background" aria-hidden="true" />
      )}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={t('poster.alt', { title: movie.title, year: movie.year })}
          onLoad={() => setLoadedSrc(src)}
          onError={onError}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            loadedSrc === src ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}

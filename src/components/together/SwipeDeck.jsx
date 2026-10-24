import { useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import Poster from '@/components/Poster';
import { normalizeGenre } from '@/data/catalog';
import { useI18n } from '@/i18n/context';
import { movieMeta } from '@/lib/together';
import { ServiceBadge } from './parts';

const THRESHOLD = 90;

export default function SwipeDeck({ deck, shared, onSwipe }) {
  const { t, mood: tMood, genre: tGenre } = useI18n();
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState(null);
  const start = useRef(null);
  const dx = useRef(0);
  const top = deck[0];
  const next = deck[1];

  const decide = (yes) => {
    if (!top || leaving) return;
    setLeaving(yes ? 'right' : 'left');
    setTimeout(() => {
      onSwipe(top, yes, movieMeta(top));
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 220);
  };

  const onDown = (e) => {
    if (leaving) return;
    start.current = { x: e.clientX, y: e.clientY };
    dx.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onMove = (e) => {
    if (!start.current) return;
    dx.current = e.clientX - start.current.x;
    setDrag({ x: dx.current, y: (e.clientY - start.current.y) * 0.3, active: true });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    if (Math.abs(dx.current) > THRESHOLD) decide(dx.current > 0);
    else setDrag({ x: 0, y: 0, active: false });
  };

  if (!top) {
    return <p className="mx-auto mt-16 max-w-xs text-center text-sm text-white/55">{t('together.deckEmpty')}</p>;
  }

  const x = leaving === 'right' ? 520 : leaving === 'left' ? -520 : drag.x;
  const rot = x / 18;
  const yesOpacity = Math.max(0, Math.min(1, x / THRESHOLD));
  const noOpacity = Math.max(0, Math.min(1, -x / THRESHOLD));
  const svc = top.retailers.find((r) => shared.includes(r)) || top.retailers[0];

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-[2/3] w-full max-w-[19rem]">
        {next && (
          <div className="absolute inset-0 scale-[0.94] opacity-60" aria-hidden="true">
            <Poster movie={next} className="h-full" />
          </div>
        )}
        <div
          role="group"
          aria-label={top.title}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 touch-none select-none overflow-hidden rounded-lg shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
          style={{
            transform: `translate(${x}px, ${drag.y}px) rotate(${rot}deg)`,
            transition: drag.active && !leaving ? 'none' : 'transform 0.22s ease-out',
          }}
        >
          <Poster movie={top} className="h-full !rounded-lg" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <span
            className="pointer-events-none absolute left-4 top-5 -rotate-12 border-[3px] border-emerald-400 px-2 font-poster text-3xl tracking-[0.12em] text-emerald-400"
            style={{ opacity: yesOpacity }}
          >
            {t('together.yes')}
          </span>
          <span
            className="pointer-events-none absolute right-4 top-5 rotate-12 border-[3px] border-rose-400 px-2 font-poster text-3xl tracking-[0.12em] text-rose-400"
            style={{ opacity: noOpacity }}
          >
            {t('together.no')}
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2">
              {svc && <ServiceBadge id={svc} />}
              {typeof top.imdbScore === 'number' && (
                <span className="text-xs font-semibold text-white">★ {top.imdbScore.toFixed(1)}</span>
              )}
            </div>
            <p className="font-poster mt-2 text-4xl leading-[0.9] tracking-wide text-white">{top.title.toUpperCase()}</p>
            <p className="mt-1 text-xs text-white/70">
              {top.year} · {top.genres.slice(0, 2).map((g) => tGenre(normalizeGenre(g))).join(' / ')} · {tMood(top.moods[0])}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-8">
        <button
          type="button"
          onClick={() => decide(false)}
          aria-label={t('together.no')}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400/70 text-rose-400 transition-transform active:scale-90"
        >
          <X className="h-7 w-7" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          aria-label={t('together.yes')}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/70 text-emerald-400 transition-transform active:scale-90"
        >
          <Heart className="h-7 w-7" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

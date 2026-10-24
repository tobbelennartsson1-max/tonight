import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  Brain,
  Coffee,
  Flame,
  Ghost,
  Heart,
  Laugh,
  Shuffle,
  Sparkles,
  Zap,
} from 'lucide-react';
import Poster from '@/components/Poster';
import { MOODS, getMovieById, getMoviesByMood, movies, normalizeGenre, pickRandom } from '@/data/catalog';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/i18n/context';

const MOOD_META = {
  'Feel-good': { Icon: Sparkles, tilt: '-rotate-1' },
  Funny: { Icon: Laugh, tilt: 'rotate-1' },
  Thrilling: { Icon: Zap, tilt: '-rotate-2' },
  'Mind-bending': { Icon: Brain, tilt: 'rotate-2' },
  Cozy: { Icon: Coffee, tilt: '-rotate-1' },
  Romantic: { Icon: Heart, tilt: 'rotate-1' },
  Scary: { Icon: Ghost, tilt: 'rotate-2' },
  Intense: { Icon: Flame, tilt: '-rotate-2' },
};


export default function Home() {
  const { t, mood: tMood, genre: tGenre, runtime } = useI18n();
  const [params, setParams] = useSearchParams();
  const { isSaved, toggle } = useWatchlist();
  const seenRef = useRef({});

  const moodParam = params.get('mood');
  const idParam = params.get('id');
  const mood = MOODS.includes(moodParam) ? moodParam : null;
  const film = useMemo(() => (idParam ? getMovieById(idParam) : null), [idParam]);

  const pickFromMood = useCallback((nextMood, avoidId) => {
    const seen = seenRef.current[nextMood] ?? new Set();
    let pool = getMoviesByMood(nextMood).filter((m) => !seen.has(m.id) && m.id !== avoidId);
    if (pool.length === 0) {
      seen.clear();
      pool = getMoviesByMood(nextMood).filter((m) => m.id !== avoidId);
      if (pool.length === 0) pool = getMoviesByMood(nextMood);
    }
    const picked = pickRandom(pool);
    if (picked) seen.add(picked.id);
    seenRef.current[nextMood] = seen;
    return picked;
  }, []);

  const showFilm = (nextMood, nextFilm) => {
    setParams({ mood: nextMood, id: nextFilm.id });
  };

  const chooseMood = (nextMood) => {
    const picked = pickFromMood(nextMood);
    if (picked) showFilm(nextMood, picked);
  };

  const surprise = () => {
    const nextMood = pickRandom(MOODS);
    const picked = pickFromMood(nextMood);
    if (picked) showFilm(nextMood, picked);
  };

  const notThisOne = () => {
    if (!mood) return;
    const picked = pickFromMood(mood, film?.id);
    if (picked) showFilm(mood, picked);
  };

  const differentMood = () => {
    setParams({});
  };

  const onSave = () => {
    if (!film) return;
    toggle(film.id);
  };

  if (!film || !mood) {
    return (
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <p className="text-xs uppercase tracking-[0.32em] text-primary">{t('pick.eyebrow')}</p>
        <h1 className="font-display mt-5 max-w-2xl text-center text-4xl leading-[1.05] text-foreground sm:text-6xl md:text-7xl">
          {t('pick.title')}
        </h1>
        <p className="mt-4 max-w-md text-center text-muted-foreground">
          {t('pick.sub')}
        </p>

        <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {MOODS.map((label) => {
            const { Icon, tilt } = MOOD_META[label];
            return (
              <button
                key={label}
                type="button"
                onClick={() => chooseMood(label)}
                className={`mood-chip group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 text-center shadow-[0_10px_40px_-24px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary active:text-primary-foreground sm:min-h-[6.5rem] ${tilt}`}
              >
                <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110 group-active:text-primary-foreground" aria-hidden="true" />
                <span className="text-sm font-medium sm:text-base">{tMood(label)}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={surprise}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.7)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Shuffle className="h-5 w-5" aria-hidden="true" />
          {t('pick.surprise')}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">{t('pick.count', { n: movies.length })}</p>
      </div>
    );
  }

  const saved = isSaved(film.id);
  const Meta = MOOD_META[mood];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={differentMood}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('pick.differentMood')}
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {Meta?.Icon ? <Meta.Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {tMood(mood)}
        </span>
      </div>

      <article
        key={film.id}
        className="rec-enter grid items-center gap-8 md:grid-cols-[minmax(0,280px)_1fr] lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14"
      >
        <div className="mx-auto w-full max-w-[280px] md:max-w-none">
          <div className="poster-frame">
            <Poster movie={film} />
          </div>
        </div>

        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.28em] text-primary">{t('pick.tonightsPick')}</p>
          <h2 className="font-display mt-2 text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
            {film.title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {film.year}
            <span className="mx-2 text-primary/70">·</span>
            {runtime(film.runtime)}
            <span className="mx-2 text-primary/70">·</span>
            {film.genres.map((g) => tGenre(normalizeGenre(g))).join(' / ')}
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/90">{film.hook}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={notThisOne}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
            >
              <Shuffle className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('pick.notThisOne')}
            </button>
            <button
              type="button"
              onClick={onSave}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                saved
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
              }`}
            >
              {saved ? (
                <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              )}
              {saved ? t('pick.saved') : t('pick.save')}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

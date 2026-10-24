import { useSearchParams } from 'react-router-dom';
import ArchiveCard from '@/components/ArchiveCard';
import CatalogStatus from '@/components/CatalogStatus';
import {
  GENRE_PILLS,
  MOODS,
  RETAILERS,
  SUBGENRES,
  movieHasGenre,
  movies,
  normalizeGenre,
} from '@/data/catalog';
import { useI18n } from '@/i18n/context';

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        active
          ? 'bg-white text-black'
          : 'border border-white/30 bg-transparent text-white/80 hover:border-white hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function Archive() {
  const { t, mood: tMood, genre: tGenre, subgenre: tSub } = useI18n();
  const [params, setParams] = useSearchParams();
  const retailerParam = params.get('retailer') || '';
  const selectedRetailers = retailerParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const mood = params.get('mood') || '';
  const genre = params.get('genre') || '';
  const list = params.get('list') || '';
  const subgenre = params.get('subgenre') || '';
  const q = (params.get('q') || '').trim().toLowerCase();

  const setFilters = (updates) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const setFilter = (key, value) => setFilters({ [key]: value });

  const matchesQuery = (movie) => {
    if (!q) return true;
    const hay = `${movie.title} ${movie.hook} ${movie.genres.join(' ')} ${(movie.subgenres || []).join(' ')} ${movie.year} ${movie.genres.map((g) => tGenre(normalizeGenre(g))).join(' ')} ${(movie.subgenres || []).map(tSub).join(' ')} ${movie.moods.map(tMood).join(' ')}`.toLowerCase();
    return hay.includes(q);
  };

  const matchesRetailer = (movie) => {
    if (!selectedRetailers.length) return true;
    return selectedRetailers.some((id) => movie.retailers.includes(id));
  };

  const isMainGenre = GENRE_PILLS.includes(genre);
  const genreTop10 = isMainGenre && list === 'top10';

  const rankFor = (movie) => {
    if (list === 'new') return movie.newArrivalRank ?? null;
    if (list === 'top10') {
      if (genreTop10) return movie.top10ByGenre?.[genre] ?? null;
      return movie.top10 ?? null;
    }
    return null;
  };

  const filtered = movies
    .filter((movie) => {
      if (!matchesRetailer(movie)) return false;
      if (mood && !movie.moods.includes(mood)) return false;
      if (genre && !movieHasGenre(movie, genre)) return false;
      if (subgenre && !(movie.subgenres || []).includes(subgenre)) return false;
      if (!matchesQuery(movie)) return false;
      if (list === 'top10') {
        if (genreTop10) {
          const n = movie.top10ByGenre?.[genre];
          if (!n) return false;
        } else if (!movie.top10) {
          return false;
        }
      }
      if (list === 'new' && !movie.newArrivalRank) return false;
      return true;
    })
    .sort((a, b) => {
      if (list === 'top10' || list === 'new') {
        return (rankFor(a) ?? 99) - (rankFor(b) ?? 99);
      }
      return 0;
    });

  const pool = movies.filter(
    (movie) => matchesRetailer(movie) && (!mood || movie.moods.includes(mood)) && matchesQuery(movie)
  );
  const present = new Set();
  for (const movie of pool) {
    for (const g of movie.genres) present.add(normalizeGenre(g));
  }
  const preferred = GENRE_PILLS.filter((g) => present.has(g));
  const rest = [...present].filter((g) => !GENRE_PILLS.includes(g)).sort();
  const genreOptions = [...preferred, ...rest];
  const subgenreOptions = SUBGENRES[genre] || [];

  const toggleRetailer = (id) => {
    if (selectedRetailers.length === 1 && selectedRetailers[0] === id) {
      setFilter('retailer', '');
      return;
    }
    setFilter('retailer', id);
  };

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-8 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-6 border-b border-white/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4">
          <h1 className="font-poster max-w-4xl text-5xl leading-[0.88] tracking-wide text-white sm:text-7xl lg:text-[5.5rem]">
            {t('archive.title')}
          </h1>
          <CatalogStatus showRefresh={false} />
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
          <Pill active={!mood} onClick={() => setFilter('mood', '')}>
            {t('archive.all')}
          </Pill>
          {MOODS.map((label) => (
            <Pill
              key={label}
              active={mood === label}
              onClick={() => setFilter('mood', mood === label ? '' : label)}
            >
              {tMood(label)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{t('archive.lists')}</span>
        <Pill active={!list} onClick={() => setFilter('list', '')}>
          {t('archive.all')}
        </Pill>
        <Pill active={list === 'top10'} onClick={() => setFilter('list', list === 'top10' ? '' : 'top10')}>
          {t('archive.top10')}
        </Pill>
        <Pill active={list === 'new'} onClick={() => setFilter('list', list === 'new' ? '' : 'new')}>
          {t('archive.new')}
        </Pill>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{t('archive.genre')}</span>
        <Pill
          active={!genre}
          onClick={() => setFilters({ genre: '', subgenre: '' })}
        >
          {t('archive.all')}
        </Pill>
        {genreOptions.map((label) => (
          <Pill
            key={label}
            active={genre === label}
            onClick={() =>
              setFilters({
                genre: genre === label ? '' : label,
                subgenre: '',
              })
            }
          >
            {tGenre(label)}
          </Pill>
        ))}
      </div>

      {subgenreOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{t('archive.subgenre')}</span>
          <Pill active={!subgenre} onClick={() => setFilter('subgenre', '')}>
            {t('archive.all')}
          </Pill>
          {subgenreOptions.map((label) => (
            <Pill
              key={label}
              active={subgenre === label}
              onClick={() => setFilter('subgenre', subgenre === label ? '' : label)}
            >
              {tSub(label)}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{t('archive.retailer')}</span>
        <Pill active={selectedRetailers.length === 0} onClick={() => setFilter('retailer', '')}>
          {t('archive.all')}
        </Pill>
        {RETAILERS.map((retailer) => (
          <Pill
            key={retailer.id}
            active={selectedRetailers.includes(retailer.id)}
            onClick={() => toggleRetailer(retailer.id)}
          >
            {retailer.short}
          </Pill>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-5">
        {filtered.map((movie) => (
          <ArchiveCard
            key={movie.id}
            movie={movie}
            preferredRetailer={selectedRetailers[0]}
            onRetailerClick={toggleRetailer}
            list={list}
            listRank={rankFor(movie)}
            activeSubgenre={subgenre}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-sm text-white/50">{t('archive.empty')}</p>
      )}
    </div>
  );
}

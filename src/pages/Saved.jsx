import { Link } from 'react-router-dom';
import { Bookmark, Clapperboard } from 'lucide-react';
import Poster from '@/components/Poster';
import { getMovieById } from '@/data/catalog';
import { useWatchlist } from '@/hooks/useWatchlist';

export default function Saved() {
  const { ids, remove } = useWatchlist();
  const films = ids.map(getMovieById).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs uppercase tracking-[0.28em] text-primary">Watchlist</p>
      <h1 className="font-display mt-2 text-4xl italic text-foreground sm:text-5xl">Saved for later</h1>

      {films.length === 0 ? (
        <div className="mt-16 max-w-md">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
            <Clapperboard className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-lg text-foreground">Nothing saved yet. Go get inspired.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Find a film
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {films.map((movie) => (
            <li key={movie.id}>
              <article className="flex gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="w-20 shrink-0 sm:w-24">
                  <Poster movie={movie} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="font-display text-xl leading-tight text-foreground">{movie.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {movie.year} · {movie.runtime} min · {movie.genres.join(', ')}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{movie.hook}</p>
                  <button
                    type="button"
                    onClick={() => remove(movie.id)}
                    className="mt-auto inline-flex items-center gap-1.5 self-start pt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <Bookmark className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

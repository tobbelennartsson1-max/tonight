import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import CatalogStatus from '@/components/CatalogStatus';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/context';

export default function Header() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isLanding = location.pathname === '/';
  const isArchive = location.pathname === '/archive';
  const showSearch = isLanding || isArchive;
  const [noteOpen, setNoteOpen] = useState(false);
  const urlQ = isArchive ? params.get('q') || '' : '';
  const [q, setQ] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  const noteRef = useRef(null);

  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  useEffect(() => {
    if (!noteOpen) return undefined;
    const onDoc = (event) => {
      if (noteRef.current && !noteRef.current.contains(event.target)) {
        setNoteOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setNoteOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [noteOpen]);

  const onSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(isArchive ? params : undefined);
    const term = q.trim();
    if (term) next.set('q', term);
    else next.delete('q');
    const qs = next.toString();
    navigate(qs ? `/archive?${qs}` : '/archive');
  };

  return (
    <header
      className={
        isLanding
          ? 'absolute inset-x-0 top-0 z-50 bg-gradient-to-b from-black/55 to-transparent'
          : 'sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-md'
      }
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <Link
          to="/"
          className="shrink-0 font-poster text-[1.45rem] leading-none tracking-[0.14em] text-white sm:text-[1.7rem] sm:tracking-[0.18em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          TONIGHT
        </Link>
        <LanguageSwitcher />
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <nav className={`${isArchive ? 'hidden sm:flex' : 'flex'} min-w-0 items-center gap-2.5 overflow-x-auto whitespace-nowrap py-1 text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden font-semibold uppercase tracking-[0.18em] text-white/75 sm:gap-3 sm:tracking-[0.22em]`}>
            <NavLink
              to="/today"
              className={({ isActive }) =>
                `${showSearch ? 'hidden sm:inline' : ''} whitespace-nowrap transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  isActive ? 'text-primary' : 'text-primary/90'
                }`
              }
            >
              {t('nav.today')}
            </NavLink>
            <NavLink
              to="/together"
              className={({ isActive }) =>
                `transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  isActive ? 'text-white' : ''
                }`
              }
            >
              {t('nav.together')}
            </NavLink>
            <NavLink
              to="/archive"
              className={({ isActive }) =>
                `transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  isActive ? 'text-white' : ''
                }`
              }
            >
              {t('nav.archive')}
            </NavLink>
            <NavLink
              to="/pick"
              className={({ isActive }) =>
                `transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                  isActive ? 'text-white' : ''
                }`
              }
            >
              {t('nav.pick')}
            </NavLink>
          </nav>

          {showSearch && (
            <form onSubmit={onSearch} className={`relative min-w-0 items-center ${isLanding ? 'hidden sm:flex' : 'flex'}`}>
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/45" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={t('search.placeholder')}
                className="h-8 w-36 rounded-full border border-white/80 bg-white/10 pl-8 pr-3 text-xs text-white placeholder:text-white/70 outline-none transition-colors focus:border-white focus:bg-white/15 sm:w-52 lg:w-60"
                aria-label={t('search.placeholder')}
              />
            </form>
          )}

          <div className="relative hidden sm:block" ref={noteRef}>
            <button
              type="button"
              aria-label={t('about.label')}
              aria-expanded={noteOpen}
              onClick={() => setNoteOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {noteOpen && (
              <p
                role="note"
                className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-white/15 bg-black/95 p-3 text-[11px] leading-relaxed text-white/70 shadow-xl"
              >
                {t('about.note')}
              </p>
            )}
          </div>
        </div>
      </div>
      {!isLanding && (
        <div className="flex h-8 items-center justify-between gap-3 border-t border-white/10 px-4 sm:px-6">
          <CatalogStatus compact showRefresh />
        </div>
      )}
    </header>
  );
}

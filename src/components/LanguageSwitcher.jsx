import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function LanguageSwitcher() {
  const { lang, setLang, languages, current, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('lang.label')}: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 items-center gap-1 rounded-full border border-white/30 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85 transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Globe className="h-3 w-3" aria-hidden="true" />
        <span>{current.short}</span>
        <ChevronDown className={`hidden h-3 w-3 transition-transform sm:block ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('lang.label')}
          className="absolute left-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-white/15 bg-black/95 py-1 shadow-xl backdrop-blur-md"
        >
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <li key={l.code} role="option" aria-selected={active} lang={l.htmlLang}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none ${
                    active ? 'text-primary' : 'text-white/85'
                  }`}
                >
                  <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {l.code === 'pirate' ? '☠' : l.short}
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

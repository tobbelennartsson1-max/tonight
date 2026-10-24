import { useCallback, useEffect, useMemo, useState } from 'react';
import { SUBGENRES } from '@/data/movies.js';
import { I18nContext } from './context';
import { DEFAULT_LANG, LANGUAGES, STORAGE_KEY, getLanguage } from './languages';

const SUBGENRE_ORDER = Object.values(SUBGENRES).flat();
const EN = getLanguage('en').dict;
const CJK_FONTS = {
  zh: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap',
  ja: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
};

function readStored() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function fill(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

function ensureFont(code) {
  const href = CJK_FONTS[code];
  if (!href || document.querySelector(`link[data-cjk="${code}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.cjk = code;
  document.head.appendChild(link);
}

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStored);
  const meta = getLanguage(lang);

  useEffect(() => {
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dataset.lang = meta.code;
    ensureFont(meta.code);
  }, [meta]);

  const setLang = useCallback((code) => {
    const next = getLanguage(code).code;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — keep in memory */
    }
  }, []);

  const value = useMemo(() => {
    const d = meta.dict;
    const t = (key, vars) => fill(d.ui[key] ?? EN.ui[key] ?? key, vars);
    const subMap = d.subgenres
      ? Object.fromEntries(SUBGENRE_ORDER.map((s, i) => [s, d.subgenres[i]]))
      : {};
    const duration = (prefix, h, m) => {
      if (h && m) return t(`${prefix}.hm`, { h, m, mm: String(m).padStart(2, '0') });
      if (h) return t(`${prefix}.h`, { h });
      return t(`${prefix}.m`, { m });
    };
    return {
      lang,
      setLang,
      locale: meta.locale,
      languages: LANGUAGES,
      current: meta,
      t,
      mood: (m) => d.moods[m] || m,
      genre: (g) => d.genres[g] || g,
      subgenre: (s) => subMap[s] || s,
      status: (s) => d.statuses[s] || s,
      runtime: (mins) => {
        if (!mins) return null;
        return duration('runtime', Math.floor(mins / 60), mins % 60);
      },
      countdown: (ms) => {
        const total = Math.ceil(ms / 60000);
        return duration('time', Math.floor(total / 60), total % 60);
      },
    };
  }, [lang, meta, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

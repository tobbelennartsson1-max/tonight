import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'tonight-watchlist';

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [ids, setIds] = useState(readIds);

  useEffect(() => {
    const sync = () => setIds(readIds());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const persist = useCallback((next) => {
    setIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const save = useCallback(
    (id) => {
      persist(ids.includes(id) ? ids : [...ids, id]);
    },
    [ids, persist]
  );

  const remove = useCallback(
    (id) => {
      persist(ids.filter((x) => x !== id));
    },
    [ids, persist]
  );

  const toggle = useCallback(
    (id) => {
      persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    },
    [ids, persist]
  );

  const isSaved = useCallback((id) => ids.includes(id), [ids]);

  return { ids, save, remove, toggle, isSaved };
}

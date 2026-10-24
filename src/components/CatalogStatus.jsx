import { useState } from 'react';
import { catalogMeta } from '@/data/catalog';
import { useI18n } from '@/i18n/context';

function formatUpdated(iso, locale) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Stockholm',
  });
}

export default function CatalogStatus({ className = '', showRefresh = true, compact = false }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const date = formatUpdated(catalogMeta.updatedAt, locale);
  const sources = (catalogMeta.sources || ['IMDb', 'JustWatch']).join(' + ');
  const line = date ? t('status.updated', { date, sources }) : t('status.snapshot');

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 125000);
      const res = await fetch('/__refresh-catalog', { method: 'POST', signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) window.location.reload();
    } catch {
      /* endpoint missing or network — stay quiet */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-x-3 gap-y-1 ${compact ? 'min-w-0 flex-nowrap text-[10px]' : 'flex-wrap text-[11px]'} ${className}`}
    >
      <span className={`uppercase tracking-[0.16em] text-white/45 ${compact ? 'min-w-0 truncate' : ''}`}>{line}</span>
      {showRefresh && import.meta.env.DEV && (
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="shrink-0 uppercase tracking-[0.16em] text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white disabled:cursor-wait disabled:text-white/40"
        >
          {busy ? t('status.refreshing') : t('status.refresh')}
        </button>
      )}
    </div>
  );
}

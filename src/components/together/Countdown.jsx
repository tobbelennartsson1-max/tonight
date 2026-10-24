import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getRetailer } from '@/data/catalog';
import { useI18n } from '@/i18n/context';
import { serviceUrl } from '@/lib/services';
import Poster from '@/components/Poster';

const SHOW_AFTER_MS = 7000;

export default function Countdown({ countdown, serverNow }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    if (!countdown) return undefined;
    const id = setInterval(() => setNow(serverNow()), 50);
    return () => clearInterval(id);
  }, [countdown, serverNow]);

  if (!countdown) return null;
  const left = countdown.startAt - now;
  if (left < -SHOW_AFTER_MS) return null;

  const service = getRetailer(countdown.service);
  const n = Math.ceil(left / 1000);
  const phase = left > 3000 ? 'ready' : left > 0 ? 'count' : 'go';
  const meta = countdown.meta || {};

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-6 backdrop-blur-md" role="alert" aria-live="assertive">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
          {t('together.cd.startedBy', { name: countdown.name || '—' })}
        </p>
        <div className="mt-5 flex items-center gap-4">
          <div className="w-14 shrink-0 sm:w-16">
            <Poster movie={{ id: countdown.movieId, ...meta }} className="!rounded-md" />
          </div>
          <p className="font-display text-left text-2xl leading-tight text-white sm:text-3xl">{meta.title}</p>
        </div>

        <div className="mt-6 flex h-[11rem] items-center justify-center sm:h-[13rem]">
          {phase === 'ready' && (
            <p className="font-poster text-6xl tracking-[0.12em] text-white/80 sm:text-7xl">{t('together.cd.ready')}</p>
          )}
          {phase === 'count' && (
            <p key={n} className="cd-pop font-poster text-[10rem] leading-none text-primary sm:text-[13rem]">
              {n}
            </p>
          )}
          {phase === 'go' && (
            <p className="cd-pop font-poster text-6xl leading-none tracking-[0.08em] text-primary sm:text-8xl">
              {t('together.cd.press')}
            </p>
          )}
        </div>

        {service && (
          <a
            href={serviceUrl(service.id, meta.title)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-primary"
          >
            {t('together.cd.open', { service: service.label })}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

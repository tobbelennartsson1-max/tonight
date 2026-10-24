import { Link } from 'react-router-dom';
import { ArrowRight, RadioTower } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function ComingSoon() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7" role="status">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
        <RadioTower className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>
      <h2 className="font-poster text-3xl leading-none tracking-[0.1em] text-white">{t('together.soon.title')}</h2>
      <p className="text-sm leading-relaxed text-white/65">{t('together.soon.body')}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/today"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          {t('together.soon.cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/pick"
          className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 transition-colors hover:border-white hover:text-white"
        >
          {t('nav.pick')}
        </Link>
      </div>
    </div>
  );
}

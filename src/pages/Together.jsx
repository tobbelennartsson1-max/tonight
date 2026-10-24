import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { TOGETHER_LIVE, readProfile, saveProfile } from '@/lib/together';
import ComingSoon from '@/components/together/ComingSoon';
import { NameField, ServicePicker } from '@/components/together/parts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  let c = '';
  const buf = crypto.getRandomValues(new Uint32Array(4));
  for (const n of buf) c += ALPHABET[n % ALPHABET.length];
  return c;
}

export default function Together() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(readProfile);
  const [code, setCode] = useState('');
  const ready = profile.name.trim().length > 0;

  const go = (roomCode, create) => {
    if (!ready) return;
    saveProfile({ name: profile.name.trim(), services: profile.services });
    navigate(`/together/${roomCode}`, { state: { create } });
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 cinematic-wash" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-primary">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t('together.eyebrow')}
          </p>
          <h1 className="font-display mt-4 text-4xl leading-[1.05] text-white sm:text-6xl">{t('together.title')}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">{t('together.sub')}</p>
          <p className="mt-4 max-w-xl text-sm text-white/45">{t('together.drm')}</p>
        </div>

        {!TOGETHER_LIVE ? (
          <ComingSoon />
        ) : (
        <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <NameField value={profile.name} onChange={(name) => setProfile((p) => ({ ...p, name }))} autoFocus />
          <ServicePicker value={profile.services} onChange={(services) => setProfile((p) => ({ ...p, services }))} />
          <button
            type="button"
            disabled={!ready}
            onClick={() => go(newCode(), true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {t('together.create')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            {t('together.or')}
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const c = code.trim().toUpperCase();
              if (c.length >= 4) go(c, false);
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder={t('together.codePh')}
              aria-label={t('together.codePh')}
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-white/[0.04] px-3 font-cond text-lg uppercase tracking-[0.3em] text-white placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-white/35 outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!ready || code.trim().length < 4}
              className="rounded-lg border border-white/30 px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-white hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
            >
              {t('together.join')}
            </button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

import { Check } from 'lucide-react';
import { RETAILERS, getRetailer } from '@/data/catalog';
import { useI18n } from '@/i18n/context';

export function Avatar({ member, size = 'md', ring = false, title }) {
  const sz = size === 'sm' ? 'h-6 w-6 text-[11px]' : size === 'lg' ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm';
  const initial = (member?.name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      title={title || member?.name}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-black ${sz} ${ring ? 'ring-2 ring-black' : ''}`}
      style={{ background: member?.color || '#E8B04A' }}
    >
      {initial}
      {member?.online != null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black ${member.online ? 'bg-emerald-400' : 'bg-neutral-600'}`}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

export function ServiceBadge({ id, dim = false }) {
  const r = getRetailer(id);
  if (!r) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
        dim ? 'border border-white/25 text-white/60' : 'bg-white text-black'
      }`}
    >
      {r.short}
    </span>
  );
}

export function ServicePicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">{t('together.yourServices')}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {RETAILERS.map((r) => {
          const on = value.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== r.id) : [...value, r.id])}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                on ? 'bg-white text-black' : 'border border-white/30 text-white/80 hover:border-white hover:text-white'
              }`}
            >
              {on && <Check className="h-3 w-3" aria-hidden="true" />}
              {r.short}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function NameField({ value, onChange, autoFocus }) {
  const { t } = useI18n();
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">{t('together.yourName')}</span>
      <input
        value={value}
        autoFocus={autoFocus}
        maxLength={32}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('together.namePh')}
        className="mt-2 h-11 w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 text-base text-white placeholder:text-white/35 outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

export function SectionLabel({ children, right }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-poster text-2xl leading-none tracking-[0.12em] text-white sm:text-[1.7rem]">{children}</h2>
      {right}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { EFFECT_KINDS, REACTIONS } from '@/lib/effects';
import { Avatar } from './parts';

export function ReactionBar({ send, compact = false }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'border-t border-white/10 pt-3'}`}>
      <div className="flex flex-wrap gap-1">
        {REACTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => send('reaction', { emoji: e })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-white/10 active:scale-95"
            aria-label={e}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{t('together.effects')}</span>
        {EFFECT_KINDS.map(({ kind, emoji }) => (
          <button
            key={kind}
            type="button"
            onClick={() => send('effect', { kind })}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-primary hover:text-white"
          >
            <span className="text-sm normal-case">{emoji}</span>
            {t(`together.fx.${kind}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Chat({ room, memberId, send, className = '' }) {
  const { t, locale } = useI18n();
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const byId = Object.fromEntries(room.members.map((m) => [m.id, m]));

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.chat.length]);

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    send('chat', { text: v });
    setText('');
  };

  const time = (at) => new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <section className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.03] ${className}`} aria-label={t('together.chat')}>
      <h2 className="border-b border-white/10 px-4 py-3 font-poster text-xl tracking-[0.14em] text-white">{t('together.chat')}</h2>
      <ol ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {room.chat.length === 0 && <li className="m-auto text-sm text-white/45">{t('together.chatEmpty')}</li>}
        {room.chat.map((m) => {
          const mine = m.by === memberId;
          const member = byId[m.by] || { name: m.name, color: m.color };
          return (
            <li key={m.id} className={`flex items-start gap-2 ${mine ? 'flex-row-reverse text-right' : ''}`}>
              <Avatar member={{ name: member.name, color: member.color }} size="sm" />
              <div className={`min-w-0 max-w-[80%] ${mine ? 'items-end' : ''}`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                  {mine ? t('together.you') : member.name} · {time(m.at)}
                </p>
                <p
                  className={`mt-0.5 inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-left text-sm ${
                    mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-white/10 text-white'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-3 border-t border-white/10 p-3">
        <ReactionBar send={send} compact />
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            placeholder={t('together.chatPh')}
            aria-label={t('together.chatPh')}
            className="h-10 min-w-0 flex-1 rounded-full border border-white/20 bg-black/40 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/60"
          />
          <button
            type="submit"
            aria-label={t('together.send')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-primary"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}

// Generated from src/lib/effects.js by scripts/build-extension.mjs — do not edit.
var TonightFx = (() => {
// Floating reactions + room effects. Plain DOM + Web Animations, no React,
// so the browser extension overlay can reuse this exact file.

const CONFETTI_COLORS = ['#E8B04A', '#F2D16B', '#E8735A', '#7FB3E8', '#9AD18B', '#C79BE8', '#ffffff'];

function el(tag, style, text) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text) node.textContent = text;
  return node;
}

const rand = (a, b) => a + Math.random() * (b - a);

function createFx(layer) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const W = () => layer.clientWidth || window.innerWidth;
  const H = () => layer.clientHeight || window.innerHeight;

  function spawn(node, keyframes, opts) {
    layer.appendChild(node);
    const anim = node.animate(keyframes, { easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards', ...opts });
    anim.onfinish = () => node.remove();
    return anim;
  }

  function reaction(emoji, label) {
    const x = rand(0.08, 0.92) * W();
    const wrap = el('div', {
      position: 'absolute',
      left: `${x}px`,
      bottom: '-60px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
      pointerEvents: 'none',
      willChange: 'transform, opacity',
    });
    wrap.appendChild(el('span', { fontSize: `${rand(34, 48)}px`, lineHeight: '1', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.45))' }, emoji));
    if (label) {
      wrap.appendChild(
        el('span', {
          font: '600 10px/1.2 Outfit, system-ui, sans-serif',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: '#fff',
          background: 'rgba(0,0,0,.55)',
          padding: '2px 6px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
        }, label),
      );
    }
    const drift = rand(-80, 80);
    const rise = H() * rand(0.55, 0.85);
    spawn(
      wrap,
      reduced
        ? [{ opacity: 0, transform: `translateY(-${rise * 0.4}px)` }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
        : [
            { transform: 'translate(0,0) scale(.6)', opacity: 0 },
            { transform: `translate(${drift * 0.3}px,-${rise * 0.25}px) scale(1.1)`, opacity: 1, offset: 0.15 },
            { transform: `translate(${drift}px,-${rise}px) scale(1)`, opacity: 0 },
          ],
      { duration: reduced ? 1800 : rand(2600, 3400) },
    );
  }

  function confetti() {
    const n = reduced ? 30 : 140;
    for (let i = 0; i < n; i += 1) {
      const size = rand(6, 11);
      const piece = el('div', {
        position: 'absolute',
        left: `${rand(0, W())}px`,
        top: '-20px',
        width: `${size}px`,
        height: `${size * rand(0.4, 1.4)}px`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        borderRadius: Math.random() > 0.7 ? '50%' : '2px',
        pointerEvents: 'none',
      });
      const fall = H() + 60;
      spawn(
        piece,
        [
          { transform: `translate(0,0) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${rand(-120, 120)}px,${fall}px) rotate(${rand(360, 1080)}deg)`, opacity: 0.9 },
        ],
        { duration: rand(1800, 3200), delay: rand(0, 500), easing: 'cubic-bezier(.25,.6,.45,1)' },
      );
    }
  }

  function rising(chars, count) {
    for (let i = 0; i < count; i += 1) {
      const node = el('div', {
        position: 'absolute',
        left: `${rand(0.05, 0.95) * W()}px`,
        bottom: '-50px',
        fontSize: `${rand(24, 52)}px`,
        lineHeight: '1',
        pointerEvents: 'none',
      }, chars[i % chars.length]);
      const rise = H() * rand(0.6, 1.05);
      spawn(
        node,
        [
          { transform: 'translate(0,0) scale(.5)', opacity: 0 },
          { transform: `translate(${rand(-30, 30)}px,-${rise * 0.3}px) scale(1)`, opacity: 1, offset: 0.2 },
          { transform: `translate(${rand(-90, 90)}px,-${rise}px) scale(1.1)`, opacity: 0 },
        ],
        { duration: rand(2400, 3600), delay: rand(0, 900) },
      );
    }
  }

  function popcorn() {
    const cx = W() / 2;
    const cy = H() * 0.62;
    const n = reduced ? 12 : 46;
    for (let i = 0; i < n; i += 1) {
      const node = el('div', {
        position: 'absolute',
        left: `${cx}px`,
        top: `${cy}px`,
        fontSize: `${rand(22, 40)}px`,
        lineHeight: '1',
        pointerEvents: 'none',
      }, i % 9 === 0 ? '🍿' : '⚪');
      if (i % 9 !== 0) {
        node.textContent = '';
        Object.assign(node.style, {
          width: `${rand(12, 22)}px`,
          height: `${rand(10, 18)}px`,
          background: 'radial-gradient(circle at 35% 35%, #fffaf0, #f3dfa8 60%, #d9a84a)',
          borderRadius: '45% 55% 50% 50%',
          boxShadow: '0 2px 6px rgba(0,0,0,.35)',
        });
      }
      const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const dist = rand(160, Math.min(W(), H()) * 0.65);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      spawn(
        node,
        [
          { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy}px)) scale(1) rotate(${rand(-90, 90)}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy * 0.2 + 260}px)) scale(.9) rotate(${rand(-200, 200)}deg)`, opacity: 0 },
        ],
        { duration: rand(1400, 2200), delay: rand(0, 250), easing: 'cubic-bezier(.15,.8,.4,1)' },
      );
    }
    const bucket = el('div', { position: 'absolute', left: `${cx}px`, top: `${cy}px`, fontSize: '84px', lineHeight: '1', pointerEvents: 'none' }, '🍿');
    spawn(
      bucket,
      [
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%,-50%) scale(.8)', opacity: 0 },
      ],
      { duration: 1800 },
    );
  }

  function effect(kind) {
    if (kind === 'confetti') confetti();
    else if (kind === 'hearts') rising(['❤️', '💖', '💘', '💕'], reduced ? 10 : 34);
    else if (kind === 'popcorn') popcorn();
  }

  return { reaction, effect };
}

const REACTIONS = ['😂', '😱', '😍', '🔥', '👏', '😭', '🤯', '👀'];
const EFFECT_KINDS = [
  { kind: 'confetti', emoji: '🎉' },
  { kind: 'hearts', emoji: '💖' },
  { kind: 'popcorn', emoji: '🍿' },
];

  return { createFx, REACTIONS, EFFECT_KINDS };
})();

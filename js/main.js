// Дата начала отношений — поменять на настоящую
const START = new Date('2026-05-10T00:00:00');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const heartSvg = '<svg viewBox="0 0 24 24"><use href="#heart"/></svg>';

// Счётчик
const $ = (id) => document.getElementById(id);
function tick() {
  let s = Math.max(0, Math.floor((Date.now() - START) / 1000));
  $('c-days').textContent = Math.floor(s / 86400);
  $('c-hours').textContent = Math.floor(s / 3600) % 24;
  $('c-min').textContent = Math.floor(s / 60) % 60;
  $('c-sec').textContent = s % 60;
}
tick();
setInterval(tick, 1000);

// Появление при скролле
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Карточки
document.querySelectorAll('.card').forEach((card) =>
  card.addEventListener('click', () => card.classList.toggle('is-flipped'))
);

// Письмо с эффектом печатной машинки
const envelope = $('envelope');
envelope.addEventListener('click', () => {
  const letter = $('letter');
  const p = $('letterText');
  const text = p.dataset.text;
  envelope.hidden = true;
  letter.hidden = false;
  if (reduceMotion) { p.textContent = text; return; }
  let i = 0;
  const t = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(t);
  }, 45);
}, { once: true });

// Падающие сердечки
function spawnPetal() {
  const el = document.createElement('span');
  const size = 10 + Math.random() * 16;
  el.className = 'petal';
  el.innerHTML = heartSvg;
  el.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;height:${size}px;animation-duration:${8 + Math.random() * 6}s`;
  document.querySelector('.petals').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
if (!reduceMotion) setInterval(spawnPetal, 900);

// Салют из сердечек на финальном сердце
$('bigHeart').addEventListener('click', (ev) => {
  const r = ev.currentTarget.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 24; i++) {
    const el = document.createElement('span');
    const a = (Math.PI * 2 * i) / 24, d = 80 + Math.random() * 120, size = 14 + Math.random() * 14;
    el.className = 'burst';
    el.innerHTML = heartSvg;
    el.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
});

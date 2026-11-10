// Дата начала отношений — поменять на настоящую
const START = new Date('2026-06-02T22:30:00');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const heartSvg = '<svg viewBox="0 0 24 24"><use href="#heart"/></svg>';

// Настоящие полгода: START + 6 месяцев
const HALF_YEAR = new Date(START);
HALF_YEAR.setMonth(HALF_YEAR.getMonth() + 6);

// Пока не наступили полгода — настоящий текст подменяем случайными буквами,
// романтическими словами из love-words.js, чтобы его нельзя было разглядеть
const randomWord = () => LOVE_WORDS[Math.floor(Math.random() * LOVE_WORDS.length)];
const secrets = [...document.querySelectorAll('[data-secret]')].map((el) => {
  const real = el.textContent;
  if (Date.now() < HALF_YEAR) {
    // набираем слова примерно до длины настоящего текста
    let fake = randomWord();
    while (fake.length < real.length - 3) fake += ' ' + randomWord();
    el.textContent = fake;
  }
  return { el, real };
});
const revealSecrets = () => secrets.forEach(({ el, real }) => (el.textContent = real));

// Счётчик
const $ = (id) => document.getElementById(id);
function plural(n, forms) {
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2];
}
let forceUnlock = false;
let firstCheck = true;
function celebrate() {
  if (reduceMotion) return;
  const colors = ['#F6C177', '#E05A7A', '#B05CC9', '#FF8FAB', '#FFE8B0'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('span');
    const size = 10 + Math.random() * 18;
    el.className = 'confetti';
    el.innerHTML = heartSvg;
    el.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;height:${size}px;` +
      `color:${colors[i % colors.length]};animation-duration:${2.5 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
function updateLock() {
  const card = $('realHalfYear');
  if (!card || !card.classList.contains('locked')) return;
  const left = HALF_YEAR - Date.now();
  const wasFirst = firstCheck;
  firstCheck = false;
  if (left <= 0 || forceUnlock) {
    if (!wasFirst) celebrate(); // праздник — только если открылось на глазах
    revealSecrets();
    $('heroHalf').classList.remove('locked');
    $('photoUs').classList.remove('locked');
    card.classList.add('unlocking');
    card.classList.remove('locked');
    return;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor(left / 3600000) % 24;
  card.querySelector('.lock-note').textContent = d > 0
    ? `🔒 Откроется через ${d} ${plural(d, ['день', 'дня', 'дней'])}`
    : `🔒 Откроется через ${h} ${plural(h, ['час', 'часа', 'часов'])}… совсем скоро`;
}
function tick() {
  updateLock();
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

// Письмо: печать слетает → клапан открывается → листок вытаскивается →
// конверт уходит → письмо разворачивается → текст печатается
const envelope = $('envelope');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function typeLetter() {
  const p = $('letterText');
  const text = p.dataset.text;
  if (reduceMotion) { p.textContent = text; return; }
  let i = 0;
  const t = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(t);
  }, 45);
}
envelope.addEventListener('click', async () => {
  const stage = $('envStage');
  const letter = $('letter');
  if (!reduceMotion) {
    stage.classList.add('is-open-stage');
    envelope.classList.add('is-open');    // печать + клапан
    await wait(800);
    envelope.classList.add('is-pulled');  // листок выезжает
    await wait(1200);
    stage.classList.add('is-done');       // конверт уходит вниз
    await wait(500);
  }
  stage.hidden = true;
  letter.hidden = false;
  if (!reduceMotion) {
    letter.classList.add('is-unfolding');
    await wait(1100);
  }
  typeLetter();
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

// 2 июня: по нажатию — спираль разноцветных сердец из большой точки
const special = document.querySelector('.timeline li.special');
if (special) special.addEventListener('click', () => {
  if (reduceMotion) return;
  const r = special.getBoundingClientRect();
  const cx = r.left - 23, cy = r.top + 2 + 31; // центр большой точки (+2px рамка сверху)
  const colors = ['#E05A7A', '#B05CC9', '#FF8FAB', '#F4A261', '#C9184A'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('span');
    const size = 12 + Math.random() * 12;
    el.className = 'spiral';
    el.innerHTML = heartSvg;
    el.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;` +
      `color:${colors[i % colors.length]};--a:${i * 20}deg;--d:${70 + Math.random() * 90}px;animation-delay:${i * 25}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
});

// Дебаг: клик по слову «начало» в финале → пароль → открыть всё скрытое
const DEBUG_PASSWORD = '0206'; // поменять на свой
$('debugUnlock').addEventListener('click', () => {
  const pass = prompt('Пароль:');
  if (pass === null) return;
  if (pass === DEBUG_PASSWORD) {
    forceUnlock = true;
    updateLock();
  } else {
    alert('Неверный пароль');
  }
});

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

// Страница тура одним HTML-файлом (решение пользователя 21.10.2026: «скачивать для своего домена»): фото внутри файла,
// шрифты — Google Fonts, переключатель языков, форма заявки. Без сервера заявка уходит организатору в WhatsApp или на
// почту готовым текстом, с пометкой, откуда пришёл человек (utm_source из ссылки поста). Этот же HTML показывается
// в кабинете как предпросмотр «компьютер / телефон» — что видно, то и скачивается.
import type { Lang } from '@/i18n';

import type { OProgram, Org } from './org';
import { pageCtx, type OPage, type PageCtx, type PhotoRef } from './sale';
import type { Tenant } from './tenant';
import { isLight } from './banner-color';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;
const bg = (ref: PhotoRef) => `class="bg ph-${ref.id}" style="background-position:${pct(ref.fx)} ${pct(ref.fy)};transform:scale(${Math.max(1, ref.zoom || 1)});transform-origin:${pct(ref.fx)} ${pct(ref.fy)}"`;
/** Шрифт заголовков (Sofia Sans) без языка рисует болгарские «в», «д», «т»; казахского в нём нет — берём русские формы. */
const kk = (c: PageCtx) => (c.lang === 'kk' ? ' lang="ru"' : '');
const LANG_SELF: Record<Lang, string> = { ru: 'Русский', en: 'English', zh: '中文', kk: 'Қазақша', ar: 'العربية', hi: 'हिन्दी' };

/** show — какой язык открыт сразу (в кабинете — выбранный в предпросмотре; в файле — основной). */
export type TourHtmlInput = { pg: OPage; program: OProgram; org: Org; t: Tenant; photos: Record<string, string>; year?: number; show?: Lang };

function section(c: PageCtx, key: string, x: TourHtmlInput): string {
  const { L, text } = c;
  const { pg, t, org } = x;
  const cover = pg.photos.find((p) => p.id === pg.cover) || pg.photos[0];
  const extra = pg.photos.filter((p) => p !== cover && x.photos[p.id]);
  const cta = esc(text.cta.trim() || L.ctaDefault);
  const arrow = c.lang === 'ar' ? '←' : '→';
  switch (key) {
    case 'cover':
      return `<section class="hero${cover && x.photos[cover.id] ? '' : ' nophoto'}">
  ${cover && x.photos[cover.id] ? `<div ${bg(cover)}></div><div class="dim" style="opacity:${Math.min(0.7, cover.dim || 0)}"></div>` : ''}<div class="shade"></div>
  <div class="wrap hero-in">
    ${text.badge.trim() ? `<span class="badge">${esc(text.badge)}</span>` : ''}
    <h1${c.lang === 'kk' ? ' lang="ru"' : ''}>${esc(text.title)}</h1>
    ${text.subtitle.trim() ? `<p class="sub">${nl(text.subtitle)}</p>` : ''}
    <div class="chips"><span>📅 ${esc(c.dates)}</span>${c.route ? `<span>📍 ${esc(c.route)}</span>` : ''}</div>
    <div class="cta-row"><a class="btn" href="#request-${c.lang}">${cta} <span aria-hidden="true">${arrow}</span></a><span class="price">${esc(text.price.trim() || L.priceAsk)}</span></div>
  </div>
</section>`;
    case 'facts':
      return `<section class="wrap facts">
  <div class="fact"><small>${esc(L.dates)}</small><b>${esc(c.dates)}</b></div>
  <div class="fact"><small>${esc(L.duration)}</small><b>${esc(L.days(c.f.nDays))}${c.f.visits ? ` · ${esc(L.visits(c.f.visits))}` : ''}</b></div>
  <div class="fact"><small>${esc(L.route)}</small><b>${esc(c.route || c.country)}</b></div>
</section>`;
    case 'program':
      return `<section class="wrap block"><h2${kk(c)}>${esc(L.program)}</h2><ol class="days">${c.days.map((d) => `<li><span class="dn"${kk(c)}>${esc(d.label)}</span><div><b>${esc(d.city || '')}</b>${d.line ? `<p>${esc(d.line)}</p>` : ''}</div></li>`).join('')}</ol></section>`;
    case 'photos':
      return extra.length ? `<section class="wrap block"><h2${kk(c)}>${esc(L.photos)}</h2><div class="gallery">${extra.map((p) => `<div class="ph"><div ${bg(p)}></div></div>`).join('')}</div></section>` : '';
    case 'included':
      return c.included.length || text.price.trim() ? `<section class="wrap block"><h2${kk(c)}>${esc(L.included)}</h2><ul class="checks">${c.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul><div class="pricebox"><small>${esc(L.price)}</small><b>${esc(text.price.trim() || L.priceAsk)}</b><a class="btn" href="#request-${c.lang}">${cta}</a></div></section>` : '';
    case 'organizer': {
      const contacts = [org.contact.phone, org.contact.email, org.contact.site].filter((s) => s.trim()).map(esc).join(' · ');
      return `<section class="wrap block"><h2${kk(c)}>${esc(L.organizer)}</h2><div class="org">${t.logo ? `<img src="${t.logo}" alt="">` : `<span class="mono">${esc(t.short)}</span>`}<div><b>${esc(t.name)}</b>${text.about.trim() ? `<p>${nl(text.about)}</p>` : ''}${contacts ? `<p class="muted">${contacts}</p>` : ''}</div></div></section>`;
    }
    case 'request': {
      const wa = org.contact.phone.replace(/\D/g, '');
      const mail = org.contact.email.trim();
      return `<section class="wrap block request" id="request-${c.lang}"><h2${kk(c)}>${esc(L.request)}</h2><p class="muted">${esc(L.requestSub)}</p>
  <form class="req" data-wa="${wa}" data-mail="${esc(mail)}" data-title="${esc(text.title)}">
    <input name="name" placeholder="${esc(L.name)}" autocomplete="name">
    <input name="contact" placeholder="${esc(L.contact)}" autocomplete="tel">
    <textarea name="comment" rows="3" placeholder="${esc(L.comment)}"></textarea>
    <div class="send">${wa ? `<button class="btn" value="wa">${esc(L.sendWa)}</button>` : ''}${mail ? `<button class="btn ghost" value="mail">${esc(L.sendMail)}</button>` : ''}${!wa && !mail ? `<p class="todo">[${esc(L.organizer)}: +7 … / mail@…]</p>` : ''}</div>
    <p class="muted small">${esc(L.sentNote)}</p>
  </form></section>`;
    }
  }
  return '';
}

export function tourHtml(x: TourHtmlInput): string {
  const { pg, program, org, t } = x;
  const langs = pg.langs.length ? pg.langs : (['ru'] as Lang[]);
  const first = x.show && langs.includes(x.show) ? x.show : langs[0];
  const ctxs = langs.map((l) => pageCtx(pg, l, program, org, t));
  const accent = t.accent || '#1a73e8';
  const onAccent = isLight(accent) ? '#0f1b2d' : '#ffffff';
  const title = ctxs[0].text.title;
  const used = pg.photos.filter((p) => x.photos[p.id]);
  const order = pg.blocks.filter((b) => b.on).map((b) => b.key);
  const mains = ctxs.map((c) => `<main data-lang="${c.lang}" lang="${c.lang}" dir="${c.lang === 'ar' ? 'rtl' : 'ltr'}"${c.lang !== first ? ' hidden' : ''}>
${order.map((k) => section(c, k, x)).join('\n')}
<footer class="wrap"><span>© ${x.year ?? new Date().getFullYear()} ${esc(t.name)}</span></footer>
</main>`).join('\n');
  const msgs = Object.fromEntries(ctxs.map((c) => [c.lang, { ...c.L.msg, need: c.L.needContact }]));
  return `<!doctype html>
<html lang="${first}" dir="${first === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(t.name)}</title>
<meta name="description" content="${esc(ctxs[0].text.subtitle)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(ctxs[0].text.subtitle)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Sofia+Sans+Extra+Condensed:wght@800&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+Arabic:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap">
<style>
:root { --accent: ${accent}; --on: ${onAccent}; --ink: #0f1b2d; --muted: #5b6576; --bg: #f4f6fa; --card: #ffffff; --line: #e1e6ee; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 Inter, 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', system-ui, sans-serif; }
main[lang="ar"] { font-family: 'Noto Sans Arabic', Inter, sans-serif; }
main[lang="hi"] { font-family: 'Noto Sans Devanagari', Inter, sans-serif; }
.wrap { max-width: 1120px; margin-inline: auto; padding-inline: max(20px, env(safe-area-inset-left)); }
h1, h2 { font-family: 'Sofia Sans Extra Condensed', 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Arial Narrow', sans-serif; font-weight: 800; margin: 0; line-height: .95; text-wrap: balance; }
main[lang="zh"] h1, main[lang="zh"] h2, main[lang="ar"] h1, main[lang="ar"] h2, main[lang="hi"] h1, main[lang="hi"] h2 { line-height: 1.2; font-weight: 700; }
h2 { font-size: clamp(36px, 5vw, 56px); margin-bottom: 24px; }
.btn { display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 26px; border-radius: 16px; border: 0; background: var(--accent); color: var(--on); font: 700 16px Inter, sans-serif; text-decoration: none; cursor: pointer; box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 35%, transparent); }
.btn.ghost { background: #fff; color: var(--ink); box-shadow: inset 0 0 0 2px var(--line); }
.btn.sm { min-height: 42px; padding: 0 18px; font-size: 14px; border-radius: 12px; }
.muted { color: var(--muted); } .small { font-size: 13px; }
.top { position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.top .wrap { display: flex; align-items: center; gap: 16px; min-height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; margin-inline-end: auto; min-width: 0; }
.brand img { height: 36px; max-width: 120px; object-fit: contain; }
.mono { width: 40px; height: 40px; border-radius: 12px; display: inline-grid; place-items: center; background: var(--accent); color: var(--on); font-weight: 700; flex: none; }
.langs { display: flex; gap: 6px; flex-wrap: wrap; }
.langs button { border: 0; background: var(--bg); color: var(--ink); border-radius: 10px; padding: 8px 10px; font: 600 13px Inter, 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', sans-serif; cursor: pointer; }
.langs button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.hero { position: relative; overflow: hidden; color: #fff; min-height: min(86vh, 760px); display: flex; align-items: flex-end; background: linear-gradient(150deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #000)); }
.hero .bg { position: absolute; inset: 0; background-size: cover; }
.hero .dim { position: absolute; inset: 0; background: #000; }
.hero .shade { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(8,14,26,.88) 0%, rgba(8,14,26,.45) 45%, rgba(8,14,26,.1) 75%); }
.hero.nophoto .shade { background: radial-gradient(circle at 80% 10%, rgba(255,255,255,.18), transparent 50%); }
.hero-in { position: relative; width: 100%; padding-block: 120px 56px; display: grid; gap: 18px; justify-items: start; }
.hero h1 { font-size: clamp(48px, 8vw, 104px); max-width: 15ch; }
main[lang="zh"] .hero h1, main[lang="ar"] .hero h1, main[lang="hi"] .hero h1 { font-size: clamp(36px, 6vw, 72px); }
.hero .sub { font-size: clamp(17px, 2vw, 21px); max-width: 60ch; margin: 0; opacity: .92; }
.badge { background: var(--accent); color: var(--on); border-radius: 999px; padding: 8px 16px; font-weight: 700; font-size: 14px; letter-spacing: .04em; text-transform: uppercase; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; }
.chips span { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); border-radius: 12px; padding: 8px 12px; font-weight: 600; }
.cta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; margin-top: 6px; }
.price { font-weight: 700; font-size: 18px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: -36px; position: relative; }
.fact { background: var(--card); border-radius: 20px; padding: 20px 22px; box-shadow: 0 12px 30px rgba(15,27,45,.08); display: grid; gap: 4px; min-width: 0; }
.fact small { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; font-size: 12px; }
.fact b { font-size: 18px; overflow-wrap: break-word; }
.block { padding-block: 64px 8px; }
.days { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.days li { display: grid; grid-template-columns: 110px 1fr; gap: 18px; background: var(--card); border-radius: 20px; padding: 20px 22px; box-shadow: 0 6px 18px rgba(15,27,45,.05); }
.days .dn { font-family: 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 30px; color: var(--accent); line-height: 1; }
.days b { font-size: 18px; } .days p { margin: 4px 0 0; color: var(--muted); }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.gallery .ph { position: relative; overflow: hidden; border-radius: 20px; aspect-ratio: 4 / 3; }
.gallery .bg { position: absolute; inset: 0; background-size: cover; }
.checks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.checks li { background: var(--card); border-radius: 16px; padding: 14px 16px 14px 48px; position: relative; font-weight: 600; }
main[dir="rtl"] .checks li { padding: 14px 48px 14px 16px; }
.checks li::before { content: "✓"; position: absolute; inset-inline-start: 16px; top: 12px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--on); display: grid; place-items: center; font-size: 13px; }
.pricebox { margin-top: 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; background: var(--card); border-radius: 20px; padding: 20px 22px; }
.pricebox small { color: var(--muted); font-weight: 600; } .pricebox b { font-size: 22px; margin-inline-end: auto; }
.org { display: flex; gap: 18px; align-items: flex-start; background: var(--card); border-radius: 20px; padding: 22px; }
.org img { height: 56px; max-width: 140px; object-fit: contain; }
.org b { font-size: 20px; } .org p { margin: 6px 0 0; }
.request form { display: grid; gap: 12px; max-width: 560px; background: var(--card); border-radius: 22px; padding: 22px; box-shadow: 0 12px 30px rgba(15,27,45,.08); }
.request input, .request textarea { font: inherit; border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; background: #fbfcfe; color: var(--ink); width: 100%; }
.send { display: flex; flex-wrap: wrap; gap: 10px; }
.todo { background: #fff1c2; color: #6b4e00; border-radius: 8px; padding: 6px 10px; margin: 0; }
footer { padding-block: 48px; color: var(--muted); font-size: 14px; }
@media (max-width: 640px) { .days li { grid-template-columns: 1fr; gap: 6px; } .top .btn { display: none; } .hero-in { padding-block: 96px 40px; } .facts { margin-top: 16px; } }
${used.map((p) => `.ph-${p.id} { background-image: url(${x.photos[p.id]}); }`).join('\n')}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="brand">${t.logo ? `<img src="${t.logo}" alt="">` : `<span class="mono">${esc(t.short)}</span>`}<span>${esc(t.name)}</span></div>
  ${langs.length > 1 ? `<div class="langs">${langs.map((l) => `<button type="button" data-l="${l}" aria-pressed="${l === first}">${LANG_SELF[l]}</button>`).join('')}</div>` : ''}
  <a class="btn sm" href="#request-${first}">${esc(ctxs[langs.indexOf(first)].text.cta.trim() || ctxs[langs.indexOf(first)].L.ctaDefault)}</a>
</div></header>
${mains}
<script>
(function () {
  var M = ${JSON.stringify(msgs)};
  var src = new URLSearchParams(location.search).get('utm_source') || '—';
  document.querySelectorAll('.langs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-l');
      document.querySelectorAll('main').forEach(function (m) { m.hidden = m.getAttribute('data-lang') !== l; });
      document.querySelectorAll('.langs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      var a = document.querySelector('.top .btn'); if (a) a.setAttribute('href', '#request-' + l);
    });
  });
  document.querySelectorAll('form.req').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = f.closest('main').getAttribute('data-lang'), m = M[l];
      var name = f.name.value.trim(), contact = f.contact.value.trim(), comment = f.comment.value.trim();
      if (!name || !contact) { alert(m.need); return; }
      var text = m.req + ': ' + f.getAttribute('data-title') + '\\n' + m.name + ': ' + name + '\\n' + m.contact + ': ' + contact + (comment ? '\\n' + m.comment + ': ' + comment : '') + '\\n' + m.src + ': ' + src;
      var how = (e.submitter && e.submitter.value) || 'wa';
      var url = how === 'mail' ? 'mailto:' + f.getAttribute('data-mail') + '?subject=' + encodeURIComponent(m.req + ': ' + f.getAttribute('data-title')) + '&body=' + encodeURIComponent(text)
        : 'https://wa.me/' + f.getAttribute('data-wa') + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank') || (location.href = url);
    });
  });
})();
</script>
</body>
</html>`;
}

// Страница тура одним HTML-файлом (решение пользователя 21.10.2026: «скачивать для своего домена»): фото и видео внутри
// файла, шрифты — Google Fonts, переключатель языков, заявка через мессенджеры. Этот же HTML показывается в кабинете как
// предпросмотр «компьютер / телефон» — что видно, то и скачивается.
// Правки пользователя 22.10.2026: обложка ниже и с несколькими фото или видео, даты выше; дни программы раскрываются
// с подробностями; фото — карусель и просмотр на весь экран; организатор — полное описание, фото и реквизиты; заявка —
// красивый блок, несколько мессенджеров или одна кнопка.
import type { Lang } from '@/i18n';

import { isLight } from './banner-color';
import type { OProgram, Org } from './org';
import { MESSENGERS, channelsOf, chatHref, heroOf, pageCtx, parseRequisites, requestOf, type Channel, type Messenger, type OPage, type PageCtx, type PhotoRef } from './sale';
import type { Tenant } from './tenant';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const paras = (s: string) => s.split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;
const pos = (ref: PhotoRef) => `background-position:${pct(ref.fx)} ${pct(ref.fy)}`;
const bg = (ref: PhotoRef, extra = '') => `class="bg ph-${ref.id}${extra}" style="${pos(ref)};transform-origin:${pct(ref.fx)} ${pct(ref.fy)};--z:${Math.max(1, ref.zoom || 1)}"`;
/** Шрифт заголовков (Sofia Sans) без языка рисует болгарские «в», «д», «т»; казахского в нём нет — берём русские формы. */
const kk = (c: PageCtx) => (c.lang === 'kk' ? ' lang="ru"' : '');
const LANG_SELF: Record<Lang, string> = { ru: 'Русский', en: 'English', zh: '中文', kk: 'Қазақша', ar: 'العربية', hi: 'हिन्दी' };

// значки мессенджеров (контурные, в цвет кнопки)
const ICON: Record<Messenger, string> = {
  whatsapp: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
  telegram: '<path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 12-9"/>',
  max: '<rect x="3" y="3" width="18" height="18" rx="6"/><path d="M7.5 16V8.5l4.5 4.5 4.5-4.5V16"/>',
  vk: '<rect x="3" y="3" width="18" height="18" rx="6"/><path d="M7 9c.4 3.4 2 5.5 4.5 6V9m0 3.5c1.5-.3 2.8-1.8 3.2-3.5m-3.2 3.5c1.6.3 2.9 1.6 3.5 3"/>',
  viber: '<path d="M6 3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6l-5 4v-4H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><path d="M9 7.5c0 3 2.5 5.5 5.5 5.5l.8-1.3-1.6-.8-.8.8c-.8-.4-1.6-1.2-2-2l.8-.8-.8-1.6z"/>',
  wechat: '<path d="M9.5 4C5.4 4 2 6.7 2 10c0 1.9 1.1 3.6 2.8 4.7L4.2 17l2.9-1.4c.8.2 1.6.4 2.4.4"/><path d="M15.5 9c3.6 0 6.5 2.4 6.5 5.3 0 1.6-.9 3-2.3 4l.5 2.3-2.5-1.2c-.7.2-1.5.3-2.2.3-3.6 0-6.5-2.4-6.5-5.4S11.9 9 15.5 9z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
};
const svg = (k: Messenger) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const COLOR = Object.fromEntries(MESSENGERS.map(([k, , , c]) => [k, c])) as Record<Messenger, string>;
const chName = (c: PageCtx, k: Messenger) => (k === 'email' ? c.L.mail : k === 'phone' ? c.L.phone : k === 'vk' ? c.L.vk : MESSENGERS.find(([x]) => x === k)![1]);

/** show — какой язык открыт сразу (в кабинете — выбранный в предпросмотре; в файле — основной). */
/** preview — для рамки в кабинете: ролик обложки не вставляется, а приходит сообщением (см. HtmlFrame.post). */
export type TourHtmlInput = { pg: OPage; program: OProgram; org: Org; t: Tenant; photos: Record<string, string>; year?: number; show?: Lang; preview?: boolean };

function chButton(c: PageCtx, ch: Channel, cls: string) {
  const href = chatHref(ch);
  return `<button type="submit" class="${cls}" style="--c:${COLOR[ch.kind]}" data-kind="${ch.kind}" data-href="${esc(href)}" data-val="${esc(ch.value.trim())}">${svg(ch.kind)}<span>${esc(chName(c, ch.kind))}</span></button>`;
}
function chPill(c: PageCtx, ch: Channel) {
  const href = chatHref(ch);
  const label = ch.kind === 'phone' || ch.kind === 'email' ? ch.value.trim() : chName(c, ch.kind);
  return href
    ? `<a class="pill" style="--c:${COLOR[ch.kind]}" href="${esc(href)}" target="_blank" rel="noopener">${svg(ch.kind)}<span>${esc(label)}</span></a>`
    : `<button type="button" class="pill wc" style="--c:${COLOR[ch.kind]}" data-val="${esc(ch.value.trim())}">${svg(ch.kind)}<span>${esc(label)}</span></button>`;
}

function section(c: PageCtx, key: string, x: TourHtmlInput, gallery: PhotoRef[], hasFacts: boolean): string {
  const { L, text } = c;
  const { pg, t, org } = x;
  const has = (id?: string) => !!id && !!x.photos[id];
  const ref = (id: string) => pg.photos.find((p) => p.id === id);
  const cover = pg.photos.find((p) => p.id === pg.cover && has(p.id)) || pg.photos.find((p) => has(p.id));
  const cta = esc(text.cta.trim() || L.ctaDefault);
  const arrow = c.lang === 'ar' ? '←' : '→';
  const channels = channelsOf(org).filter((ch) => ch.on && ch.value.trim());
  switch (key) {
    case 'cover': {
      const h = heroOf(pg);
      const slides = h.slides.map(ref).filter((p): p is PhotoRef => !!p && has(p.id));
      let media = '';
      if (h.mode === 'video' && has(h.video)) {
        // сам ролик подставляет скрипт внизу — один раз на все языки (иначе каждый язык добавил бы копию в файл)
        media = `<video class="bg vid${cover ? ` ph-${cover.id}` : ''}" data-pv autoplay muted loop playsinline preload="auto"></video>`;
      } else if (h.mode === 'slides' && slides.length > 1) {
        media = slides.map((p, i) => `<div ${bg(p, ` slide kb${i === 0 ? ' on' : ''}`)}></div>`).join('');
      } else if (cover) {
        media = `<div ${bg(cover, ' kb on')}></div>`;
      }
      const dim = h.mode === 'video' ? 0.25 : (cover?.dim || 0);
      return `<section class="hero${media ? '' : ' nophoto'}">
  <div class="media">${media}</div><div class="dim" style="opacity:${Math.min(0.7, dim)}"></div><div class="shade"></div>
  <div class="wrap hero-in">
    ${text.badge.trim() ? `<span class="badge">${esc(text.badge)}</span>` : ''}
    <h1${c.lang === 'kk' || (c.lang !== 'ru' && /[а-яё]/i.test(text.title)) ? ' lang="ru"' : ''}>${esc(text.title)}</h1>
    ${text.subtitle.trim() ? `<p class="sub">${esc(text.subtitle).replace(/\n/g, '<br>')}</p>` : ''}
    ${hasFacts ? '' : `<div class="chips"><span>📅 ${esc(c.dates)}</span>${c.route ? `<span>📍 ${esc(c.route)}</span>` : ''}</div>`}
    <div class="cta-row"><a class="btn" href="#request-${c.lang}">${cta} <span aria-hidden="true">${arrow}</span></a><span class="price">${esc(text.price.trim() || L.priceAsk)}</span></div>
  </div>
  ${h.mode === 'slides' && slides.length > 1 ? `<div class="dots">${slides.map((_, i) => `<button type="button" aria-label="${i + 1}"${i === 0 ? ' class="on"' : ''}></button>`).join('')}</div>` : ''}
</section>`;
    }
    case 'facts':
      return `<section class="wrap facts">
  <div class="fact"><span class="fi">📅</span><div><small>${esc(L.dates)}</small><b>${esc(c.dates)}</b></div></div>
  <div class="fact"><span class="fi">⏱</span><div><small>${esc(L.duration)}</small><b>${esc(L.days(c.f.nDays))}${c.f.visits ? ` · ${esc(L.visits(c.f.visits))}` : ''}</b></div></div>
  <div class="fact"><span class="fi">📍</span><div><small>${esc(L.route)}</small><b>${esc(c.route || c.country)}</b></div></div>
</section>`;
    case 'program':
      return `<section class="wrap block"><h2${kk(c)}>${esc(L.program)}</h2><div class="days">${c.days.map((d, i) => {
        const head = `<span class="dn"${kk(c)}>${esc(d.label)}</span><span class="dt"><b>${esc(d.city || '')}</b>${d.line ? `<span>${esc(d.line)}</span>` : ''}</span>`;
        const ph = has(d.photo) ? ref(d.photo) : undefined;
        if (!d.details && !ph) return `<div class="day plain">${head}</div>`;
        const lines = d.details.split('\n');
        const rows = lines.map((l) => {
          const m = l.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
          return m ? `<li><time>${m[1]}</time><span>${esc(m[2])}</span></li>` : l.trim() ? `<li class="txt"><span>${esc(l.trim())}</span></li>` : '';
        }).join('');
        return `<details class="day"${i === 0 ? ' open' : ''}><summary>${head}<span class="chev" aria-hidden="true"></span></summary><div class="dd">${ph ? `<button type="button" class="dph" data-g="day${i}" data-i="0" data-id="${ph.id}"><div class="bgc ph-${ph.id}" style="${pos(ph)}"></div></button>` : ''}<ul class="tl">${rows}</ul></div></details>`;
      }).join('')}</div></section>`;
    case 'photos':
      return gallery.length ? `<section class="block gal-sec"><div class="wrap gal-head"><h2${kk(c)}>${esc(L.photos)}</h2><span class="count">${gallery.length}</span><div class="arrows"><button type="button" class="ga" data-d="-1" aria-label="${esc(L.prev)}">‹</button><button type="button" class="ga" data-d="1" aria-label="${esc(L.next)}">›</button></div></div>
  <div class="gal">${gallery.map((p, i) => `<button type="button" class="gi" data-g="gal" data-i="${i}" data-id="${p.id}"><div class="bgc ph-${p.id}" style="${pos(p)}"></div></button>`).join('')}</div></section>` : '';
    case 'included':
      return c.included.length || text.price.trim() ? `<section class="wrap block"><h2${kk(c)}>${esc(L.included)}</h2><ul class="checks">${c.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul><div class="pricebox"><small>${esc(L.price)}</small><b>${esc(text.price.trim() || L.priceAsk)}</b><a class="btn" href="#request-${c.lang}">${cta}</a></div></section>` : '';
    case 'organizer': {
      const photos = (org.orgPhotos || []).filter((id) => x.photos[id]);
      const req = parseRequisites(org.requisites || '');
      const site = org.contact.site.trim();
      return `<section class="wrap block"><h2${kk(c)}>${esc(L.organizer)}</h2>
  <div class="org${photos.length ? ' with-ph' : ''}">
    <div class="org-main">
      <div class="org-head">${t.logo ? `<img src="${t.logo}" alt="">` : `<span class="mono">${esc(t.short)}</span>`}<b>${esc(t.name)}</b></div>
      ${text.about.trim() ? `<div class="about">${paras(text.about)}</div>` : ''}
      ${channels.length || site ? `<div class="pills">${channels.map((ch) => chPill(c, ch)).join('')}${site ? `<a class="pill" style="--c:#5b6576" href="${esc(/^https?:/.test(site) ? site : `https://${site}`)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><span>${esc(site.replace(/^https?:\/\//, ''))}</span></a>` : ''}</div>` : ''}
    </div>
    ${photos.length ? `<div class="org-ph n${Math.min(photos.length, 4)}">${photos.slice(0, 4).map((id, i) => `<button type="button" class="gi" data-g="org" data-i="${i}" data-id="${id}"><div class="bgc ph-${id}"></div>${i === 3 && photos.length > 4 ? `<span class="more">+${photos.length - 4}</span>` : ''}</button>`).join('')}${photos.slice(4).map((id, i) => `<button type="button" class="gi" hidden data-g="org" data-i="${i + 4}" data-id="${id}"></button>`).join('')}</div>` : ''}
  </div>
  ${req.length ? `<details class="reqs"><summary>${esc(L.requisites)}<span class="chev" aria-hidden="true"></span></summary><dl>${req.map(([k, v]) => (k ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : `<dd class="wide">${esc(v)}</dd>`)).join('')}</dl><button type="button" class="btn ghost sm copy-req" data-text="${esc(org.requisites || '')}" data-done="${esc(L.reqCopied)}">${esc(L.copyReq)}</button></details>` : ''}
</section>`;
    }
    case 'request': {
      const r = requestOf(pg);
      const primary = channels.find((ch) => ch.kind === r.primary) || channels[0];
      const send = !channels.length
        ? `<p class="todo">[${esc(L.organizer)}: WhatsApp / Telegram / ${esc(L.mail)}]</p>`
        : r.mode === 'single' && primary
          ? chButton(c, primary, 'btn big one').replace(`<span>${esc(chName(c, primary.kind))}</span>`, `<span>${esc(L.sendRequest)}</span>`) + `<p class="muted small via">${esc(L.sendVia)}: ${esc(chName(c, primary.kind))}</p>`
          : `<p class="muted small">${esc(L.sendVia)}:</p><div class="chs">${channels.map((ch) => chButton(c, ch, 'ch')).join('')}</div>`;
      return `<section class="rq-band" id="request-${c.lang}"><div class="wrap rq">
  <div class="rq-text"><h2${kk(c)}>${esc(L.request)}</h2><p>${esc(L.requestSub)}</p>
    ${channels.length ? `<p class="rq-or">${esc(L.writeDirect)}</p><div class="pills light">${channels.map((ch) => chPill(c, ch)).join('')}</div>` : ''}
  </div>
  <form class="req" data-title="${esc(text.title)}" novalidate>
    <label><span>${esc(L.name)}</span><input name="name" autocomplete="name"></label>
    <label><span>${esc(L.contact)}</span><input name="contact" autocomplete="tel"></label>
    <label><span>${esc(L.comment)}</span><textarea name="comment" rows="3"></textarea></label>
    ${send}
  </form>
</div></section>`;
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
  const order = pg.blocks.filter((b) => b.on).map((b) => b.key);
  const h = heroOf(pg);
  const heroVideo = order.includes('cover') && h.mode === 'video' && !!x.photos[h.video];
  // в галерею — все фото (и те, что на обложке: их тоже хочется открыть крупно)
  const gallery = pg.photos.filter((p) => x.photos[p.id]);
  const imgIds = new Set([...pg.photos.map((p) => p.id), ...(org.orgPhotos || [])].filter((id) => x.photos[id] && id !== h.video));
  const mains = ctxs.map((c) => `<main data-lang="${c.lang}" lang="${c.lang}" dir="${c.lang === 'ar' ? 'rtl' : 'ltr'}"${c.lang !== first ? ' hidden' : ''}>
${order.map((k) => section(c, k, x, gallery, order.includes('facts'))).join('\n')}
<footer class="wrap"><span>© ${x.year ?? new Date().getFullYear()} ${esc(t.name)}</span></footer>
</main>`).join('\n');
  const msgs = Object.fromEntries(ctxs.map((c) => [c.lang, { ...c.L.msg, need: c.L.needContact, pasted: c.L.pasted, wechat: c.L.wechat, close: c.L.close, prev: c.L.prev, next: c.L.next, of: c.L.photoOf, cta: c.text.cta.trim() || c.L.ctaDefault }]));
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
:root { --accent: ${accent}; --on: ${onAccent}; --ink: #0f1b2d; --muted: #5b6576; --bg: #f4f6fa; --card: #ffffff; --line: #e1e6ee; --deep: color-mix(in srgb, var(--accent) 55%, #000); }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { scroll-behavior: smooth; scroll-padding-top: 72px; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 Inter, 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', system-ui, sans-serif; }
main[lang="ar"] { font-family: 'Noto Sans Arabic', Inter, sans-serif; }
main[lang="hi"] { font-family: 'Noto Sans Devanagari', Inter, sans-serif; }
.wrap { max-width: 1120px; margin-inline: auto; padding-inline: max(20px, env(safe-area-inset-left)); }
h1, h2 { font-family: 'Sofia Sans Extra Condensed', 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', 'Arial Narrow', sans-serif; font-weight: 800; margin: 0; line-height: .95; text-wrap: balance; }
main[lang="zh"] h1, main[lang="zh"] h2, main[lang="ar"] h1, main[lang="ar"] h2, main[lang="hi"] h1, main[lang="hi"] h2 { line-height: 1.2; font-weight: 700; }
h2 { font-size: clamp(34px, 4.6vw, 52px); margin-bottom: 22px; }
button { font: inherit; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; padding: 0 26px; border-radius: 16px; border: 0; background: var(--accent); color: var(--on); font: 700 16px Inter, sans-serif; text-decoration: none; cursor: pointer; box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 35%, transparent); }
.btn.ghost { background: #fff; color: var(--ink); box-shadow: inset 0 0 0 2px var(--line); }
.btn.sm { min-height: 42px; padding: 0 18px; font-size: 14px; border-radius: 12px; }
.muted { color: var(--muted); } .small { font-size: 13px; }
.top { position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.top .wrap { display: flex; align-items: center; gap: 14px; min-height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; margin-inline-end: auto; min-width: 0; }
.brand span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand img { height: 36px; max-width: 120px; object-fit: contain; }
.mono { width: 40px; height: 40px; border-radius: 12px; display: inline-grid; place-items: center; background: var(--accent); color: var(--on); font-weight: 700; flex: none; }
.langs { display: flex; gap: 6px; flex-wrap: wrap; }
.langs button { border: 0; background: var(--bg); color: var(--ink); border-radius: 10px; padding: 8px 10px; font: 600 13px Inter, 'Noto Sans SC', 'Noto Sans Arabic', 'Noto Sans Devanagari', sans-serif; cursor: pointer; }
.langs button[aria-pressed="true"] { background: var(--ink); color: #fff; }

/* обложка: ниже, чем раньше, — карточки с датами видны на первом экране */
.hero { position: relative; overflow: hidden; color: #fff; min-height: clamp(440px, 64vh, 600px); display: flex; align-items: flex-end; background: linear-gradient(150deg, var(--accent), var(--deep)); }
.hero .media, .hero .dim, .hero .shade { position: absolute; inset: 0; }
.hero .bg { position: absolute; inset: 0; background-size: cover; width: 100%; height: 100%; object-fit: cover; transform: scale(var(--z, 1)); }
.hero .slide { opacity: 0; transition: opacity 1.2s ease; }
.hero .slide.on { opacity: 1; }
.hero .kb.on { animation: kb 9s ease-out both; }
@keyframes kb { from { transform: scale(calc(var(--z, 1) * 1.08)); } to { transform: scale(var(--z, 1)); } }
.hero .dim { background: #000; }
.hero .shade { background: linear-gradient(0deg, rgba(8,14,26,.9) 0%, rgba(8,14,26,.5) 42%, rgba(8,14,26,.08) 78%); }
main[dir="ltr"] .hero .shade { background: linear-gradient(0deg, rgba(8,14,26,.85) 0%, rgba(8,14,26,.35) 45%, rgba(8,14,26,0) 80%), linear-gradient(90deg, rgba(8,14,26,.55), rgba(8,14,26,0) 65%); }
.hero.nophoto .shade { background: radial-gradient(circle at 80% 10%, rgba(255,255,255,.18), transparent 50%); }
.hero-in { position: relative; width: 100%; padding-block: 72px 104px; display: grid; gap: 14px; justify-items: start; }
.hero h1 { font-size: clamp(42px, 6.2vw, 84px); max-width: 16ch; }
main[lang="zh"] .hero h1, main[lang="ar"] .hero h1, main[lang="hi"] .hero h1 { font-size: clamp(32px, 5vw, 60px); }
.hero .sub { font-size: clamp(16px, 1.8vw, 20px); max-width: 58ch; margin: 0; opacity: .92; }
.badge { background: var(--accent); color: var(--on); border-radius: 999px; padding: 7px 14px; font-weight: 700; font-size: 13px; letter-spacing: .04em; text-transform: uppercase; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; }
.chips span { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); border-radius: 12px; padding: 8px 12px; font-weight: 600; }
.cta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; margin-top: 6px; }
.price { font-weight: 700; font-size: 18px; }
.dots { position: absolute; inset-inline-end: max(20px, calc((100vw - 1120px) / 2 + 20px)); bottom: 104px; display: flex; gap: 8px; }
.dots button { width: 10px; height: 10px; border-radius: 50%; border: 0; padding: 0; background: rgba(255,255,255,.45); cursor: pointer; }
.dots button.on { background: #fff; width: 26px; border-radius: 5px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-top: -72px; position: relative; z-index: 2; }
.fact { background: var(--card); border-radius: 20px; padding: 18px 20px; box-shadow: 0 14px 34px rgba(15,27,45,.12); display: flex; gap: 14px; align-items: center; min-width: 0; }
.fact .fi { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 12%, #fff); font-size: 20px; flex: none; }
.fact div { display: grid; min-width: 0; }
.fact small { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; font-size: 12px; }
.fact b { font-size: 17px; overflow-wrap: break-word; }
.block { padding-block: 60px 4px; }

/* программа: каждый день раскрывается */
.days { display: grid; gap: 12px; }
.day { background: var(--card); border-radius: 20px; box-shadow: 0 6px 18px rgba(15,27,45,.05); overflow: hidden; }
.day summary, .day.plain { list-style: none; display: grid; grid-template-columns: 110px 1fr auto; gap: 18px; align-items: start; padding: 18px 22px; cursor: pointer; }
.day.plain { cursor: default; grid-template-columns: 110px 1fr; }
.day summary::-webkit-details-marker { display: none; }
.dn { font-family: 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 30px; color: var(--accent); line-height: 1; }
.dt { display: grid; gap: 2px; } .dt b { font-size: 18px; } .dt span { color: var(--muted); }
.chev { width: 34px; height: 34px; border-radius: 50%; background: var(--bg); position: relative; transition: transform .25s ease; }
.chev::before { content: ""; position: absolute; left: 12px; top: 10px; width: 9px; height: 9px; border-right: 2.4px solid var(--ink); border-bottom: 2.4px solid var(--ink); transform: rotate(45deg); }
details[open] > summary .chev { transform: rotate(180deg); }
.dd { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 0 22px 22px calc(110px + 40px); }
main[dir="rtl"] .dd { padding: 0 calc(110px + 40px) 22px 22px; }
.dd:has(.dph) { grid-template-columns: 260px minmax(0, 1fr); }
.dph { border: 0; padding: 0; border-radius: 16px; overflow: hidden; aspect-ratio: 4 / 3; cursor: zoom-in; position: relative; }
.bgc { position: absolute; inset: 0; background-size: cover; }
.tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.tl li { display: grid; grid-template-columns: 56px 1fr; gap: 10px; }
.tl li.txt { grid-template-columns: 1fr; color: var(--muted); }
.tl time { font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }

/* фото: карусель + просмотр на весь экран */
.gal-head { display: flex; align-items: flex-end; gap: 12px; }
.gal-head h2 { margin-bottom: 0; }
.gal-head .count { color: var(--muted); font-weight: 700; margin-bottom: 6px; }
.arrows { margin-inline-start: auto; display: flex; gap: 8px; }
.ga { width: 46px; height: 46px; border-radius: 50%; border: 0; background: var(--card); box-shadow: 0 6px 16px rgba(15,27,45,.12); font-size: 26px; line-height: 1; cursor: pointer; color: var(--ink); }
main[dir="rtl"] .ga { transform: scaleX(-1); }
.gal { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; padding: 22px max(20px, calc((100vw - 1120px) / 2 + 20px)) 10px; scrollbar-width: none; }
.gal::-webkit-scrollbar { display: none; }
.gi { flex: none; width: min(420px, 82vw); aspect-ratio: 4 / 3; border: 0; padding: 0; border-radius: 20px; overflow: hidden; position: relative; scroll-snap-align: start; cursor: zoom-in; box-shadow: 0 8px 20px rgba(15,27,45,.1); }
.gi .bgc { transition: transform .4s ease; } .gi:hover .bgc { transform: scale(1.04); }
.lb { position: fixed; inset: 0; z-index: 50; background: rgba(6,10,18,.94); display: grid; grid-template-columns: 64px 1fr 64px; align-items: center; }
.lb-img { height: 86vh; background-size: contain; background-repeat: no-repeat; background-position: center; touch-action: pan-y; }
.lb button { border: 0; background: rgba(255,255,255,.12); color: #fff; width: 48px; height: 48px; border-radius: 50%; font-size: 28px; line-height: 1; cursor: pointer; justify-self: center; }
.lb .lb-x { position: absolute; top: 16px; inset-inline-end: 16px; }
.lb-c { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; color: rgba(255,255,255,.8); font-weight: 600; }

.checks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.checks li { background: var(--card); border-radius: 16px; padding: 14px 16px 14px 48px; position: relative; font-weight: 600; }
main[dir="rtl"] .checks li { padding: 14px 48px 14px 16px; }
.checks li::before { content: "✓"; position: absolute; inset-inline-start: 16px; top: 12px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--on); display: grid; place-items: center; font-size: 13px; }
.pricebox { margin-top: 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; background: var(--card); border-radius: 20px; padding: 20px 22px; }
.pricebox small { color: var(--muted); font-weight: 600; } .pricebox b { font-size: 22px; margin-inline-end: auto; }

/* организатор: описание, контакты, фото, реквизиты */
.org { display: grid; gap: 22px; background: var(--card); border-radius: 24px; padding: 26px; box-shadow: 0 8px 24px rgba(15,27,45,.06); }
.org.with-ph { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
.org-main { display: grid; gap: 14px; align-content: start; min-width: 0; }
.org-head { display: flex; align-items: center; gap: 14px; }
.org-head img { height: 56px; max-width: 160px; object-fit: contain; }
.org-head b { font-size: 22px; }
.about p { margin: 0 0 10px; max-width: 68ch; }
.pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 999px; border: 0; background: color-mix(in srgb, var(--c) 12%, #fff); color: color-mix(in srgb, var(--c) 80%, #000); font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; }
.pill svg { width: 18px; height: 18px; }
.org-ph { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; align-content: start; }
.org-ph .gi { width: 100%; box-shadow: none; }
.org-ph.n1 { grid-template-columns: 1fr; } .org-ph.n3 .gi:first-child { grid-column: span 2; aspect-ratio: 16 / 9; }
.org-ph .more { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(8,14,26,.55); color: #fff; font-size: 28px; font-weight: 800; }
.reqs { margin-top: 14px; background: var(--card); border-radius: 20px; padding: 0 22px; box-shadow: 0 6px 18px rgba(15,27,45,.05); }
.reqs summary { list-style: none; display: flex; align-items: center; justify-content: space-between; padding: 18px 0; font-weight: 700; font-size: 17px; cursor: pointer; }
.reqs summary::-webkit-details-marker { display: none; }
.reqs dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 18px; margin: 0 0 16px; }
.reqs dt { color: var(--muted); } .reqs dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; } .reqs dd.wide { grid-column: 1 / -1; font-size: 17px; }
.reqs .copy-req { margin-bottom: 20px; }

/* заявка: цветная полоса, слева — текст и мессенджеры, справа — форма */
.rq-band { margin-top: 64px; padding-block: 64px; background: linear-gradient(140deg, var(--accent), var(--deep)); color: #fff; }
.rq { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 480px); gap: 40px; align-items: center; }
.rq h2 { color: #fff; }
.rq-text p { font-size: 18px; opacity: .92; margin: 0; max-width: 46ch; }
.rq-or { margin-top: 26px !important; font-size: 14px !important; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; opacity: .8 !important; }
.pills.light { margin-top: 12px; } .pills.light .pill { background: rgba(255,255,255,.14); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
.req { display: grid; gap: 12px; background: var(--card); color: var(--ink); border-radius: 24px; padding: 26px; box-shadow: 0 24px 50px rgba(0,0,0,.22); }
.req label { display: grid; gap: 6px; } .req label span { font-size: 13px; font-weight: 600; color: var(--muted); }
.req input, .req textarea { font: inherit; border: 1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; background: #fbfcfe; color: var(--ink); width: 100%; }
.req input:focus, .req textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
.req .bad { border-color: #c5321b; }
.btn.big { min-height: 58px; width: 100%; font-size: 17px; background: var(--c, var(--accent)); color: #fff; box-shadow: 0 12px 26px color-mix(in srgb, var(--c, var(--accent)) 35%, transparent); }
.btn.big svg { stroke: #fff; } .via { text-align: center; margin: -2px 0 0; }
.chs { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.ch { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; border: 0; border-radius: 14px; background: var(--c); color: #fff; font-weight: 700; cursor: pointer; }
.ch svg { stroke: #fff; }
.todo { background: #fff1c2; color: #6b4e00; border-radius: 8px; padding: 6px 10px; margin: 0; }
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; background: #0f1b2d; color: #fff; padding: 12px 18px; border-radius: 14px; font-weight: 600; max-width: calc(100vw - 32px); box-shadow: 0 12px 30px rgba(0,0,0,.3); }
footer { padding-block: 32px 40px; color: var(--muted); font-size: 14px; }
@media (max-width: 860px) { .rq, .org.with-ph { grid-template-columns: minmax(0, 1fr); } .dd, .dd:has(.dph), main[dir="rtl"] .dd { grid-template-columns: minmax(0, 1fr); padding: 0 22px 22px; } }
@media (max-width: 640px) {
  .day summary { grid-template-columns: 1fr auto; } .day summary .dn { grid-column: 1 / -1; } .day.plain { grid-template-columns: 1fr; }
  .top .btn { display: none; } .langs { flex-wrap: nowrap; overflow-x: auto; max-width: 58vw; scrollbar-width: none; } .langs button { flex: none; }
  .hero { min-height: 0; } .hero-in { padding-block: 56px 92px; } .dots { bottom: 92px; }
  .facts { margin-top: -64px; } .rq-band { padding-block: 48px; } .reqs dl { grid-template-columns: 1fr; gap: 2px; } .reqs dd { margin-bottom: 8px; }
  .lb { grid-template-columns: 1fr; } .lb .lb-p, .lb .lb-n { position: absolute; bottom: 12px; } .lb .lb-p { left: 16px; } .lb .lb-n { right: 16px; }
  .dots { top: 18px; bottom: auto; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .hero .kb.on { animation: none; } .hero .slide { transition: none; } }
${[...imgIds].map((id) => `.ph-${id} { background-image: url(${x.photos[id]}); }`).join('\n')}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="brand">${t.logo ? `<img src="${t.logo}" alt="">` : `<span class="mono">${esc(t.short)}</span>`}<span>${esc(t.name)}</span></div>
  ${langs.length > 1 ? `<div class="langs">${langs.map((l) => `<button type="button" data-l="${l}" aria-pressed="${l === first}">${LANG_SELF[l]}</button>`).join('')}</div>` : ''}
  <a class="btn sm" href="#request-${first}">${esc(ctxs[langs.indexOf(first)].text.cta.trim() || ctxs[langs.indexOf(first)].L.ctaDefault)}</a>
</div></header>
${mains}
<div class="lb" hidden role="dialog" aria-modal="true"><button type="button" class="lb-p">‹</button><div class="lb-img"></div><button type="button" class="lb-n">›</button><button type="button" class="lb-x">×</button><div class="lb-c"></div></div>
<div class="toast" hidden></div>
<script>
(function () {${heroVideo ? `
  // ролик обложки: в файле — один data:URL на все языки; в предпросмотре кабинета — Blob сообщением
  var setV = function (u) { document.querySelectorAll('video[data-pv]').forEach(function (v) { if (v.getAttribute('src')) return; v.src = u; v.play().catch(function () {}); }); };
  ${x.preview ? `addEventListener('message', function (e) { var b = e.data && e.data.heroVideo; if (b instanceof Blob) setV(URL.createObjectURL(b)); });` : `setV(${JSON.stringify(x.photos[h.video])});`}` : ''}
  var M = ${JSON.stringify(msgs)};
  var src = new URLSearchParams(location.search).get('utm_source') || '—';
  var cur = function () { return document.querySelector('main:not([hidden])'); };
  var L = function () { return M[cur().getAttribute('data-lang')]; };
  var toastT, toast = function (s) { var t = document.querySelector('.toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 5000); };
  var copy = function (s) { try { navigator.clipboard.writeText(s); } catch (e) { /* без буфера — человек перепишет */ } };
  var open = function (u) { if (/^(mailto|tel|viber):/.test(u)) { location.href = u; return; } window.open(u, '_blank') || (location.href = u); };

  // языки
  document.querySelectorAll('.langs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-l');
      document.querySelectorAll('main').forEach(function (m) { m.hidden = m.getAttribute('data-lang') !== l; });
      document.querySelectorAll('.langs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      var a = document.querySelector('.top .btn'); if (a) { a.setAttribute('href', '#request-' + l); a.textContent = M[l].cta; }
    });
  });

  // слайд-шоу обложки
  document.querySelectorAll('.hero').forEach(function (h) {
    var s = h.querySelectorAll('.slide'), d = h.querySelectorAll('.dots button'), i = 0;
    if (s.length < 2) return;
    var go = function (n) { s[i].classList.remove('on'); d[i] && d[i].classList.remove('on'); i = (n + s.length) % s.length; s[i].classList.add('on'); d[i] && d[i].classList.add('on'); };
    var timer = setInterval(function () { go(i + 1); }, 5000);
    d.forEach(function (b, k) { b.addEventListener('click', function () { clearInterval(timer); go(k); }); });
  });

  // карусель фото
  document.querySelectorAll('.gal-sec').forEach(function (sec) {
    var g = sec.querySelector('.gal'), rtl = sec.closest('main').dir === 'rtl';
    sec.querySelectorAll('.ga').forEach(function (b) {
      b.addEventListener('click', function () { var w = g.querySelector('.gi').offsetWidth + 14; g.scrollBy({ left: (rtl ? -1 : 1) * Number(b.getAttribute('data-d')) * w, behavior: 'smooth' }); });
    });
  });

  // фото на весь экран
  var lb = document.querySelector('.lb'), img = lb.querySelector('.lb-img'), list = [], at = 0;
  var show = function (n) { at = (n + list.length) % list.length; img.className = 'lb-img ph-' + list[at]; lb.querySelector('.lb-c').textContent = L().of.replace('{a}', at + 1).replace('{b}', list.length); };
  var close = function () { lb.hidden = true; document.body.style.overflow = ''; };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]');
    if (!b) return;
    var m = cur(), g = b.getAttribute('data-g');
    list = [].map.call(m.querySelectorAll('[data-g="' + g + '"]'), function (x) { return x.getAttribute('data-id'); });
    var l = L(); lb.querySelector('.lb-x').setAttribute('aria-label', l.close); lb.querySelector('.lb-p').setAttribute('aria-label', l.prev); lb.querySelector('.lb-n').setAttribute('aria-label', l.next);
    lb.querySelector('.lb-p').hidden = lb.querySelector('.lb-n').hidden = list.length < 2;
    show(Number(b.getAttribute('data-i'))); lb.hidden = false; document.body.style.overflow = 'hidden';
  });
  lb.querySelector('.lb-x').addEventListener('click', close);
  lb.querySelector('.lb-p').addEventListener('click', function () { show(at - 1); });
  lb.querySelector('.lb-n').addEventListener('click', function () { show(at + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
  var x0 = null;
  img.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1)); x0 = null; });

  // реквизиты и WeChat ID — в буфер
  document.addEventListener('click', function (e) {
    var r = e.target.closest('.copy-req'); if (r) { copy(r.getAttribute('data-text')); toast(r.getAttribute('data-done')); }
    var w = e.target.closest('.pill.wc'); if (w) { copy(w.getAttribute('data-val')); toast(L().wechat + ' ' + w.getAttribute('data-val')); }
  });

  // заявка: WhatsApp и почта — с готовым текстом; остальные мессенджеры — текст в буфер, чат открывается
  document.querySelectorAll('form.req').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = L(), b = e.submitter; if (!b) return;
      var name = f.name.value.trim(), contact = f.contact.value.trim(), comment = f.comment.value.trim();
      f.name.classList.toggle('bad', !name); f.contact.classList.toggle('bad', !contact);
      if (!name || !contact) { toast(m.need); return; }
      var title = f.getAttribute('data-title');
      var text = m.req + ': ' + title + '\\n' + m.name + ': ' + name + '\\n' + m.contact + ': ' + contact + (comment ? '\\n' + m.comment + ': ' + comment : '') + '\\n' + m.src + ': ' + src;
      var kind = b.getAttribute('data-kind'), href = b.getAttribute('data-href'), val = b.getAttribute('data-val');
      if (kind === 'whatsapp') return open(href + '?text=' + encodeURIComponent(text));
      if (kind === 'email') return open(href + '?subject=' + encodeURIComponent(m.req + ': ' + title) + '&body=' + encodeURIComponent(text));
      if (kind === 'phone') return open(href);
      copy(text);
      if (kind === 'wechat') { toast(m.pasted + ' · ' + m.wechat + ' ' + val); return; }
      toast(m.pasted); setTimeout(function () { open(href); }, 600);
    });
  });
})();
</script>
</body>
</html>`;
}

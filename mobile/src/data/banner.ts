// Баннеры для соцсетей (решение пользователя 21.10.2026): один набор текстов и фото — шесть форматов. Рисуются на canvas
// в браузере: то, что видно в предпросмотре, и есть PNG, который скачивается. Три стиля (BannerStyle) сами
// перестраиваются под вытянутые (пост, Stories, квадрат) и широкие (ВКонтакте, Telegram, Facebook) форматы;
// у Stories текст не заходит в верхние и нижние 250 px — их закрывают кнопки соцсети. Арабский — справа налево.
import type { Lang } from '@/i18n';

import { isLight, mix } from './banner-color';
import type { BannerStyle, Format, PhotoRef } from './sale';

export { isLight };

export type BannerInput = {
  fmt: Format;
  style: BannerStyle;
  lang: Lang;
  photo?: { src: string; ref: PhotoRef };
  logo?: string;
  short: string;
  orgName: string;
  accent: string;
  title: string;
  /** Даты · маршрут. */
  sub: string;
  badge: string;
  cta: string;
  price: string;
};

const DISPLAY = 'SofiaSansExtraCondensed_800ExtraBold, "Noto Sans SC", "Noto Sans Arabic", "Noto Sans Devanagari", "Arial Narrow", sans-serif';
const BOLD = 'Inter_700Bold, "Noto Sans SC", "Noto Sans Arabic", "Noto Sans Devanagari", Arial, sans-serif';
const SEMI = 'Inter_600SemiBold, "Noto Sans SC", "Noto Sans Arabic", "Noto Sans Devanagari", Arial, sans-serif';

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(src: string): Promise<HTMLImageElement> {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    imgCache.set(src, p);
  }
  return p;
}
let fontsReady: Promise<unknown> | null = null;
const fonts = () => (fontsReady ??= Promise.all(['40px SofiaSansExtraCondensed_800ExtraBold', '20px Inter_700Bold', '20px Inter_600SemiBold'].map((f) => document.fonts?.load(f).catch(() => null))));

type Ctx = CanvasRenderingContext2D;
function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
/** Фото «по размеру области»: точка интереса остаётся в кадре, приближение — от 1 до 2. */
function cover(c: Ctx, img: HTMLImageElement, ref: PhotoRef, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height) * Math.max(1, ref.zoom || 1);
  const sw = w / k, sh = h / k;
  const sx = Math.min(Math.max(0, ref.fx * img.width - sw / 2), img.width - sw);
  const sy = Math.min(Math.max(0, ref.fy * img.height - sh / 2), img.height - sh);
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
/** Перенос по словам; китайский — по знакам. */
function wrap(c: Ctx, text: string, maxW: number): string[] {
  const words = /[　-鿿]/.test(text) ? [...text] : text.split(/\s+/);
  const join = /[　-鿿]/.test(text) ? '' : ' ';
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + join + w : w;
    if (c.measureText(next).width <= maxW || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
/** Самый крупный кегль, при котором текст влезает в maxLines строк. */
function fitText(c: Ctx, text: string, family: string, start: number, min: number, maxW: number, maxLines: number) {
  let size = start;
  for (;;) {
    c.font = `${size}px ${family}`;
    const lines = wrap(c, text, maxW);
    if ((lines.length <= maxLines && lines.every((l) => c.measureText(l).width <= maxW)) || size <= min) return { size, lines: lines.slice(0, maxLines) };
    size = Math.round(size * 0.93);
  }
}

export async function renderBanner(b: BannerInput, scale = 1): Promise<HTMLCanvasElement> {
  await fonts();
  const [photo, logo] = await Promise.all([b.photo ? loadImg(b.photo.src).catch(() => undefined) : undefined, b.logo ? loadImg(b.logo).catch(() => undefined) : undefined]);
  const W = b.fmt.w, H = b.fmt.h;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * scale);
  cv.height = Math.round(H * scale);
  // язык текста нужен шрифту: без него Sofia Sans рисует болгарские «в», «д», «т»; у казахского — русские формы
  const shapeLang = b.lang === 'kk' ? 'ru' : b.lang;
  cv.setAttribute('lang', shapeLang);
  cv.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden';
  document.body.appendChild(cv);
  const c = cv.getContext('2d')!;
  (c as unknown as { lang?: string }).lang = shapeLang;
  c.scale(scale, scale);
  const rtl = b.lang === 'ar';
  c.direction = rtl ? 'rtl' : 'ltr';
  const wide = W / H > 1.2;
  const story = H / W > 1.6;
  const accent = b.accent || '#1a73e8';
  const deep = mix(accent, 0, 0.45);
  const onAccent = isLight(accent) ? '#0f1b2d' : '#ffffff';
  const u = wide ? H / 628 : W / 1080;
  const pad = Math.round((wide ? 52 : 64) * u);
  const safeTop = story ? 250 : 0, safeBottom = story ? 280 : 0;

  // ——— области: фото и текст ———
  type Box = { x: number; y: number; w: number; h: number };
  let photoBox: Box = { x: 0, y: 0, w: W, h: H };
  let textBox: Box;
  let panel: Box | null = null;
  let panelColor = '';
  let light = false; // текст тёмный на светлом фоне
  if (b.style === 'photo') {
    textBox = wide ? { x: pad, y: pad, w: W * 0.6 - pad, h: H - pad * 2 } : { x: pad, y: pad + safeTop, w: W - pad * 2, h: H - pad * 2 - safeTop - safeBottom };
  } else if (b.style === 'panel') {
    if (wide) {
      const pw = Math.round(W * 0.52);
      panel = { x: rtl ? W - pw : 0, y: 0, w: pw, h: H };
      photoBox = { x: rtl ? 0 : pw - 40 * u, y: 0, w: W - pw + 40 * u, h: H };
      textBox = { x: panel.x + pad, y: pad, w: pw - pad * 2, h: H - pad * 2 };
    } else {
      const ph = Math.round(H * (story ? 0.5 : 0.52));
      photoBox = { x: 0, y: 0, w: W, h: ph + 60 * u };
      panel = { x: 0, y: ph, w: W, h: H - ph };
      textBox = { x: pad, y: ph + pad * 0.8, w: W - pad * 2, h: H - ph - pad * 1.6 - safeBottom };
    }
    panelColor = accent;
    light = isLight(accent);
  } else {
    light = true;
    panelColor = '#f4f6fa';
    if (wide) {
      const iw = Math.round(W * 0.44);
      photoBox = { x: rtl ? pad * 0.6 : W - iw - pad * 0.6, y: pad * 0.6, w: iw, h: H - pad * 1.2 };
      textBox = { x: rtl ? iw + pad * 1.4 : pad, y: pad, w: W - iw - pad * 2.6, h: H - pad * 2 };
    } else {
      const ih = Math.round(H * (story ? 0.44 : 0.5));
      photoBox = { x: pad * 0.6, y: pad * 0.6 + safeTop * 0.6, w: W - pad * 1.2, h: ih };
      textBox = { x: pad, y: photoBox.y + ih + pad * 0.8, w: W - pad * 2, h: H - (photoBox.y + ih + pad * 0.8) - pad - safeBottom };
    }
  }

  // ——— фон и фото ———
  c.fillStyle = b.style === 'split' ? panelColor : deep;
  c.fillRect(0, 0, W, H);
  c.save();
  if (b.style === 'split') { rr(c, photoBox.x, photoBox.y, photoBox.w, photoBox.h, 36 * u); c.clip(); }
  if (photo && b.photo) {
    cover(c, photo, b.photo.ref, photoBox.x, photoBox.y, photoBox.w, photoBox.h);
    if (b.photo.ref.dim > 0) { c.fillStyle = `rgba(0,0,0,${b.photo.ref.dim})`; c.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h); }
  } else {
    // без фото — градиент бренда и линия маршрута
    const g = c.createLinearGradient(photoBox.x, photoBox.y, photoBox.x + photoBox.w, photoBox.y + photoBox.h);
    g.addColorStop(0, mix(accent, 255, 0.12));
    g.addColorStop(1, deep);
    c.fillStyle = g;
    c.fillRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 10 * u;
    c.setLineDash([2 * u, 28 * u]);
    c.lineCap = 'round';
    const { x, y, w, h } = photoBox;
    c.beginPath();
    c.moveTo(x + w * 0.12, y + h * 0.82);
    c.bezierCurveTo(x + w * 0.45, y + h * 0.95, x + w * 0.35, y + h * 0.35, x + w * 0.88, y + h * 0.2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    for (const [px, py] of [[0.12, 0.82], [0.88, 0.2]]) { c.beginPath(); c.arc(x + w * px, y + h * py, 22 * u, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
  if (b.style === 'photo') {
    // затемнение под текстом, чтобы читалось на любом фото
    const g = wide ? c.createLinearGradient(rtl ? W : 0, 0, rtl ? W * 0.2 : W * 0.8, 0) : c.createLinearGradient(0, H, 0, H * 0.25);
    g.addColorStop(0, 'rgba(8,14,26,0.86)');
    g.addColorStop(0.55, 'rgba(8,14,26,0.55)');
    g.addColorStop(1, 'rgba(8,14,26,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const top = c.createLinearGradient(0, 0, 0, H * 0.22 + safeTop);
    top.addColorStop(0, 'rgba(8,14,26,0.5)');
    top.addColorStop(1, 'rgba(8,14,26,0)');
    c.fillStyle = top;
    c.fillRect(0, 0, W, H * 0.22 + safeTop);
  }
  if (panel) {
    c.fillStyle = panelColor;
    if (wide) {
      c.beginPath();
      if (rtl) { c.moveTo(W, 0); c.lineTo(panel.x - 40 * u, 0); c.quadraticCurveTo(panel.x + 30 * u, H / 2, panel.x - 40 * u, H); c.lineTo(W, H); }
      else { c.moveTo(0, 0); c.lineTo(panel.w + 40 * u, 0); c.quadraticCurveTo(panel.w - 30 * u, H / 2, panel.w + 40 * u, H); c.lineTo(0, H); }
      c.fill();
    } else {
      rr(c, 0, panel.y, W, panel.h + 60 * u, 56 * u);
      c.fill();
    }
  }

  const ink = light ? '#0f1b2d' : '#ffffff';
  const muted = light ? 'rgba(15,27,45,0.72)' : 'rgba(255,255,255,0.86)';
  const X = (x: number, w = 0) => (rtl ? W - x - w : x);
  c.textBaseline = 'alphabetic';
  c.textAlign = rtl ? 'right' : 'left';
  const shadow = (on: boolean) => { c.shadowColor = on ? 'rgba(0,0,0,0.35)' : 'transparent'; c.shadowBlur = on ? 18 * u : 0; c.shadowOffsetY = on ? 2 * u : 0; };

  // ——— логотип организатора: белая плашка с логотипом или монограммой и названием ———
  const logoBox = b.style === 'photo' ? { x: textBox.x, y: wide ? pad : pad + safeTop } : b.style === 'panel' ? (wide ? { x: textBox.x, y: pad } : { x: pad, y: pad }) : { x: textBox.x, y: textBox.y };
  const lh = Math.round(64 * u);
  c.font = `${Math.round(26 * u)}px ${BOLD}`;
  const name = b.orgName.length > 28 ? `${b.orgName.slice(0, 27)}…` : b.orgName;
  const nameW = c.measureText(name).width;
  const markW = logo ? Math.min(lh * 2.4, (logo.width / logo.height) * (lh - 16 * u)) : lh - 16 * u;
  const pillW = 10 * u + markW + 14 * u + nameW + 22 * u;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.18)'; c.shadowBlur = 20 * u; c.shadowOffsetY = 4 * u;
  c.fillStyle = '#ffffff';
  rr(c, X(logoBox.x, pillW), logoBox.y, pillW, lh, lh / 2);
  c.fill();
  c.restore();
  const mx = rtl ? W - logoBox.x - 10 * u - markW : logoBox.x + 10 * u;
  if (logo) c.drawImage(logo, mx, logoBox.y + 8 * u, markW, lh - 16 * u);
  else {
    c.fillStyle = accent;
    c.beginPath(); c.arc(mx + markW / 2, logoBox.y + lh / 2, markW / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = onAccent;
    c.font = `${Math.round(22 * u)}px ${BOLD}`;
    c.textAlign = 'center';
    c.fillText(b.short.slice(0, 3), mx + markW / 2, logoBox.y + lh / 2 + 8 * u);
    c.textAlign = rtl ? 'right' : 'left';
  }
  c.fillStyle = '#0f1b2d';
  c.font = `${Math.round(26 * u)}px ${BOLD}`;
  c.fillText(name, rtl ? W - logoBox.x - 10 * u - markW - 14 * u : logoBox.x + 10 * u + markW + 14 * u, logoBox.y + lh / 2 + 9 * u);

  // ——— снизу вверх: кнопка, цена, даты и маршрут, заголовок, акцент ———
  const tb = textBox;
  const ctaH = Math.round(84 * u);
  const ctaFont = Math.round(32 * u);
  c.font = `${ctaFont}px ${BOLD}`;
  const arrow = rtl ? '←' : '→';
  const ctaText = `${b.cta.trim() || '…'}  ${arrow}`;
  const ctaW = Math.min(tb.w, c.measureText(ctaText).width + 64 * u);
  let y = tb.y + tb.h;
  const ctaY = y - ctaH;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.22)'; c.shadowBlur = 24 * u; c.shadowOffsetY = 6 * u;
  c.fillStyle = b.style === 'panel' ? (light ? '#0f1b2d' : '#ffffff') : accent;
  rr(c, X(tb.x, ctaW), ctaY, ctaW, ctaH, ctaH / 2);
  c.fill();
  c.restore();
  c.fillStyle = b.style === 'panel' ? (light ? '#ffffff' : accent) : onAccent;
  c.textAlign = 'center';
  c.fillText(ctaText, X(tb.x, ctaW) + ctaW / 2, ctaY + ctaH / 2 + ctaFont * 0.36, ctaW - 32 * u);
  c.textAlign = rtl ? 'right' : 'left';
  y = ctaY - 30 * u;

  const tx = rtl ? W - tb.x : tb.x;
  shadow(b.style === 'photo');
  if (b.price.trim()) {
    c.font = `${Math.round(30 * u)}px ${BOLD}`;
    c.fillStyle = ink;
    c.fillText(b.price.trim(), tx, y, tb.w);
    y -= 44 * u;
  }
  if (b.sub.trim()) {
    const s = fitText(c, b.sub.trim(), SEMI, Math.round(34 * u), Math.round(22 * u), tb.w, 2);
    c.fillStyle = muted;
    for (let k = s.lines.length - 1; k >= 0; k--) { c.fillText(s.lines[k], tx, y, tb.w); y -= s.size * 1.28; }
    y -= 10 * u;
  }
  // заголовок занимает оставшееся место, но не выше акцента
  const badgeH = b.badge.trim() ? Math.round(56 * u) : 0;
  const topLimit = (b.style === 'split' ? logoBox.y + lh + 24 * u : b.style === 'panel' && !wide ? tb.y : logoBox.y + lh + 30 * u) + (badgeH ? badgeH + 22 * u : 0);
  const room = y - topLimit;
  const maxLines = story ? 5 : wide ? 3 : 4;
  const t = fitText(c, b.title.trim() || '…', DISPLAY, Math.round((wide ? 92 : story ? 132 : 120) * u), Math.round(40 * u), tb.w, maxLines);
  let size = t.size;
  let lines = t.lines;
  while (lines.length * size * 0.98 > room && size > 40 * u) {
    const f = fitText(c, b.title.trim(), DISPLAY, Math.round(size * 0.92), Math.round(36 * u), tb.w, maxLines);
    size = f.size; lines = f.lines;
    if (size <= 36 * u) break;
  }
  c.font = `${size}px ${DISPLAY}`;
  c.fillStyle = ink;
  for (let k = lines.length - 1; k >= 0; k--) { c.fillText(lines[k], tx, y, tb.w); y -= size * 0.98; }
  shadow(false);

  if (badgeH) {
    c.font = `${Math.round(26 * u)}px ${BOLD}`;
    const bt = b.badge.trim().toUpperCase();
    const bw = Math.min(tb.w, c.measureText(bt).width + 40 * u);
    const by = y - badgeH + size * 0.12 - 8 * u;
    c.fillStyle = b.style === 'panel' ? (light ? '#0f1b2d' : 'rgba(255,255,255,0.18)') : accent;
    rr(c, X(tb.x, bw), by, bw, badgeH, badgeH / 2);
    c.fill();
    c.fillStyle = b.style === 'panel' ? '#ffffff' : onAccent;
    c.textAlign = 'center';
    c.fillText(bt, X(tb.x, bw) + bw / 2, by + badgeH / 2 + 9 * u, bw - 24 * u);
    c.textAlign = rtl ? 'right' : 'left';
  }
  cv.remove();
  cv.removeAttribute('style');
  return cv;
}

/** PNG для скачивания. */
export const pngBytes = (cv: HTMLCanvasElement) => new Promise<Uint8Array>((res, rej) => cv.toBlob((bl) => (bl ? bl.arrayBuffer().then((a) => res(new Uint8Array(a)), rej) : rej(new Error('no blob'))), 'image/png'));
/** Картинка для предпросмотра (меньше и легче). */
export async function bannerPreview(b: BannerInput, width = 540): Promise<string> {
  const cv = await renderBanner(b, width / b.fmt.w);
  return cv.toDataURL('image/jpeg', 0.86);
}

// Языки интерфейса (решение пользователя 21.10.2026): русский, английский, китайский, казахский, арабский, хинди.
// Ключ перевода — сама русская фраза: __('Создать кабинет'), __('Шаг {a} из {b}', { a, b }). Нет перевода — русская фраза.
// Язык выбирают при первом запуске и в «Настройках»; смена перезапускает приложение (арабский — справа налево).
// Новые фразы: обернуть в __() (имя как у gettext; t занято организатором), затем `node tools/i18n-keys.mjs`
// покажет, чего не хватает в словарях.
import { I18nManager, Platform } from 'react-native';

import { readPref, reloadApp, writePref } from '@/ui/prefs';

import ar from './ar.json';
import en from './en.json';
import hi from './hi.json';
import kk from './kk.json';
import zh from './zh.json';

export type Lang = 'ru' | 'en' | 'zh' | 'kk' | 'ar' | 'hi';
/** Код, название на самом языке и по-русски. */
export const LANGS: [Lang, string, string][] = [
  ['ru', 'Русский', 'русский'], ['en', 'English', 'английский'], ['zh', '中文', 'китайский'],
  ['kk', 'Қазақша', 'казахский'], ['ar', 'العربية', 'арабский'], ['hi', 'हिन्दी', 'хинди'],
];
const isLang = (x: string | null): x is Lang => !!x && LANGS.some(([c]) => c === x);
/** Язык устройства — подсказка на экране выбора при первом запуске. */
function deviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
    return isLang(loc) ? loc : 'ru';
  } catch {
    return 'ru';
  }
}
const saved = readPref('lang');
/** Язык уже выбран (иначе при первом запуске показываем выбор). */
export const LANG_CHOSEN = isLang(saved);
export const LANG: Lang = isLang(saved) ? saved : deviceLang();
export const RTL = LANG === 'ar';
/** Локаль для дат и чисел. */
export const LOCALE: Record<Lang, string> = { ru: 'ru-RU', en: 'en-GB', zh: 'zh-CN', kk: 'kk-KZ', ar: 'ar', hi: 'hi-IN' };

const DICT: Record<Exclude<Lang, 'ru'>, Record<string, string>> = { en, zh, kk, ar, hi };

export function __(ru: string, vars?: Record<string, string | number | undefined>): string {
  const s = LANG === 'ru' ? ru : DICT[LANG][ru] || ru;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m)) : s;
}

/** Выбрать язык: сохраняем и перезапускаем; арабский включает письмо справа налево. */
export function setLang(l: Lang, reload = true) {
  writePref('lang', l);
  if (Platform.OS !== 'web') { I18nManager.allowRTL(l === 'ar'); I18nManager.forceRTL(l === 'ar'); }
  if (reload) reloadApp();
}

// в браузере направление письма и язык страницы — сразу при запуске
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = RTL ? 'rtl' : 'ltr';
  document.documentElement.lang = LANG;
}

// Казахского нет в части браузеров и телефонов (Intl тогда пишет даты по-английски) — свои названия месяцев и дней.
const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const KK_DAYS = ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'];
const OWN_DATES = LANG === 'kk' && (() => {
  try { return Intl.DateTimeFormat.supportedLocalesOf([LOCALE.kk]).length === 0; } catch { return true; }
})();

/** Дата «пн, 16 ноября» на языке интерфейса. */
export function dayLabel(d: Date) {
  if (OWN_DATES) return `${KK_DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${KK_MONTHS[d.getUTCMonth()]}`;
  try {
    return new Intl.DateTimeFormat(LOCALE[LANG], { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
/** «16–19 ноября 2026» / «16–19 November 2026». */
export function rangeLabel(a: Date, b: Date) {
  if (OWN_DATES) {
    const [ma, mb] = [KK_MONTHS[a.getUTCMonth()], KK_MONTHS[b.getUTCMonth()]];
    return `${b.getUTCFullYear()} жылғы ${ma === mb ? `${a.getUTCDate()}–${b.getUTCDate()} ${mb}` : `${a.getUTCDate()} ${ma} – ${b.getUTCDate()} ${mb}`}`;
  }
  try {
    const f = new Intl.DateTimeFormat(LOCALE[LANG], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return (f as Intl.DateTimeFormat & { formatRange?: (x: Date, y: Date) => string }).formatRange?.(a, b) ?? `${f.format(a)} – ${f.format(b)}`;
  } catch {
    return `${a.toISOString().slice(0, 10)} – ${b.toISOString().slice(0, 10)}`;
  }
}

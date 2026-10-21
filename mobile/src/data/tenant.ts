// White label (решение 21.10.2026: «давай начнём делать»). Организатор поездок — клиент платформы: у него свой бренд
// (название, монограмма, цвета, координатор), рыночный пакет (страна, откуда едут участники) и регион хранения данных.
// Участник попадает к своему организатору по коду приглашения; первый организатор — сам GTT. Разбор — docs/market-research.md.
// Конструктор (/builder, решение 21.10.2026): организатор сам задаёт название, логотип, цвет и собирает экран из блоков.
import type { IconName } from '@/ui/icon-paths';
import { C, DARK, GLOW, SH } from '@/ui/theme';
import { __ } from '@/i18n';

/** Где хранятся данные участников клиента: Россия (152-ФЗ), Китай, Казахстан, ЕС, Ближний Восток, США. */
export type DataRegion = 'ru' | 'cn' | 'kz' | 'eu' | 'me' | 'us';
export const REGION_RU: Record<DataRegion, string> = { ru: __('Россия'), cn: __('Китай'), kz: __('Казахстан'), eu: __('Евросоюз'), me: __('Ближний Восток'), us: __('США') };

/** Блоки экрана «Сегодня» — организатор включает нужные и ставит в своём порядке. */
export type TodayBlock = 'now' | 'next' | 'ann' | 'tools' | 'coord' | 'weather' | 'route';
export const TODAY_BLOCKS: [TodayBlock, string, string][] = [
  ['now', __('Сейчас'), __('ближайшее событие, «Я в автобусе», такси')],
  ['next', __('Дальше сегодня'), __('лента времени с логотипами компаний')],
  ['ann', __('Объявление координатора'), __('последнее сообщение для группы')],
  ['tools', __('Под рукой'), __('плитки быстрых действий')],
  ['coord', __('Координатор'), __('написать и позвонить')],
  ['weather', __('Погода и отель'), __('прогноз и адрес отеля')],
  ['route', __('Маршрут поездки'), __('схема городов')],
];
/** Плитки «Под рукой»: ключ, подпись, значок, экран. */
export type ToolKey = 'translator' | 'docs' | 'help' | 'expenses' | 'city' | 'guide' | 'cards' | 'chat';
export const TOOLS: [ToolKey, string, IconName, string][] = [
  ['translator', __('Переводчик'), 'translate', '/translator'], ['docs', __('Документы'), 'passport', '/docs'], ['help', __('Помощь'), 'help', '/help'],
  ['expenses', __('Расходы'), 'receipt', '/expenses'], ['city', __('Город'), 'map', '/city'], ['guide', __('Гид'), 'headphones', '/guide'],
  ['cards', __('Визитки'), 'card', '/cards'], ['chat', __('Чат'), 'chat', '/chat'],
];
const ALL_BLOCKS = TODAY_BLOCKS.map(([key]) => ({ key, on: true }));
const BASE_TOOLS: ToolKey[] = ['translator', 'docs', 'help', 'expenses', 'city', 'guide'];

export type Tenant = {
  id: string;
  name: string;
  /** Монограмма на заставке и в шапке. */
  short: string;
  tagline: string;
  /** Код приглашения, по которому участник открывает поездки организатора. */
  code: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  heroFrom: string;
  heroTo: string;
  /** accent в виде «r, g, b» — для теней. */
  rgb: string;
  /** Объёмные значки вкладок — свой набор есть только у GTT; у остальных контурные в цвете бренда. */
  icons3d: boolean;
  coordinator: { name: string; initials: string };
  /** Рыночный пакет: страна, откуда едут участники (язык, валюта отчёта, мессенджеры). Пока только Россия. */
  home: 'ru';
  region: DataRegion;
  /** Пример бренда для показа клиентам, а не настоящий организатор. */
  demo?: boolean;
  /** Логотип, загруженный в конструкторе (data: URI), — вместо монограммы. */
  logo?: string;
  /** Телефон координатора для кнопки «Позвонить». */
  phone?: string;
  /** Блоки «Сегодня» в порядке показа; on: false — блок скрыт. */
  blocks: { key: TodayBlock; on: boolean }[];
  tools: ToolKey[];
  /** Необязательные вкладки делегата. */
  tabs: { library: boolean; people: boolean };
  /** Создан в конструкторе (можно менять и удалять). */
  custom?: boolean;
};

export const TENANTS: Tenant[] = [
  {
    id: 'gtt', name: 'Global Tech Tour', short: 'GTT', tagline: __('Экспедиции к лидерам технологий'), code: 'GTT',
    accent: '#1a73e8', accentInk: '#1558b8', accentSoft: '#dde8fb', heroFrom: '#2b80f2', heroTo: '#0f4fc0', rgb: '26, 115, 232',
    icons3d: true, coordinator: { name: __('Остап Доценко'), initials: __('ОД') }, home: 'ru', region: 'ru',
    blocks: ALL_BLOCKS, tools: BASE_TOOLS, tabs: { library: true, people: true },
  },
  {
    id: 'demo', name: __('Ваш бренд'), short: __('ВБ'), tagline: __('Так выглядит приложение под брендом организатора'), code: 'DEMO',
    accent: '#0f8a6c', accentInk: '#0b6b54', accentSoft: '#d6efe7', heroFrom: '#1aa585', heroTo: '#0b6b54', rgb: '15, 138, 108',
    icons3d: false, coordinator: { name: __('Мария Иванова'), initials: __('МИ') }, home: 'ru', region: 'ru', demo: true,
    blocks: ALL_BLOCKS, tools: ['translator', 'docs', 'help', 'chat', 'expenses', 'cards'], tabs: { library: true, people: true },
  },
];

/** Текущий организатор. Меняется на месте (как данные поездки в active.ts), экраны пересобираются через gen в _layout. */
export const TENANT: Tenant = { ...TENANTS[0] };

/** Организаторы из конструктора. Пока сервера нет, хранятся на телефоне (ключ tenants.custom); с сервером — в его базе. */
let CUSTOM: Tenant[] = [];
export const setCustomTenants = (list: Tenant[] | undefined) => { CUSTOM = list || []; };
export const allTenants = () => [...TENANTS, ...CUSTOM];
export const tenantByCode = (code: string) => allTenants().find((t) => t.code.toLowerCase() === code.trim().toLowerCase());

// ——— цвет бренда из одного HEX ———
const hexRgb = (hex: string) => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b.at(i)! - v) * k);
export const isHex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s.trim());
/** Из основного цвета — тёмный для текста, светлый для фона кнопок, градиент карточки «Сейчас» и rgb для теней. */
export function deriveBrand(hex: string) {
  const c = hexRgb(hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`);
  return {
    accent: toHex(c), accentInk: toHex(mix(c, [0, 0, 0], 0.22)), accentSoft: toHex(mix(c, [238, 242, 248], 0.84)),
    heroFrom: toHex(mix(c, [255, 255, 255], 0.12)), heroTo: toHex(mix(c, [0, 0, 0], 0.3)), rgb: c.map(Math.round).join(', '),
  };
}
/** Готовые цвета в конструкторе. */
export const PALETTE = ['#1a73e8', '#0f8a6c', '#7048e8', '#c2255c', '#e8590c', '#0c8599', '#2b2f3a', '#b08900'];
/** Код приглашения из названия: латиница и цифры. */
export function suggestCode(name: string) {
  const map: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' };
  const lat = name.toLowerCase().split('').map((ch) => map[ch] ?? ch).join('').replace(/[^a-z0-9]/g, '').toUpperCase();
  return (lat.length >= 3 ? lat : `${lat}TRIP`).slice(0, 8);
}
/** Свободный код из названия: «AZIYABIZ», занят — «AZIYABI2»… */
export function uniqueCode(name: string, selfId = '') {
  const base = suggestCode(name);
  let code = base;
  for (let i = 2; allTenants().some((x) => x.id !== selfId && x.code === code); i++) code = `${base.slice(0, 7)}${i}`;
  return code;
}
/** Новый организатор с настройками по умолчанию — заготовка конструктора. */
export function blankTenant(): Tenant {
  return {
    id: `t${Date.now()}`, name: '', short: '', tagline: __('Деловые поездки'), code: '', ...deriveBrand(PALETTE[2]),
    icons3d: false, coordinator: { name: '', initials: '' }, home: 'ru', region: 'ru',
    blocks: ALL_BLOCKS.map((b) => ({ ...b })), tools: [...BASE_TOOLS], tabs: { library: true, people: true }, custom: true,
  };
}

/** Включает бренд организатора: цвета и тени темы берутся из него. Возвращает id, который сохраняется на телефоне. */
export function applyTenant(id: string | null | undefined) {
  const t = allTenants().find((x) => x.id === id) || TENANTS[0];
  Object.assign(TENANT, t);
  // в тёмной теме акцент чуть светлее, текст акцентом — светлый, подложка кнопок — тёмная с оттенком бренда
  const a = hexRgb(t.accent);
  const brand = DARK
    ? { blue: toHex(mix(a, [255, 255, 255], 0.12)), blueInk: toHex(mix(a, [255, 255, 255], 0.4)), blueSoft: toHex(mix(a, hexRgb(C.card), 0.78)) }
    : { blue: t.accent, blueInk: t.accentInk, blueSoft: t.accentSoft };
  Object.assign(C as unknown as Record<string, string>, { ...brand, heroFrom: t.heroFrom, heroTo: t.heroTo });
  Object.assign(SH as unknown as Record<string, string>, {
    blue: `0px 8px 16px rgba(${t.rgb}, 0.32), inset -2px -3px 6px rgba(0, 0, 0, 0.12), inset 2px 2px 5px rgba(255, 255, 255, 0.25)`,
    hero: `0px 14px 30px rgba(${t.rgb}, 0.32), -6px -6px 16px ${GLOW}`,
  });
  return t.id;
}

// Кабинет организатора (решение 21.10.2026: «пустой кабинет», загрузка программ из Excel, PDF, Word и вручную, работа с
// любого устройства). У каждого организатора свои программы, поездки и участники — программ и поездок GTT у него нет.
// До сервера всё лежит на этом устройстве (ключ org.<id организатора>); с сервером — в его базе, у каждого клиента своё.
import { peekStored, putStored } from '@/state/store';

import { COUNTRIES, countryOf } from './countries';
import type { TripData } from './demo-trip';
import { CITIES } from './geo';
import { fromMin, plural, toMin, type Leg as CoordLeg, type Visit } from './group';
import { programRoute } from './map-route';
import type { Leg as RouteLeg, Stop } from './route';
import type { Tenant } from './tenant';
import type { EventKind, TripEvent } from './trip';
import type { Culture, Hotel, Meal, Weather } from './trip-base';
import { LANG, __, dayLabel, rangeLabel } from '@/i18n';

export type OEvent = { id: string; t: string; name: string; place: string; kind: EventKind };
export type ODay = { city: string; note: string; events: OEvent[] };
export type Source = 'manual' | 'template' | 'sample' | 'xlsx' | 'docx' | 'pdf' | 'csv';
export type OProgram = { id: string; title: string; country: string; summary: string; days: ODay[]; source: Source; file?: string };
export type OPerson = { id: string; name: string; company: string; role: string; phone: string; email: string; invite: 'new' | 'sent' | 'joined' };
export type OTrip = { id: string; programId: string; title: string; start: string; hotel: string; published: boolean; people: OPerson[] };
export type Org = { contact: { email: string; phone: string; site: string }; programs: OProgram[]; trips: OTrip[]; active: string };

export const SOURCE_RU: Record<Source, string> = {
  manual: __('вручную'), template: __('из шаблона'), sample: __('пример'), xlsx: __('из Excel'), docx: __('из Word'), pdf: __('из PDF'), csv: __('из CSV'),
};
export const KINDS: [EventKind, string][] = [['co', __('Визит')], ['meal', __('Еда')], ['move', __('Переезд')], ['culture', __('Культура')], ['info', __('Другое')]];
export const COUNTRY_LIST = Object.values(COUNTRIES).map((c) => [c.code, __(c.ru)] as [string, string]);
/** Адрес веб-версии платформы: ссылка-приглашение и QR-код ведут сюда (GitHub Pages, .github/workflows/pages.yml). */
export const WEB_URL = 'https://ostap-87.github.io/GTT-PLATFORM';

export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ——— хранение ———
const key = (tid: string) => `org.${tid}`;
export const emptyOrg = (): Org => ({ contact: { email: '', phone: '', site: '' }, programs: [], trips: [], active: '' });
export const orgOf = (tid: string): Org => ({ ...emptyOrg(), ...(peekStored<Org>(key(tid)) || {}) });
export const saveOrg = (tid: string, org: Org) => putStored(key(tid), org);
/** Поездка, которую видят участники: отмеченная, иначе первая опубликованная. */
export const liveTrip = (org: Org) => org.trips.find((x) => x.id === org.active && x.published) || org.trips.find((x) => x.published);

// ——— время, даты, тип события ———
/** «9.30», «9:30», «09-30», «930» → «09:30»; не время — пусто. */
export function normTime(s: string): string {
  const m = String(s).trim().match(/^(\d{1,2})(?:[:.\-h ]?(\d{2}))?$/);
  if (!m) return '';
  const h = Number(m[1]), mi = Number(m[2] || 0);
  return h < 24 && mi < 60 ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : '';
}
const has = (re: RegExp, s: string) => re.test(s.toLowerCase());
/** Тип события по словам: обед, перелёт, музей, визит на завод… */
export function guessKind(text: string): EventKind {
  if (has(/обед|ужин|завтрак|ресторан|ланч|банкет|кофе-брейк|lunch|dinner|breakfast|restaurant/, text)) return 'meal';
  if (has(/перел[её]т|поезд|трансфер|выезд|переезд|вылет|прил[её]т|аэропорт|автобус|заселение|flight|train|transfer|airport|check-in/, text)) return 'move';
  // экскурсия по заводу — визит, а не культурная программа
  if (has(/визит|завод|фабрик|компани|офис|шоурум|производств|встреч|переговор|кампус|лаборатор|выставк|склад|visit|factory|meeting|office|showroom|campus|plant/, text)) return 'co';
  if (has(/экскурси|музей|прогулк|церемони|театр|храм|парк|шоу(?!рум)|culture|museum|tour of|walk/, text)) return 'culture';
  return 'info';
}
const WD = [__('Вс'), __('Пн'), __('Вт'), __('Ср'), __('Чт'), __('Пт'), __('Сб')];
const MONTHS = [__('января'), __('февраля'), __('марта'), __('апреля'), __('мая'), __('июня'), __('июля'), __('августа'), __('сентября'), __('октября'), __('ноября'), __('декабря')];
const day0 = (iso: string) => { const t = Date.parse(`${iso}T00:00:00Z`); return Number.isFinite(t) ? t : Date.UTC(2026, 10, 16); };
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T00:00:00Z`));
/** «16.11.2026» или «2026-11-16» → «2026-11-16»; иначе пусто. */
export function normDate(s: string): string {
  const t = s.trim();
  if (isIsoDate(t)) return t;
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return '';
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : '';
}
export const ruDate = (iso: string) => { const d = new Date(day0(iso)); return `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`; };
export function tripDates(start: string, n: number) {
  const a = new Date(day0(start)), b = new Date(day0(start) + Math.max(0, n - 1) * 86400000);
  if (LANG !== 'ru') return rangeLabel(a, b);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}
export const daysRu = (n: number) => `${n} ${plural(n, __('день'), __('дня'), __('дней'))}`;
export const eventsCount = (p: OProgram) => p.days.reduce((a, d) => a + d.events.length, 0);

// ——— города ———
const cityKey = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').split('/')[0].replace(/ё/g, 'е').trim();
const CITY_KEYS = CITIES.map((c) => ({ c, k: cityKey(c.ru), en: c.en.toLowerCase() }));
/** Город из текста программы — для карты маршрута: «Шанхай», «Куала-Лумпур». */
export const findCity = (s: string) => {
  const k = cityKey(s);
  return k ? CITY_KEYS.find((x) => x.k === k || x.en === k || (k.length > 3 && x.k.startsWith(k)))?.c : undefined;
};
/** Известный город, упомянутый в строке. */
export const cityIn = (line: string) => {
  const l = line.toLowerCase().replace(/ё/g, 'е');
  return CITY_KEYS.find((x) => x.k.length > 2 && l.includes(x.k))?.c;
};

// ——— шаблоны и пример ———
const ev = (t: string, name: string, place: string, kind: EventKind): OEvent => ({ id: uid('e'), t, name, place, kind });
const TPL_CITIES: Record<string, string[]> = {
  cn: [__('Шанхай'), __('Шанхай'), __('Ханчжоу'), __('Шэньчжэнь'), __('Шэньчжэнь')], jp: [__('Токио'), __('Токио'), __('Киото'), __('Осака'), __('Осака')],
  kr: [__('Сеул'), __('Сеул'), __('Сувон'), __('Сеул')], th: [__('Бангкок'), __('Бангкок'), __('Бангкок'), __('Бангкок')], vn: [__('Хошимин'), __('Хошимин'), __('Ханой'), __('Ханой')],
  id: [__('Джакарта'), __('Джакарта'), __('Бандунг'), __('Джакарта')], in: [__('Мумбаи'), __('Мумбаи'), __('Бенгалуру'), __('Бенгалуру')],
  my: [__('Куала-Лумпур'), __('Куала-Лумпур'), __('Пенанг'), __('Куала-Лумпур')], ae: [__('Дубай'), __('Дубай'), __('Абу-Даби'), __('Дубай')],
};
/** Шаблон деловой поездки по стране: каркас дней, компании — заглушки «[уточнить]», их организатор вписывает сам. */
export function templateProgram(country: string): OProgram {
  const c = countryOf(country);
  const cities = TPL_CITIES[c.code] || TPL_CITIES.cn;
  const n = cities.length;
  const days: ODay[] = cities.map((city, i) => {
    if (i === 0) return { city, note: '', events: [ev('14:00', __('Прилёт и трансфер в отель'), __('Встреча в аэропорту'), 'move'), ev('17:00', __('Брифинг поездки'), __('Конференц-зал отеля'), 'info'), ev('19:30', __('Приветственный ужин'), __('Ресторан [уточнить]'), 'meal')] };
    if (i === n - 1) return { city, note: '', events: [ev('10:00', __('Итоговая встреча группы'), __('Отель'), 'info'), ev('12:30', __('Обед'), __('Ресторан [уточнить]'), 'meal'), ev('16:00', __('Трансфер в аэропорт'), __('Вылет домой'), 'move')] };
    const moved = city !== cities[i - 1];
    return {
      city, note: '', events: [
        moved ? ev('08:00', __('Переезд: {a} → {b}', { a: cities[i - 1], b: city }), __('Поезд или перелёт [уточнить]'), 'move') : ev('09:00', __('Выезд из отеля'), __('Лобби · автобус группы'), 'move'),
        ev(moved ? '11:00' : '10:00', __('Визит на производство'), __('[уточнить компанию]'), 'co'),
        ev('13:00', __('Обед'), __('Ресторан [уточнить]'), 'meal'),
        ev('15:00', __('Встреча с руководством компании'), __('[уточнить компанию]'), 'co'),
        ...(i === 1 ? [ev('18:00', __('Прогулка по городу'), __('Культурная программа'), 'culture')] : []),
        ev('19:30', __('Ужин группы'), __('Ресторан [уточнить]'), 'meal'),
      ],
    };
  });
  return { id: uid('p'), title: __('Деловая поездка — {a}: производство и инновации', { a: c.ru }), country: c.code, summary: __('Шаблон: замените заглушки [уточнить] на свои компании, рестораны и время.'), days, source: 'template' };
}

/** «Пример поездки» для пустого кабинета — компании и люди вымышленные. */
export function sampleProgram(): OProgram {
  return {
    id: uid('p'), title: __('Пример: умное производство Китая'), country: 'cn', source: 'sample',
    summary: __('Пример с вымышленными компаниями — посмотрите, как поездка выглядит у участников, и замените на свою.'),
    days: [
      { city: __('Шанхай'), note: __('Пример'), events: [ev('14:00', __('Прилёт и трансфер в отель'), __('Аэропорт Пудун → отель'), 'move'), ev('17:30', __('Брифинг поездки'), __('Конференц-зал отеля'), 'info'), ev('19:30', __('Приветственный ужин'), __('Ресторан шанхайской кухни'), 'meal')] },
      { city: __('Шанхай'), note: '', events: [ev('09:00', __('Выезд из отеля'), __('Лобби · автобус группы'), 'move'), ev('10:00', __('Завод «Пример Электроникс»'), __('Сборка электроники, экскурсия по цехам'), 'co'), ev('13:00', __('Обед'), __('Ресторан рядом с заводом'), 'meal'), ev('15:00', __('Логистический центр «Пример Логистик»'), __('Роботизированный склад'), 'co'), ev('19:00', __('Прогулка по набережной Бунд'), __('Культурная программа · 1,5 часа'), 'culture')] },
      { city: __('Ханчжоу'), note: '', events: [ev('08:30', __('Поезд в Ханчжоу'), __('Скоростной поезд · 1 час'), 'move'), ev('11:00', __('Кампус «Пример Технолоджи»'), __('Шоурум и встреча с командой'), 'co'), ev('13:30', __('Обед'), __('Ханчжоуская кухня'), 'meal'), ev('15:30', __('Чайная церемония'), __('Культурная программа · 1 час'), 'culture'), ev('19:30', __('Ужин группы'), __('Ресторан у озера'), 'meal')] },
      { city: __('Ханчжоу'), note: '', events: [ev('10:00', __('Итоговая встреча группы'), __('Отель'), 'info'), ev('12:30', __('Обед'), __('Ресторан отеля'), 'meal'), ev('16:00', __('Трансфер в аэропорт'), __('Вылет домой'), 'move')] },
    ],
  };
}
const SAMPLE_PEOPLE: [string, string, string][] = [
  [__('Иван Петров'), __('Пример Ритейл'), __('Коммерческий директор')], [__('Ольга Сидорова'), __('Пример Логистика'), __('Директор по логистике')],
  [__('Пётр Иванов'), __('Пример Производство'), __('Генеральный директор')], [__('Анна Кузнецова'), __('Пример Инвест'), __('Партнёр')],
  [__('Максим Орлов'), __('Пример Дистрибуция'), __('Директор по закупкам')], [__('Елена Морозова'), __('Пример Маркет'), __('Руководитель e-commerce')],
];
export const samplePeople = (): OPerson[] => SAMPLE_PEOPLE.map(([name, company, role], i) => ({ id: uid('u'), name, company, role, phone: '', email: '', invite: i < 4 ? 'joined' : 'sent' }));
export const newTrip = (p: OProgram, start: string): OTrip => ({ id: uid('t'), programId: p.id, title: p.title, start, hotel: '', published: false, people: [] });
/** Пример целиком: программа, поездка с вымышленными участниками, открыта участникам. */
export function addSample(org: Org): Org {
  const p = sampleProgram();
  const t = { ...newTrip(p, '2026-11-16'), published: true, people: samplePeople() };
  return { ...org, programs: [...org.programs, p], trips: [...org.trips, t], active: org.active || t.id };
}

// ——— поездка организатора в формате приложения участника (как data/demo-trip.ts для программ сайта) ———
const NO_WEATHER: Weather = { icon: 'cloud', max: '', min: '', text: __('Прогноз появится за неделю до поездки') };
/** «в Шанхай», «в Москву»: падеж нужен только русской фразе «Переезд в …». */
const toCity = (ru: string) => (LANG === 'ru' ? ru.replace(/([^аеёиоуыэюя])а$/, '$1у').replace(/я$/, 'ю') : ru);

export function buildOrgTrip(p: OProgram, trip: OTrip, t: Tenant): TripData {
  const country = countryOf(p.country);
  const D: ODay[] = p.days.length ? p.days : [{ city: '—', note: '', events: [] }];
  const n = D.length;
  const start = day0(trip.start);
  const dateOf = (i: number) => new Date(start + i * 86400000);
  const dateRu = (i: number) => { const d = dateOf(i); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
  const cityRu = (i: number) => D[i].city.trim() || '—';
  const days = D.map((_, i) => { const d = dateOf(i); return { wd: WD[d.getUTCDay()], n: d.getUTCDate(), city: cityRu(i) }; });
  const pre = p.id;

  const meals: Record<string, Meal> = {};
  const mealAddr: Record<string, [string, string]> = {};
  const culture: Record<string, Culture> = {};
  const visits: Visit[] = [];
  const events: TripEvent[][] = D.map((d, i) => [...d.events].filter((e) => e.name.trim()).sort((a, b) => toMin(normTime(a.t) || '12:00') - toMin(normTime(b.t) || '12:00')).map((e, k) => {
    const time = normTime(e.t) || '12:00';
    const out: TripEvent = { t: time, name: e.name.trim(), place: e.place.trim(), kind: e.kind };
    const when = `${days[i].wd}, ${dateRu(i)} · ${time}`;
    if (e.kind === 'meal') {
      const ref = `m-${pre}-${i}-${k}`;
      meals[ref] = { title: out.name, when, place: out.place || __('Ресторан · {a}', { a: cityRu(i) }), addrZh: '', cuisine: __('Ресторан и меню подтвердит координатор; ограничения по питанию из вашего профиля передадим ресторану.'), options: [__('Классическое меню'), __('Вегетарианское'), __('Без свинины')] };
      mealAddr[ref] = [out.place || __('{a} · адрес пришлёт координатор', { a: cityRu(i) }), ''];
      out.ref = ref;
    } else if (e.kind === 'culture') {
      const ref = `c-${pre}-${i}-${k}`;
      culture[ref] = { title: out.name, when, desc: out.place || __('Подробности пришлёт координатор'), bring: __('Удобная обувь и заряженный телефон') };
      out.ref = ref;
    } else if (e.kind === 'co' && !visits.some((v) => v.name === out.name)) {
      visits.push({ id: `v-${e.id}`, name: out.name, when: `${days[i].wd} ${days[i].n} · ${time}`, st: ['info', __('по программе')], addr: [out.place, cityRu(i)].filter(Boolean).join(', '), desc: out.place });
    }
    return out;
  }));

  // отели: ночи подряд в одном городе — один отель; последнюю ночь группа улетает
  const hotels: Record<string, Hotel> = {};
  const hotelByDay: (string | null)[] = D.map(() => null);
  const nightsTill = n > 1 ? n - 1 : 1;
  for (let i = 0; i < nightsTill; i++) {
    let j = i;
    while (j + 1 < nightsTill && cityRu(j + 1) === cityRu(i)) j++;
    const k = `h-${pre}-${i}`;
    const nights = j - i + 1;
    hotels[k] = {
      name: trip.hotel.trim() || __('Отель группы · {a}', { a: cityRu(i) }), city: cityRu(i), addrZh: '', addrRu: __('Адрес пришлёт координатор'), addrEn: '', phone: '',
      nights: `${dateOf(i).getUTCDate()}–${dateRu(j + 1)} · ${nights} ${plural(nights, __('ночь'), __('ночи'), __('ночей'))}`,
      desc: __('Отель подтверждает координатор перед поездкой — здесь появятся адрес на трёх языках, телефон, время завтрака и заселения.'),
    };
    for (let x = i; x <= j; x++) hotelByDay[x] = k;
    i = j;
  }

  // карта: известные города по порядку
  const pr = programRoute(D.map((d, i) => ({ day: i + 1, city: findCity(d.city)?.id || '' })));
  const stops: Stop[] = pr.stops.map((s) => {
    const ds = s.days.map((x) => x - 1);
    const h = ds.map((x) => hotelByDay[x]).find(Boolean);
    return { key: s.key, ru: s.ru, zh: '', lng: s.lng, lat: s.lat, days: ds, side: s.side || 'right', ...(h ? { hotel: h } : {}) };
  });
  const legs: RouteLeg[] = pr.legs.map((l) => {
    if (l.from === 'moscow') return { ...l, how: 'plane', day: 0, time: __('прилёт'), note: __('Перелёт к началу поездки') };
    if (l.to === 'moscow') return { ...l, how: 'plane', day: n - 1, time: __('вечером'), note: __('Вылет домой') };
    const day = stops.find((s) => s.key === l.to)?.days[0] ?? 0;
    const mv = events[day]?.find((e) => e.kind === 'move');
    const how: 'plane' | 'train' = mv && /поезд|train/i.test(`${mv.name} ${mv.place}`) ? 'train' : 'plane';
    return { ...l, how, day, time: mv?.t || __('утром'), note: mv ? [mv.name, mv.place].filter(Boolean).join(' · ') : __('Переезд в {a}', { a: toCity(stops.find((s) => s.key === l.to)?.ru || '') }) };
  });

  const today = Math.min(1, n - 1);
  const coordLegs = (d: number): CoordLeg[] => {
    const pts = (events[d] || []).filter((e) => e.kind === 'co' || e.kind === 'meal');
    const out: CoordLeg[] = [];
    let from = __('Отель');
    pts.forEach((e, k) => {
      out.push({ id: `l${k + 1}`, from, to: e.kind === 'meal' ? `${e.name} · ${cityRu(d)}` : e.name, plan: fromMin(toMin(e.t) - 45), min: 40 });
      from = e.name;
    });
    if (pts.length) out.push({ id: `l${pts.length + 1}`, from, to: __('Отель'), plan: fromMin(toMin(pts[pts.length - 1].t) + 90), min: 40 });
    return out;
  };
  const pastLegs = coordLegs(0).slice(0, 2).map((l) => ({ day: `${days[0].wd}, ${dateRu(0)}`, from: l.from, to: l.to, dep: fromMin(toMin(l.plan) + 3), arr: fromMin(toMin(l.plan) + 3 + l.min), min: l.min }));
  const cities = D.map((_, i) => cityRu(i)).filter((c, i, a) => i === 0 || a[i - 1] !== c);
  const lang = country.lang.ru.split(' ')[0];
  const title = trip.title.trim() || p.title;
  const coName = t.coordinator.name || __('Координатор');
  const vn = visits.length;

  return {
    trip: { title, start: dateOf(0).toISOString().slice(0, 10), dates: tripDates(trip.start, n), route: cities.join(' → '), today, country: country.code, programId: `org:${p.id}` },
    days,
    city: days.map((d) => d.city),
    weather: days.map(() => ({ ...NO_WEATHER })),
    hotels,
    hotelByDay,
    dayNotes: D.map((d) => d.note || ''),
    meals,
    mealAddr,
    culture,
    events,
    contacts: [
      { name: coName, role: __('Координатор · круглосуточно'), phones: t.phone ? [t.phone] : [], im: __('Чат в приложении') },
      { name: __('Гид-переводчик'), role: __('Переводчик: {a} — русский', { a: lang }), phones: [], im: __('Имя и контакт пришлёт координатор') },
    ],
    pinned: [{ key: 'trip', title: __('Программа поездки «{a}»', { a: title }), sub: __('От {a}', { a: t.name }) }],
    materials: [
      { key: 'memo', title: __('Памятка: {a}', { a: __(country.ru) }), sub: __('Связь, оплата, розетки, приложения') },
      { key: 'program', title: __('Программа поездки'), sub: `${daysRu(n)}, ${vn} ${plural(vn, __('визит'), __('визита'), __('визитов'))}` },
      { key: 'companies', title: __('Справки о компаниях'), sub: __('{a} {b} от организатора', { a: vn, b: plural(vn, __('карточка'), __('карточки'), __('карточек')) }) },
    ],
    checklist: [
      { key: 'passport', title: __('Скан паспорта'), sub: __('Проверит координатор') },
      { key: 'tickets', title: __('Билеты и страховка'), sub: __('Загрузите, когда будут готовы') },
      { key: 'interests', title: __('Отрасль и интересы'), sub: __('Что хотите узнать у компаний программы') },
      { key: 'memo', title: __('Прочитать памятку: {a}', { a: __(country.ru) }), sub: __('Связь, оплата, этикет') },
      { key: 'profile', title: __('Мой профиль: питание, аллергии, номер'), sub: __('Учтём в отеле и во всех забронированных ресторанах') },
    ],
    visits,
    coordLegs: coordLegs(today),
    pastLegs,
    stops,
    legs,
    guide: { name: __('Гид-переводчик'), role: __('{a} — русский', { a: lang }) },
    placesCity: cityRu(today),
    follow: visits.slice(0, 3).map((v) => v.name),
  };
}

// ——— для предпросмотра телефона в кабинете ———
export type PreviewTrip = { title: string; dates: string; route: string; hotel: string; country: string; people: OPerson[]; days: { label: string; city: string; events: OEvent[] }[] };
export function previewTrip(org: Org, tripId?: string, programId?: string): PreviewTrip | null {
  const trip = org.trips.find((x) => x.id === tripId) || (programId ? undefined : liveTrip(org) || org.trips[0]);
  const p = org.programs.find((x) => x.id === (programId || trip?.programId)) || (trip ? undefined : org.programs[0]);
  if (!p) return null;
  const start = trip?.start || '2026-11-16';
  const days = p.days.map((d, i) => {
    const x = new Date(day0(start) + i * 86400000);
    return { label: LANG === 'ru' ? `${WD[x.getUTCDay()]}, ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}` : dayLabel(x), city: d.city, events: [...d.events].sort((a, b) => toMin(normTime(a.t) || '12:00') - toMin(normTime(b.t) || '12:00')) };
  });
  const cities = days.map((d) => d.city).filter((c, i, a) => c && (i === 0 || a[i - 1] !== c));
  return { title: trip?.title || p.title, dates: tripDates(start, Math.max(1, p.days.length)), route: cities.join(' → '), hotel: trip?.hotel || '', country: __(countryOf(p.country).ru), people: trip?.people || [], days };
}

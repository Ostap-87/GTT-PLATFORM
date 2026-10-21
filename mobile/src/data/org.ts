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

export type OEvent = { id: string; t: string; name: string; place: string; kind: EventKind };
export type ODay = { city: string; note: string; events: OEvent[] };
export type Source = 'manual' | 'template' | 'sample' | 'xlsx' | 'docx' | 'pdf' | 'csv';
export type OProgram = { id: string; title: string; country: string; summary: string; days: ODay[]; source: Source; file?: string };
export type OPerson = { id: string; name: string; company: string; role: string; phone: string; email: string; invite: 'new' | 'sent' | 'joined' };
export type OTrip = { id: string; programId: string; title: string; start: string; hotel: string; published: boolean; people: OPerson[] };
export type Org = { contact: { email: string; phone: string; site: string }; programs: OProgram[]; trips: OTrip[]; active: string };

export const SOURCE_RU: Record<Source, string> = {
  manual: 'вручную', template: 'из шаблона', sample: 'пример', xlsx: 'из Excel', docx: 'из Word', pdf: 'из PDF', csv: 'из CSV',
};
export const KINDS: [EventKind, string][] = [['co', 'Визит'], ['meal', 'Еда'], ['move', 'Переезд'], ['culture', 'Культура'], ['info', 'Другое']];
export const COUNTRY_LIST = Object.values(COUNTRIES).map((c) => [c.code, c.ru] as [string, string]);
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
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
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
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}
export const daysRu = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`;
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
  cn: ['Шанхай', 'Шанхай', 'Ханчжоу', 'Шэньчжэнь', 'Шэньчжэнь'], jp: ['Токио', 'Токио', 'Киото', 'Осака', 'Осака'],
  kr: ['Сеул', 'Сеул', 'Сувон', 'Сеул'], th: ['Бангкок', 'Бангкок', 'Бангкок', 'Бангкок'], vn: ['Хошимин', 'Хошимин', 'Ханой', 'Ханой'],
  id: ['Джакарта', 'Джакарта', 'Бандунг', 'Джакарта'], in: ['Мумбаи', 'Мумбаи', 'Бенгалуру', 'Бенгалуру'],
  my: ['Куала-Лумпур', 'Куала-Лумпур', 'Пенанг', 'Куала-Лумпур'], ae: ['Дубай', 'Дубай', 'Абу-Даби', 'Дубай'],
};
/** Шаблон деловой поездки по стране: каркас дней, компании — заглушки «[уточнить]», их организатор вписывает сам. */
export function templateProgram(country: string): OProgram {
  const c = countryOf(country);
  const cities = TPL_CITIES[c.code] || TPL_CITIES.cn;
  const n = cities.length;
  const days: ODay[] = cities.map((city, i) => {
    if (i === 0) return { city, note: '', events: [ev('14:00', 'Прилёт и трансфер в отель', 'Встреча в аэропорту', 'move'), ev('17:00', 'Брифинг поездки', 'Конференц-зал отеля', 'info'), ev('19:30', 'Приветственный ужин', 'Ресторан [уточнить]', 'meal')] };
    if (i === n - 1) return { city, note: '', events: [ev('10:00', 'Итоговая встреча группы', 'Отель', 'info'), ev('12:30', 'Обед', 'Ресторан [уточнить]', 'meal'), ev('16:00', 'Трансфер в аэропорт', 'Вылет домой', 'move')] };
    const moved = city !== cities[i - 1];
    return {
      city, note: '', events: [
        moved ? ev('08:00', `Переезд: ${cities[i - 1]} → ${city}`, 'Поезд или перелёт [уточнить]', 'move') : ev('09:00', 'Выезд из отеля', 'Лобби · автобус группы', 'move'),
        ev(moved ? '11:00' : '10:00', 'Визит на производство', '[уточнить компанию]', 'co'),
        ev('13:00', 'Обед', 'Ресторан [уточнить]', 'meal'),
        ev('15:00', 'Встреча с руководством компании', '[уточнить компанию]', 'co'),
        ...(i === 1 ? [ev('18:00', 'Прогулка по городу', 'Культурная программа', 'culture')] : []),
        ev('19:30', 'Ужин группы', 'Ресторан [уточнить]', 'meal'),
      ],
    };
  });
  return { id: uid('p'), title: `Деловая поездка — ${c.ru}: производство и инновации`, country: c.code, summary: 'Шаблон: замените заглушки [уточнить] на свои компании, рестораны и время.', days, source: 'template' };
}

/** «Пример поездки» для пустого кабинета — компании и люди вымышленные. */
export function sampleProgram(): OProgram {
  return {
    id: uid('p'), title: 'Пример: умное производство Китая', country: 'cn', source: 'sample',
    summary: 'Пример с вымышленными компаниями — посмотрите, как поездка выглядит у участников, и замените на свою.',
    days: [
      { city: 'Шанхай', note: 'Пример', events: [ev('14:00', 'Прилёт и трансфер в отель', 'Аэропорт Пудун → отель', 'move'), ev('17:30', 'Брифинг поездки', 'Конференц-зал отеля', 'info'), ev('19:30', 'Приветственный ужин', 'Ресторан шанхайской кухни', 'meal')] },
      { city: 'Шанхай', note: '', events: [ev('09:00', 'Выезд из отеля', 'Лобби · автобус группы', 'move'), ev('10:00', 'Завод «Пример Электроникс»', 'Сборка электроники, экскурсия по цехам', 'co'), ev('13:00', 'Обед', 'Ресторан рядом с заводом', 'meal'), ev('15:00', 'Логистический центр «Пример Логистик»', 'Роботизированный склад', 'co'), ev('19:00', 'Прогулка по набережной Бунд', 'Культурная программа · 1,5 часа', 'culture')] },
      { city: 'Ханчжоу', note: '', events: [ev('08:30', 'Поезд в Ханчжоу', 'Скоростной поезд · 1 час', 'move'), ev('11:00', 'Кампус «Пример Технолоджи»', 'Шоурум и встреча с командой', 'co'), ev('13:30', 'Обед', 'Ханчжоуская кухня', 'meal'), ev('15:30', 'Чайная церемония', 'Культурная программа · 1 час', 'culture'), ev('19:30', 'Ужин группы', 'Ресторан у озера', 'meal')] },
      { city: 'Ханчжоу', note: '', events: [ev('10:00', 'Итоговая встреча группы', 'Отель', 'info'), ev('12:30', 'Обед', 'Ресторан отеля', 'meal'), ev('16:00', 'Трансфер в аэропорт', 'Вылет домой', 'move')] },
    ],
  };
}
const SAMPLE_PEOPLE: [string, string, string][] = [
  ['Иван Петров', 'Пример Ритейл', 'Коммерческий директор'], ['Ольга Сидорова', 'Пример Логистика', 'Директор по логистике'],
  ['Пётр Иванов', 'Пример Производство', 'Генеральный директор'], ['Анна Кузнецова', 'Пример Инвест', 'Партнёр'],
  ['Максим Орлов', 'Пример Дистрибуция', 'Директор по закупкам'], ['Елена Морозова', 'Пример Маркет', 'Руководитель e-commerce'],
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
const NO_WEATHER: Weather = { icon: 'cloud', max: '', min: '', text: 'Прогноз появится за неделю до поездки' };
const toCity = (ru: string) => ru.replace(/([^аеёиоуыэюя])а$/, '$1у').replace(/я$/, 'ю');

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
      meals[ref] = { title: out.name, when, place: out.place || `Ресторан · ${cityRu(i)}`, addrZh: '', cuisine: 'Ресторан и меню подтвердит координатор; ограничения по питанию из вашего профиля передадим ресторану.', options: ['Классическое меню', 'Вегетарианское', 'Без свинины'] };
      mealAddr[ref] = [out.place || `${cityRu(i)} · адрес пришлёт координатор`, ''];
      out.ref = ref;
    } else if (e.kind === 'culture') {
      const ref = `c-${pre}-${i}-${k}`;
      culture[ref] = { title: out.name, when, desc: out.place || 'Подробности пришлёт координатор', bring: 'Удобная обувь и заряженный телефон' };
      out.ref = ref;
    } else if (e.kind === 'co' && !visits.some((v) => v.name === out.name)) {
      visits.push({ id: `v-${e.id}`, name: out.name, when: `${days[i].wd} ${days[i].n} · ${time}`, st: ['info', 'по программе'], addr: [out.place, cityRu(i)].filter(Boolean).join(', '), desc: out.place });
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
      name: trip.hotel.trim() || `Отель группы · ${cityRu(i)}`, city: cityRu(i), addrZh: '', addrRu: 'Адрес пришлёт координатор', addrEn: '', phone: '',
      nights: `${dateOf(i).getUTCDate()}–${dateRu(j + 1)} · ${nights} ${plural(nights, 'ночь', 'ночи', 'ночей')}`,
      desc: 'Отель подтверждает координатор перед поездкой — здесь появятся адрес на трёх языках, телефон, время завтрака и заселения.',
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
    if (l.from === 'moscow') return { ...l, how: 'plane', day: 0, time: 'прилёт', note: 'Перелёт к началу поездки' };
    if (l.to === 'moscow') return { ...l, how: 'plane', day: n - 1, time: 'вечером', note: 'Вылет домой' };
    const day = stops.find((s) => s.key === l.to)?.days[0] ?? 0;
    const mv = events[day]?.find((e) => e.kind === 'move');
    const how: 'plane' | 'train' = mv && /поезд|train/i.test(`${mv.name} ${mv.place}`) ? 'train' : 'plane';
    return { ...l, how, day, time: mv?.t || 'утром', note: mv ? [mv.name, mv.place].filter(Boolean).join(' · ') : `Переезд в ${toCity(stops.find((s) => s.key === l.to)?.ru || '')}` };
  });

  const today = Math.min(1, n - 1);
  const coordLegs = (d: number): CoordLeg[] => {
    const pts = (events[d] || []).filter((e) => e.kind === 'co' || e.kind === 'meal');
    const out: CoordLeg[] = [];
    let from = 'Отель';
    pts.forEach((e, k) => {
      out.push({ id: `l${k + 1}`, from, to: e.kind === 'meal' ? `${e.name} · ${cityRu(d)}` : e.name, plan: fromMin(toMin(e.t) - 45), min: 40 });
      from = e.name;
    });
    if (pts.length) out.push({ id: `l${pts.length + 1}`, from, to: 'Отель', plan: fromMin(toMin(pts[pts.length - 1].t) + 90), min: 40 });
    return out;
  };
  const pastLegs = coordLegs(0).slice(0, 2).map((l) => ({ day: `${days[0].wd}, ${dateRu(0)}`, from: l.from, to: l.to, dep: fromMin(toMin(l.plan) + 3), arr: fromMin(toMin(l.plan) + 3 + l.min), min: l.min }));
  const cities = D.map((_, i) => cityRu(i)).filter((c, i, a) => i === 0 || a[i - 1] !== c);
  const lang = country.lang.ru.split(' ')[0];
  const title = trip.title.trim() || p.title;
  const coName = t.coordinator.name || 'Координатор';
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
      { name: coName, role: 'Координатор · круглосуточно', phones: t.phone ? [t.phone] : [], im: 'Чат в приложении' },
      { name: 'Гид-переводчик', role: `Переводчик: ${lang} — русский`, phones: [], im: 'Имя и контакт пришлёт координатор' },
    ],
    pinned: [{ key: 'trip', title: `Программа поездки «${title}»`, sub: `От ${t.name}` }],
    materials: [
      { key: 'memo', title: `Памятка: ${country.ru}`, sub: 'Связь, оплата, розетки, приложения' },
      { key: 'program', title: 'Программа поездки', sub: `${daysRu(n)}, ${vn} ${plural(vn, 'визит', 'визита', 'визитов')}` },
      { key: 'companies', title: 'Справки о компаниях', sub: `${vn} ${plural(vn, 'карточка', 'карточки', 'карточек')} от организатора` },
    ],
    checklist: [
      { key: 'passport', title: 'Скан паспорта', sub: 'Проверит координатор' },
      { key: 'tickets', title: 'Билеты и страховка', sub: 'Загрузите, когда будут готовы' },
      { key: 'interests', title: 'Отрасль и интересы', sub: 'Что хотите узнать у компаний программы' },
      { key: 'memo', title: `Прочитать памятку: ${country.ru}`, sub: 'Связь, оплата, этикет' },
      { key: 'profile', title: 'Мой профиль: питание, аллергии, номер', sub: 'Учтём в отеле и во всех забронированных ресторанах' },
    ],
    visits,
    coordLegs: coordLegs(today),
    pastLegs,
    stops,
    legs,
    guide: { name: 'Гид-переводчик', role: `${lang} — русский` },
    placesCity: cityRu(today),
    follow: visits.slice(0, 3).map((v) => v.name),
  };
}

// ——— для предпросмотра телефона в кабинете ———
export type PreviewTrip = { title: string; dates: string; route: string; hotel: string; days: { label: string; city: string; events: OEvent[] }[] };
export function previewTrip(org: Org, tripId?: string, programId?: string): PreviewTrip | null {
  const trip = org.trips.find((x) => x.id === tripId) || (programId ? undefined : liveTrip(org) || org.trips[0]);
  const p = org.programs.find((x) => x.id === (programId || trip?.programId)) || (trip ? undefined : org.programs[0]);
  if (!p) return null;
  const start = trip?.start || '2026-11-16';
  const days = p.days.map((d, i) => {
    const x = new Date(day0(start) + i * 86400000);
    return { label: `${WD[x.getUTCDay()]}, ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`, city: d.city, events: [...d.events].sort((a, b) => toMin(normTime(a.t) || '12:00') - toMin(normTime(b.t) || '12:00')) };
  });
  const cities = days.map((d) => d.city).filter((c, i, a) => c && (i === 0 || a[i - 1] !== c));
  return { title: trip?.title || p.title, dates: tripDates(start, Math.max(1, p.days.length)), route: cities.join(' → '), hotel: trip?.hotel || '', days };
}

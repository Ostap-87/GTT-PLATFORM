// Интерактивный маршрут для делегатов (решения 21.10.2026): карта страны по регионам — как на сайте, города, как едем
// между ними, что в каждом городе. Координаты городов — из данных сайта (companies.json → cities).
// Данные — из тестовой поездки (trip.ts) или программы сайта (data/demo-trip.ts); на шаге 2 придут с сервера.
import { VISITS } from './group';
import type { MapLeg, MapStop } from './map-route';
import { CULTURE, DAYS, HOTELS, WEATHER, dayEvents, monthOf } from './trip';

export type Stop = { key: string; ru: string; zh: string; lng: number; lat: number; days: number[]; hotel?: string; side: 'left' | 'right' };
export type Leg = { from: string; to: string; how: 'plane' | 'train'; day: number; time: string; note: string };

/** Города по порядку (широта и долгота — как у городов на сайте). */
export const STOPS: Stop[] = [
  { key: 'beijing', ru: 'Пекин', zh: '北京', lng: 116.4, lat: 39.9, days: [0, 1], hotel: 'beijing', side: 'right' },
  { key: 'shanghai', ru: 'Шанхай', zh: '上海', lng: 121.5, lat: 31.2, days: [2, 3], hotel: 'shanghai', side: 'right' },
  { key: 'hangzhou', ru: 'Ханчжоу', zh: '杭州', lng: 120.2, lat: 30.3, days: [4], side: 'left' },
  { key: 'shenzhen', ru: 'Шэньчжэнь', zh: '深圳', lng: 114.1, lat: 22.5, days: [5], hotel: 'shenzhen', side: 'left' },
];

/** Переезды — по расписанию поездки (события «move»). */
export const LEGS: Leg[] = [
  { from: 'moscow', to: 'beijing', how: 'plane', day: 0, time: 'прилёт 14:00', note: 'Перелёт из Москвы, трансфер в отель' },
  { from: 'beijing', to: 'shanghai', how: 'plane', day: 2, time: '07:40', note: 'Перелёт, сбор в лобби в 05:45' },
  { from: 'shanghai', to: 'hangzhou', how: 'train', day: 4, time: '08:30', note: 'Скоростной поезд' },
  { from: 'hangzhou', to: 'shenzhen', how: 'plane', day: 4, time: '18:00', note: 'Перелёт вечером, заезд в отель около 21:00' },
  { from: 'shenzhen', to: 'moscow', how: 'plane', day: 5, time: '18:00', note: 'Итоги и вылет домой' },
];

export const MOSCOW = { key: 'moscow', ru: 'Москва', zh: '莫斯科' };
export const pointOf = (key: string) => (key === 'moscow' ? MOSCOW : STOPS.find((s) => s.key === key)!);
export const dayShort = (i: number) => `${DAYS[i].wd} ${DAYS[i].n}`;
export const stopDays = (s: Stop) => (s.days.length > 1 ? `${dayShort(s.days[0])} – ${dayShort(s.days[s.days.length - 1])} ${monthOf(s.days[s.days.length - 1])}` : `${dayShort(s.days[0])} ${monthOf(s.days[0])}`);

/** Что в городе: компании, культура, отель, погода, как уезжаем. */
export function stopInfo(s: Stop) {
  const events = s.days.flatMap((d) => dayEvents(d).map((e) => ({ ...e, day: d })));
  return {
    visits: events.filter((e) => e.kind === 'co').map((e) => ({ day: e.day, t: e.t, name: e.name, place: e.place, id: VISITS.find((v) => v.name === e.name)?.id })),
    culture: events.filter((e) => e.kind === 'culture').map((e) => ({ day: e.day, t: e.t, name: e.name, id: e.ref && CULTURE[e.ref] ? e.ref : undefined })),
    hotel: s.hotel ? { key: s.hotel, ...HOTELS[s.hotel] } : undefined,
    weather: s.days.map((d) => WEATHER[d]),
    next: LEGS.find((l) => l.from === s.key),
    arrive: LEGS.find((l) => l.to === s.key),
  };
}

export const routeText = () => ['Москва', ...STOPS.map((s) => s.ru), 'Москва'].join(' → ');
export const ROUTE_STATS = { cities: 0, days: 0, visits: 0 };

/** Точки и переезды для карты (RouteMap): подпись под городом — иероглифы (если есть) и дни. */
export const MAP_STOPS: MapStop[] = [];
export const MAP_LEGS: MapLeg[] = [];

/** Пересчитать производные маршрута — при запуске и после смены программы в демо (data/active.ts). */
export function refreshRoute() {
  Object.assign(ROUTE_STATS, { cities: STOPS.length, days: DAYS.length, visits: VISITS.length });
  MAP_STOPS.splice(0, MAP_STOPS.length, ...STOPS.map((s) => {
    const days = s.days.length > 1 ? `${dayShort(s.days[0])}–${DAYS[s.days[s.days.length - 1]].n}` : dayShort(s.days[0]);
    return { key: s.key, ru: s.ru, lng: s.lng, lat: s.lat, side: s.side, sub: s.zh ? `${s.zh} · ${days}` : days };
  }));
  MAP_LEGS.splice(0, MAP_LEGS.length, ...LEGS.map(({ from, to, how }) => ({ from, to, how })));
}
refreshRoute();

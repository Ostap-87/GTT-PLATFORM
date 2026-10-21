// Какая поездка открыта в демо делегата (решение 21.10.2026): подробное демо «Новый ритейл Китая» или любая из программ
// сайта, собранная data/demo-trip.ts. Данные поездки лежат в модулях trip / group / route / extras — здесь они
// заменяются на месте, после чего приложение пересобирает экраны (_layout.tsx, ключ gen).
import { latin } from '@/ui/files';

import { buildTrip, programById, type TripData } from './demo-trip';
import { FOLLOW_COMPANIES, GUIDE, PLACES, PLACES_CITY } from './extras';
import { LEGS as COORD_LEGS, PAST_LEGS, VISITS, byId } from './group';
import { refreshMind } from './mindmap';
import { buildOrgTrip, liveTrip, newTrip, orgOf, samplePeople, sampleProgram, type OPerson } from './org';
import { LEGS, STOPS, refreshRoute } from './route';
import {
  CHECKLIST, CITY, CONTACTS, CULTURE, DAYS, DAY_NOTES, DELEGATES, EVENTS, INTROS, HOTELS, HOTEL_BY_DAY, MATERIALS, MEALS, MEAL_ADDR, PINNED, TRIP, WEATHER,
} from './trip';
import type { Tenant } from './tenant';

const fill = <T,>(a: T[], b: T[]) => { a.splice(0, a.length, ...b); };
const put = <T,>(o: Record<string, T>, b: Record<string, T>) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, b); };
const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** Подробное демо в том виде, в каком оно в коде, — чтобы к нему можно было вернуться. */
const DETAILED = copy({
  trip: TRIP, days: DAYS, city: CITY, weather: WEATHER, hotels: HOTELS, hotelByDay: HOTEL_BY_DAY, dayNotes: DAY_NOTES, meals: MEALS,
  mealAddr: MEAL_ADDR, culture: CULTURE, events: EVENTS, contacts: CONTACTS, pinned: PINNED, materials: MATERIALS, checklist: CHECKLIST,
  visits: VISITS, coordLegs: COORD_LEGS, pastLegs: PAST_LEGS, stops: STOPS, legs: LEGS, guide: GUIDE, placesCity: PLACES_CITY.ru,
  follow: FOLLOW_COMPANIES, places: PLACES,
});
type Data = TripData & { places?: typeof PLACES };

/** Вымышленная группа демо — чтобы вернуть её после поездки организатора. */
const GROUP0 = [...DELEGATES];
const GROUP_DATA = copy(DELEGATES);
/** «Вам стоит познакомиться» — подобрано под демо-группу GTT; у организатора своих подсказок пока нет. */
const INTROS0 = copy(INTROS);
/** Группа поездки: участники организатора на местах демо-делегатов (те же id — отметки и статусы работают как есть). */
function setGroup(people?: OPerson[]) {
  GROUP0.forEach((d, i) => { Object.assign(d, GROUP_DATA[i]); byId[d.id] = d; });
  fill(INTROS, people ? [] : INTROS0);
  if (!people?.length) { fill(DELEGATES, GROUP0); return; }
  fill(DELEGATES, people.map((p, i) => {
    const d = GROUP0[i] || { ...GROUP_DATA[0], id: `d${i + 1}` };
    const role = p.role || 'Участник';
    const co = p.company || '—';
    Object.assign(d, { ru: p.name, lat: latin(p.name) || p.name, roleRu: role, roleZh: role, roleEn: role, coRu: co, coZh: co, coEn: co, cityRu: '', cityZh: '', cityEn: '', ind: 'other' });
    byId[d.id] = d;
    return d;
  }));
}

/** Открыть в демо программу сайта по id; пусто или неизвестный id — подробное демо. Возвращает, что открыто. */
export function applyTrip(programId?: string | null): string {
  const p = programId ? programById(programId) : undefined;
  applyData(p ? buildTrip(p) : copy(DETAILED));
  setGroup();
  return p ? p.id : '';
}

/** Поездка организатора (white label): опубликованная из его кабинета; пока её нет — пример с вымышленными данными,
 *  но не программы GTT. Возвращает id открытой поездки или пусто. */
export function applyOrg(t: Tenant): string {
  const org = orgOf(t.id);
  const live = liveTrip(org);
  const p = live && org.programs.find((x) => x.id === live.programId);
  if (live && p) { applyData(buildOrgTrip(p, live, t)); setGroup(live.people); return live.id; }
  const sp = sampleProgram();
  const people = samplePeople();
  applyData(buildOrgTrip(sp, { ...newTrip(sp, '2026-11-16'), people }, t));
  setGroup(people);
  return '';
}

function applyData(d: Data) {
  Object.assign(TRIP, d.trip);
  fill(DAYS, d.days); fill(CITY, d.city); fill(WEATHER, d.weather); fill(HOTEL_BY_DAY, d.hotelByDay); fill(DAY_NOTES, d.dayNotes);
  put(HOTELS, d.hotels); put(MEALS, d.meals); put(MEAL_ADDR, d.mealAddr); put(CULTURE, d.culture);
  fill(EVENTS, d.events); fill(CONTACTS, d.contacts); fill(PINNED, d.pinned); fill(MATERIALS, d.materials); fill(CHECKLIST, d.checklist);
  fill(VISITS, d.visits); fill(COORD_LEGS, d.coordLegs); fill(PAST_LEGS, d.pastLegs);
  fill(STOPS, d.stops); fill(LEGS, d.legs);
  Object.assign(GUIDE, d.guide); PLACES_CITY.ru = d.placesCity; fill(FOLLOW_COMPANIES, d.follow);
  const places = d.places || { shop: [], night: [], store: [], wc: [] };
  for (const k of Object.keys(PLACES) as (keyof typeof PLACES)[]) fill(PLACES[k], places[k]);
  refreshRoute();
  refreshMind();
}

/** Открыто подробное демо (с отелями, ресторанами, культурной программой и примером заметок). */
export const isDetailed = () => !TRIP.programId;

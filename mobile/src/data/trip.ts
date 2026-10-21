// Тестовая поездка для шага 1: расписание, контакты, материалы. Делегаты вымышленные, телефоны и адреса — примеры.
// Подробное демо «Новый ритейл Китая» — по умолчанию; другую программу сайта подставляет data/active.ts.
import { HOTELS, HOTEL_BY_DAY, type Weather } from './trip-base';

export * from './trip-base';

export const TRIP = {
  title: 'Новый ритейл Китая',
  dates: '9–14 ноября 2026',
  route: 'Пекин → Шанхай → Ханчжоу → Шэньчжэнь',
  today: 1, // в демо «сегодня» — вторник, 10 ноября
  /** Первый день поездки (местная дата) — от него время напоминаний и событий календаря. */
  start: '2026-11-09',
  /** Страна поездки — от неё валюта, язык, подготовка, приложения и карта (data/countries.ts). */
  country: 'cn',
  /** Программа сайта, из которой собрана демо-поездка; пусто — подробное демо. */
  programId: '',
};
/** Погода одной строкой; у программ с сайта прогноза в демо нет. */
export const weatherLine = (w: Weather) => (w.max ? `${w.max} / ${w.min}` : 'Прогноз позже');
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** Месяц дня поездки в родительном падеже — от даты начала (у поездок организатора это не обязательно ноябрь). */
export const monthOf = (i: number) => MONTHS_GEN[new Date(Date.parse(`${TRIP.start}T00:00:00Z`) + i * 86400000).getUTCMonth()] || 'ноября';

export type EventKind = 'move' | 'co' | 'meal' | 'culture' | 'info';
export type TripEvent = { t: string; name: string; place: string; kind: EventKind; moved?: boolean; ref?: string };

const E0: [string, string, string, EventKind, (string | boolean)?][][] = [
  [['14:00', 'Прилёт и трансфер', 'Аэропорт → отель', 'move'], ['17:00', 'Брифинг экспедиции', 'Конференц-зал отеля', 'info'], ['19:30', 'Приветственный ужин', 'Пекинская утка', 'meal', 'm-mon-d']],
  [['09:30', 'Выезд из отеля', 'Лобби · автобус №2', 'move'], ['10:30', 'JD.com', 'Шоурум и встреча с менеджментом', 'co'], ['13:00', 'Обед', 'Кантонская кухня рядом с JD.com', 'meal', 'm-tue-l'], ['15:30', 'Meituan', 'Встреча с командой', 'co', true], ['19:00', 'Ужин группы', 'Хого — горячий котёл', 'meal', 'm-tue-d']],
  [['07:40', 'Перелёт в Шанхай', 'Сбор в лобби в 05:45', 'move'], ['12:00', 'Обед', 'Шанхайская кухня', 'meal', 'm-wed-l'], ['13:30', 'Hema (Freshippo)', 'Магазин и склад', 'co'], ['16:30', 'Pinduoduo', 'Встреча с командой', 'co']],
  [['10:00', 'RT-Mart', 'Гипермаркет', 'co'], ['12:30', 'Обед', 'Бизнес-ланч рядом с RT-Mart', 'meal', 'm-thu-l'], ['14:30', 'Ele.me', 'Мгновенная доставка', 'co'], ['18:00', 'Прогулка по набережной Бунд', 'Культурная программа · 1,5 часа', 'culture', 'c-bund'], ['20:00', 'Ужин на набережной', 'Китайская и европейская кухня', 'meal', 'm-thu-d']],
  [['08:30', 'Переезд в Ханчжоу', 'Скоростной поезд', 'move'], ['11:00', 'Alibaba', 'Кампус и шоурум', 'co'], ['13:30', 'Обед', 'Ханчжоуская кухня', 'meal', 'm-fri-l'], ['15:00', 'Чайная церемония Лунцзин', 'Культурная программа · 1 час', 'culture', 'c-tea'], ['18:00', 'Перелёт в Шэньчжэнь', 'Детали — у координатора', 'move']],
  [['10:00', "Sam's Club", 'Магазин', 'co'], ['12:00', 'Обед', 'Кантонская кухня', 'meal', 'm-sat-l'], ['14:00', 'Yonghui', 'Супермаркет', 'co'], ['18:00', 'Итоги и вылет', 'Аэропорт Шэньчжэня', 'move']],
];

/** Расписание по дням. */
export const EVENTS: TripEvent[][] = E0.map((day) => day.map(([t, name, place, kind, extra]) => ({ t, name, place, kind, moved: extra === true, ref: typeof extra === 'string' ? extra : undefined })));
export const dayEvents = (i: number): TripEvent[] => (EVENTS[i] || []).map((e) => ({ ...e }));

export const hotelOf = (i: number) => {
  const key = HOTEL_BY_DAY[i];
  return key ? { key, ...HOTELS[key] } : null;
};

export const CONTACTS: { name: string; role: string; phones: string[]; im: string }[] = [
  { name: 'Остап Доценко', role: 'Координатор · круглосуточно', phones: ['+86 138 0000 0000', '+7 900 000-00-00'], im: 'WeChat · Telegram · WhatsApp' },
  { name: 'Ли Мэй', role: 'Переводчик', phones: ['+86 139 0000 0000'], im: 'WeChat' },
];

type Doc = { key: string; title: string; sub: string };
export const PINNED: Doc[] = [{ key: 'trip', title: 'Презентация поездки «Новый ритейл Китая»', sub: 'От Global Tech Tour · PDF 18 МБ' }];
export const MATERIALS: Doc[] = [
  { key: 'memo', title: 'Памятка по Китаю', sub: 'Связь, WeChat, Alipay, этикет · PDF 2 МБ' },
  { key: 'program', title: 'Программа поездки', sub: '6 дней, 9 компаний · PDF 1 МБ' },
  { key: 'companies', title: 'Справки о компаниях', sub: '9 карточек с сайта globaltechtour.ru' },
];

export const INTROS: { id: string; why: string }[] = [
  { id: 'd2', why: 'Вы оба занимаетесь доставкой свежих продуктов' },
  { id: 'd5', why: 'Оба строите онлайн-продажи сети' },
];

export const CHECKLIST: Doc[] = [
  { key: 'passport', title: 'Скан паспорта', sub: 'Проверен координатором' },
  { key: 'tickets', title: 'Билеты и страховка', sub: 'Загружены' },
  { key: 'interests', title: 'Отрасль и интересы', sub: 'Ритейл, собственные марки, доставка' },
  { key: 'memo', title: 'Прочитать памятку по Китаю', sub: 'Связь, оплата, этикет' },
  { key: 'profile', title: 'Мой профиль: питание, аллергии, номер', sub: 'Учтём в отеле и во всех забронированных ресторанах' },
];


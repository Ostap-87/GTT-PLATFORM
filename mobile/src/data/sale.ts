// «Продажа тура» (решение пользователя 21.10.2026): продающая страница тура и баннеры для соцсетей — из программы, которая
// уже есть в кабинете. Шаг 1 — без сервера: всё собирается на устройстве, страница скачивается файлом (HTML) для своего
// сайта, баннеры — PNG по одному или архивом, к каждому — текст поста под лимиты соцсети и ссылка с меткой (utm).
// Бесплатно — 2 страницы тура, дальше — по подписке (решение пользователя 21.10.2026).
// Тексты страницы и баннеров — на языке страницы (не кабинета): подписи — словарь PAGE_L ниже, содержание — организатор.
import { LANG, __, rangeLabelIn, type Lang } from '@/i18n';
import { latin } from '@/ui/files';

import { normTime, uid, type OProgram, type OTrip, type Org } from './org';
import type { Tenant } from './tenant';

export const FREE_PAGES = 2;

// ——— форматы баннеров и соцсети ———
export type FormatKey = 'ig_post' | 'ig_story' | 'vk' | 'tg' | 'fb' | 'sq';
export type Format = { key: FormatKey; w: number; h: number; name: string; where: string };
/** Размеры — рекомендованные соцсетями для картинки поста; у Stories сверху и снизу 250 px заняты кнопками соцсети. */
export const FORMATS: Format[] = [
  { key: 'ig_post', w: 1080, h: 1350, name: __('Instagram · пост 4:5'), where: __('Лента Instagram') },
  { key: 'ig_story', w: 1080, h: 1920, name: __('Stories и Reels 9:16'), where: __('Instagram, ВКонтакте, Telegram') },
  { key: 'vk', w: 1200, h: 800, name: __('ВКонтакте'), where: __('Пост в сообществе') },
  { key: 'tg', w: 1280, h: 720, name: __('Telegram'), where: __('Пост в канале') },
  { key: 'fb', w: 1200, h: 628, name: __('Facebook и LinkedIn'), where: __('Пост со ссылкой') },
  { key: 'sq', w: 1080, h: 1080, name: __('Квадрат 1:1'), where: __('WhatsApp, Одноклассники, любые соцсети') },
];
export const formatOf = (k: FormatKey) => FORMATS.find((f) => f.key === k)!;

export type NetKey = 'instagram' | 'stories' | 'vk' | 'telegram' | 'facebook' | 'linkedin' | 'square';
export type Net = { key: NetKey; name: string; fmt: FormatKey; limit: number; clickable: boolean; src: string };
/** limit — сколько знаков влезает в подпись к картинке (0 — подписи нет, у Stories текст на самом баннере). */
export const NETS: Net[] = [
  { key: 'instagram', name: 'Instagram', fmt: 'ig_post', limit: 2200, clickable: false, src: 'instagram' },
  { key: 'stories', name: 'Stories', fmt: 'ig_story', limit: 0, clickable: true, src: 'stories' },
  { key: 'vk', name: __('ВКонтакте'), fmt: 'vk', limit: 4000, clickable: true, src: 'vk' },
  { key: 'telegram', name: 'Telegram', fmt: 'tg', limit: 1024, clickable: true, src: 'telegram' },
  { key: 'facebook', name: 'Facebook', fmt: 'fb', limit: 3000, clickable: true, src: 'facebook' },
  { key: 'linkedin', name: 'LinkedIn', fmt: 'fb', limit: 3000, clickable: true, src: 'linkedin' },
  { key: 'square', name: __('WhatsApp и др.'), fmt: 'sq', limit: 1000, clickable: true, src: 'messenger' },
];
export const netOf = (k: NetKey) => NETS.find((n) => n.key === k)!;

// ——— страница тура ———
export type BlockKey = 'cover' | 'facts' | 'program' | 'photos' | 'included' | 'organizer' | 'request';
export const BLOCKS: [BlockKey, string, string][] = [
  ['cover', __('Обложка'), __('Фото, заголовок, даты и кнопка заявки')],
  ['facts', __('Даты и маршрут'), __('Когда, сколько дней, какие города')],
  ['program', __('Программа по дням'), __('Коротко о каждом дне')],
  ['photos', __('Фотографии'), __('Остальные загруженные фото')],
  ['included', __('Что входит'), __('Список и стоимость')],
  ['organizer', __('Организатор'), __('Логотип, о компании и контакты')],
  ['request', __('Оставить заявку'), __('Форма: заявка придёт в WhatsApp или на почту')],
];
export type PageText = {
  title: string; subtitle: string; badge: string; cta: string; price: string;
  /** По строке на пункт. */
  included: string;
  /** По строке на день программы. */
  days: string[];
  about: string;
  /** Тексты постов, поправленные руками; нет — собираются сами. */
  posts: Partial<Record<NetKey, string>>;
};
/** Фото и как его кадрировать: точка интереса (0…1), приближение (1…2), затемнение для читаемости текста (0…0.7). */
export type PhotoRef = { id: string; fx: number; fy: number; zoom: number; dim: number };
export type BannerStyle = 'photo' | 'panel' | 'split';
export const STYLES: [BannerStyle, string, string][] = [
  ['photo', __('Фото на весь баннер'), __('Текст поверх фото — ярко и эмоционально')],
  ['panel', __('Фото и плашка бренда'), __('Фото сверху, текст на цвете бренда — читается лучше всего')],
  ['split', __('Две половины'), __('Фото и текст рядом — спокойно и по-деловому')],
];
export type OPage = {
  id: string;
  programId: string;
  tripId: string;
  /** Первый день поездки «ГГГГ-ММ-ДД»; пусто — «даты уточняются». */
  start: string;
  langs: Lang[];
  texts: Partial<Record<Lang, PageText>>;
  photos: PhotoRef[];
  /** id фото обложки. */
  cover: string;
  blocks: { key: BlockKey; on: boolean }[];
  style: BannerStyle;
  /** Своё фото для отдельного формата баннера. */
  bannerPhoto: Partial<Record<FormatKey, string>>;
  /** Адрес страницы на сайте организатора — для ссылок в постах. */
  url: string;
  slug: string;
  created: string;
};

export const pagesOf = (org: Org) => org.pages || [];
export const isPro = (org: Org) => org.plan === 'pro';
/** Сколько страниц уже создано (удалённые тоже считаются — бесплатных две на организатора). */
export const pagesMade = (org: Org) => Math.max(org.pagesMade ?? 0, pagesOf(org).length);
export const canCreatePage = (org: Org) => isPro(org) || pagesMade(org) < FREE_PAGES;

// ——— подписи страницы на её языке ———
type Inc = { visits: (n: number) => string; meals: string; transfers: string; culture: string; hotel: (h: string) => string; app: string };
export type PageLabels = {
  program: string; included: string; organizer: string; dates: string; route: string; duration: string; photos: string;
  request: string; requestSub: string; name: string; contact: string; comment: string; sendWa: string; sendMail: string; call: string;
  price: string; priceAsk: string; datesTbd: string; ctaDefault: string; inBio: string; storiesHint: string; details: string; noLink: string;
  day: (n: number) => string; days: (n: number) => string; visits: (n: number) => string;
  subDefault: (country: string) => string;
  inc: Inc; hashtags: string[]; arrow: string;
  msg: { req: string; name: string; contact: string; comment: string; src: string };
  sentNote: string; needContact: string;
};
const ruPlural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
export const PAGE_L: Record<Lang, PageLabels> = {
  ru: {
    program: 'Программа по дням', included: 'Что входит', organizer: 'Организатор', dates: 'Даты', route: 'Маршрут', duration: 'Длительность', photos: 'Фотографии',
    request: 'Оставить заявку', requestSub: 'Оставьте контакты — организатор ответит и расскажет подробности.', name: 'Ваше имя', contact: 'Телефон или мессенджер',
    comment: 'Вопрос или комментарий (необязательно)', sendWa: 'Отправить в WhatsApp', sendMail: 'Отправить на почту', call: 'Позвонить',
    price: 'Стоимость', priceAsk: 'Стоимость — по запросу', datesTbd: 'Даты уточняются', ctaDefault: 'Оставить заявку', inBio: 'ссылка в шапке профиля',
    storiesHint: 'Добавьте в Stories стикер «Ссылка» с адресом:', details: 'Подробности и заявка', noLink: '[ссылка на страницу]',
    day: (n) => `День ${n}`, days: (n) => `${n} ${ruPlural(n, 'день', 'дня', 'дней')}`, visits: (n) => `${n} ${ruPlural(n, 'визит', 'визита', 'визитов')} в компании`,
    subDefault: (c) => `Деловая поездка: ${c} — визиты в компании, встречи и знакомства с группой.`,
    inc: { visits: (n) => `Визиты в компании по программе: ${n}`, meals: 'Питание по программе', transfers: 'Трансферы и переезды по программе', culture: 'Культурная программа', hotel: (h) => `Проживание: ${h}`, app: 'Приложение поездки: программа, карта и чат с координатором' },
    hashtags: ['деловаяпоездка', 'бизнестур'], arrow: ' → ',
    msg: { req: 'Заявка', name: 'Имя', contact: 'Контакт', comment: 'Комментарий', src: 'Откуда' },
    sentNote: 'Откроется WhatsApp или почта с готовым текстом заявки — останется нажать «Отправить».', needContact: 'Впишите имя и контакт',
  },
  en: {
    program: 'Day-by-day programme', included: 'What’s included', organizer: 'Organizer', dates: 'Dates', route: 'Route', duration: 'Duration', photos: 'Photos',
    request: 'Send a request', requestSub: 'Leave your contacts — the organizer will reply with the details.', name: 'Your name', contact: 'Phone or messenger',
    comment: 'Question or comment (optional)', sendWa: 'Send via WhatsApp', sendMail: 'Send by email', call: 'Call',
    price: 'Price', priceAsk: 'Price on request', datesTbd: 'Dates to be confirmed', ctaDefault: 'Send a request', inBio: 'link in bio',
    storiesHint: 'Add a “Link” sticker to your Story with this address:', details: 'Details and booking', noLink: '[page link]',
    day: (n) => `Day ${n}`, days: (n) => `${n} ${n === 1 ? 'day' : 'days'}`, visits: (n) => `${n} company ${n === 1 ? 'visit' : 'visits'}`,
    subDefault: (c) => `A business trip to ${c}: company visits, meetings and networking with the group.`,
    inc: { visits: (n) => `Company visits on the programme: ${n}`, meals: 'Meals on the programme', transfers: 'Transfers and travel on the programme', culture: 'Cultural programme', hotel: (h) => `Accommodation: ${h}`, app: 'Trip app: programme, map and chat with the coordinator' },
    hashtags: ['businesstrip', 'businesstour'], arrow: ' → ',
    msg: { req: 'Request', name: 'Name', contact: 'Contact', comment: 'Comment', src: 'Source' },
    sentNote: 'WhatsApp or your email app will open with the request ready — just press “Send”.', needContact: 'Please enter your name and contact',
  },
  zh: {
    program: '每日行程', included: '费用包含', organizer: '主办方', dates: '日期', route: '路线', duration: '天数', photos: '照片',
    request: '提交报名', requestSub: '留下联系方式，主办方会回复并介绍详情。', name: '您的姓名', contact: '电话或即时通讯',
    comment: '问题或备注（选填）', sendWa: '通过 WhatsApp 发送', sendMail: '通过邮件发送', call: '致电',
    price: '费用', priceAsk: '费用请咨询', datesTbd: '日期待定', ctaDefault: '立即报名', inBio: '链接见主页简介',
    storiesHint: '在快拍中添加“链接”贴纸，地址：', details: '详情与报名', noLink: '[页面链接]',
    day: (n) => `第${n}天`, days: (n) => `${n}天`, visits: (n) => `${n}次企业参访`,
    subDefault: (c) => `${c}商务考察：企业参访、会谈，与团友交流。`,
    inc: { visits: (n) => `行程中的企业参访：${n}次`, meals: '行程内用餐', transfers: '行程内交通与接送', culture: '文化活动', hotel: (h) => `住宿：${h}`, app: '行程应用：日程、地图、与协调人聊天' },
    hashtags: ['商务考察', '企业参访'], arrow: ' → ',
    msg: { req: '报名', name: '姓名', contact: '联系方式', comment: '备注', src: '来源' },
    sentNote: '将打开 WhatsApp 或邮件并填好报名内容，点击“发送”即可。', needContact: '请填写姓名和联系方式',
  },
  kk: {
    program: 'Күндер бойынша бағдарлама', included: 'Не кіреді', organizer: 'Ұйымдастырушы', dates: 'Күндері', route: 'Бағыт', duration: 'Ұзақтығы', photos: 'Фотосуреттер',
    request: 'Өтінім қалдыру', requestSub: 'Байланыс деректеріңізді қалдырыңыз — ұйымдастырушы жауап беріп, толығырақ айтып береді.', name: 'Атыңыз', contact: 'Телефон немесе мессенджер',
    comment: 'Сұрақ немесе түсініктеме (міндетті емес)', sendWa: 'WhatsApp арқылы жіберу', sendMail: 'Поштаға жіберу', call: 'Қоңырау шалу',
    price: 'Құны', priceAsk: 'Құны — сұраныс бойынша', datesTbd: 'Күндері нақтыланады', ctaDefault: 'Өтінім қалдыру', inBio: 'сілтеме профиль сипаттамасында',
    storiesHint: 'Stories-ке «Сілтеме» стикерін мына мекенжаймен қосыңыз:', details: 'Толығырақ және өтінім', noLink: '[бет сілтемесі]',
    day: (n) => `${n}-күн`, days: (n) => `${n} күн`, visits: (n) => `${n} компанияға сапар`,
    subDefault: (c) => `Іскерлік сапар: ${c} — компанияларға бару, кездесулер және топпен танысу.`,
    inc: { visits: (n) => `Бағдарлама бойынша компанияларға сапарлар: ${n}`, meals: 'Бағдарлама бойынша тамақ', transfers: 'Бағдарлама бойынша трансферлер мен жол жүру', culture: 'Мәдени бағдарлама', hotel: (h) => `Тұру: ${h}`, app: 'Сапар қосымшасы: бағдарлама, карта және үйлестірушімен чат' },
    hashtags: ['іссапар', 'бизнестур'], arrow: ' → ',
    msg: { req: 'Өтінім', name: 'Аты', contact: 'Байланыс', comment: 'Түсініктеме', src: 'Қайдан' },
    sentNote: 'WhatsApp немесе пошта дайын өтінім мәтінімен ашылады — «Жіберу» түймесін басу ғана қалады.', needContact: 'Атыңыз бен байланысыңызды жазыңыз',
  },
  ar: {
    program: 'البرنامج يومًا بيوم', included: 'ما يشمله البرنامج', organizer: 'المنظِّم', dates: 'التواريخ', route: 'المسار', duration: 'المدة', photos: 'الصور',
    request: 'أرسل طلبًا', requestSub: 'اترك بيانات التواصل وسيرد عليك المنظِّم بالتفاصيل.', name: 'اسمك', contact: 'الهاتف أو تطبيق المراسلة',
    comment: 'سؤال أو ملاحظة (اختياري)', sendWa: 'إرسال عبر واتساب', sendMail: 'إرسال بالبريد', call: 'اتصال',
    price: 'السعر', priceAsk: 'السعر عند الطلب', datesTbd: 'التواريخ قيد التحديد', ctaDefault: 'سجّل الآن', inBio: 'الرابط في الملف الشخصي',
    storiesHint: 'أضف ملصق «رابط» إلى القصة بهذا العنوان:', details: 'التفاصيل والتسجيل', noLink: '[رابط الصفحة]',
    day: (n) => `اليوم ${n}`,
    days: (n) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? `${n} أيام` : `${n} يومًا`),
    visits: (n) => (n === 1 ? 'زيارة واحدة لشركة' : n === 2 ? 'زيارتان لشركات' : n <= 10 ? `${n} زيارات لشركات` : `${n} زيارة لشركات`),
    subDefault: (c) => `رحلة عمل إلى ${c}: زيارات للشركات ولقاءات وتعارف مع المجموعة.`,
    inc: { visits: (n) => `زيارات الشركات ضمن البرنامج: ${n}`, meals: 'الوجبات ضمن البرنامج', transfers: 'التنقلات ضمن البرنامج', culture: 'برنامج ثقافي', hotel: (h) => `الإقامة: ${h}`, app: 'تطبيق الرحلة: البرنامج والخريطة والدردشة مع المنسق' },
    hashtags: ['رحلة_عمل', 'زيارات_الشركات'], arrow: ' ← ',
    msg: { req: 'طلب', name: 'الاسم', contact: 'التواصل', comment: 'ملاحظة', src: 'المصدر' },
    sentNote: 'سيفتح واتساب أو البريد مع نص الطلب جاهزًا — اضغط «إرسال» فقط.', needContact: 'اكتب اسمك وبيانات التواصل',
  },
  hi: {
    program: 'दिन-ब-दिन कार्यक्रम', included: 'क्या शामिल है', organizer: 'आयोजक', dates: 'तारीख़ें', route: 'रूट', duration: 'अवधि', photos: 'तस्वीरें',
    request: 'आवेदन भेजें', requestSub: 'अपने संपर्क छोड़ें — आयोजक जवाब देकर पूरी जानकारी देंगे।', name: 'आपका नाम', contact: 'फ़ोन या मैसेंजर',
    comment: 'सवाल या टिप्पणी (वैकल्पिक)', sendWa: 'WhatsApp से भेजें', sendMail: 'ईमेल से भेजें', call: 'कॉल करें',
    price: 'कीमत', priceAsk: 'कीमत अनुरोध पर', datesTbd: 'तारीख़ें तय होनी हैं', ctaDefault: 'अभी आवेदन करें', inBio: 'लिंक प्रोफ़ाइल बायो में',
    storiesHint: 'Story में इस पते के साथ «लिंक» स्टिकर जोड़ें:', details: 'विवरण और आवेदन', noLink: '[पेज लिंक]',
    day: (n) => `दिन ${n}`, days: (n) => `${n} दिन`, visits: (n) => `${n} कंपनी विज़िट`,
    subDefault: (c) => `${c} की बिज़नेस यात्रा: कंपनियों में विज़िट, बैठकें और समूह से परिचय।`,
    inc: { visits: (n) => `कार्यक्रम में कंपनी विज़िट: ${n}`, meals: 'कार्यक्रम के अनुसार भोजन', transfers: 'कार्यक्रम के अनुसार ट्रांसफ़र और यात्रा', culture: 'सांस्कृतिक कार्यक्रम', hotel: (h) => `ठहरना: ${h}`, app: 'यात्रा ऐप: कार्यक्रम, नक्शा और समन्वयक से चैट' },
    hashtags: ['बिजनेसट्रिप', 'बिजनेसटूर'], arrow: ' → ',
    msg: { req: 'आवेदन', name: 'नाम', contact: 'संपर्क', comment: 'टिप्पणी', src: 'स्रोत' },
    sentNote: 'WhatsApp या ईमेल तैयार आवेदन के साथ खुलेगा — बस «भेजें» दबाएँ।', needContact: 'नाम और संपर्क लिखें',
  },
};
/** Страна на языке страницы (9 стран платформы). */
const COUNTRY_L: Record<string, Record<Lang, string>> = {
  cn: { ru: 'Китай', en: 'China', zh: '中国', kk: 'Қытай', ar: 'الصين', hi: 'चीन' },
  jp: { ru: 'Япония', en: 'Japan', zh: '日本', kk: 'Жапония', ar: 'اليابان', hi: 'जापान' },
  kr: { ru: 'Южная Корея', en: 'South Korea', zh: '韩国', kk: 'Оңтүстік Корея', ar: 'كوريا الجنوبية', hi: 'दक्षिण कोरिया' },
  th: { ru: 'Таиланд', en: 'Thailand', zh: '泰国', kk: 'Тайланд', ar: 'تايلاند', hi: 'थाईलैंड' },
  vn: { ru: 'Вьетнам', en: 'Vietnam', zh: '越南', kk: 'Вьетнам', ar: 'فيتنام', hi: 'वियतनाम' },
  id: { ru: 'Индонезия', en: 'Indonesia', zh: '印度尼西亚', kk: 'Индонезия', ar: 'إندونيسيا', hi: 'इंडोनेशिया' },
  in: { ru: 'Индия', en: 'India', zh: '印度', kk: 'Үндістан', ar: 'الهند', hi: 'भारत' },
  my: { ru: 'Малайзия', en: 'Malaysia', zh: '马来西亚', kk: 'Малайзия', ar: 'ماليزيا', hi: 'मलेशिया' },
  ae: { ru: 'ОАЭ', en: 'UAE', zh: '阿联酋', kk: 'БАӘ', ar: 'الإمارات', hi: 'संयुक्त अरब अमीरात' },
};
export const countryIn = (code: string, l: Lang) => (COUNTRY_L[code] || COUNTRY_L.cn)[l];

// ——— факты из программы ———
const BORING = /выезд из отеля|трансфер|заселение|брифинг|итоговая встреча|свободное время|departure from|check-in|transfer/i;
export type Facts = { nDays: number; visits: number; cities: string[]; hasMeals: boolean; hasMoves: boolean; hasCulture: boolean; dayLines: string[] };
export function factsOf(p: OProgram): Facts {
  const cities = p.days.map((d) => d.city.trim()).filter((c, i, a) => c && c !== '—' && (i === 0 || a[i - 1] !== c));
  const all = p.days.flatMap((d) => d.events);
  const dayLines = p.days.map((d) => {
    const ev = [...d.events].sort((a, b) => (normTime(a.t) || '12:00').localeCompare(normTime(b.t) || '12:00'));
    const pick = ev.filter((e) => e.kind === 'co' || e.kind === 'culture' || (e.kind !== 'meal' && !BORING.test(e.name)));
    return (pick.length ? pick : ev).slice(0, 4).map((e) => e.name.trim()).filter(Boolean).join(' · ');
  });
  return {
    nDays: Math.max(1, p.days.length), visits: all.filter((e) => e.kind === 'co').length, cities,
    hasMeals: all.some((e) => e.kind === 'meal'), hasMoves: all.some((e) => e.kind === 'move'), hasCulture: all.some((e) => e.kind === 'culture'), dayLines,
  };
}

export function defaultText(lang: Lang, p: OProgram, trip: OTrip | undefined, t: Tenant): PageText {
  const L = PAGE_L[lang];
  const f = factsOf(p);
  const sample = p.source === 'sample' || p.source === 'template';
  const included = [
    f.visits ? L.inc.visits(f.visits) : '', f.hasMeals ? L.inc.meals : '', f.hasMoves ? L.inc.transfers : '', f.hasCulture ? L.inc.culture : '',
    trip?.hotel ? L.inc.hotel(trip.hotel) : '', L.inc.app,
  ].filter(Boolean);
  return {
    title: p.title,
    subtitle: !sample && p.summary.trim() ? p.summary.trim() : L.subDefault(countryIn(p.country, lang)),
    badge: [L.days(f.nDays), f.visits ? L.visits(f.visits) : f.cities.join(L.arrow)].filter(Boolean).join(' · '),
    cta: L.ctaDefault,
    price: '',
    included: included.join('\n'),
    days: f.dayLines,
    about: t.tagline ? `${t.name} — ${t.tagline}` : t.name,
    posts: {},
  };
}

export function newPage(org: Org, p: OProgram, t: Tenant, lang: Lang = LANG): OPage {
  const trip = org.trips.find((x) => x.programId === p.id);
  return {
    id: uid('pg'), programId: p.id, tripId: trip?.id || '', start: trip?.start || '',
    langs: [lang], texts: { [lang]: defaultText(lang, p, trip, t) },
    photos: [], cover: '',
    blocks: BLOCKS.map(([key]) => ({ key, on: true })),
    style: 'photo', bannerPhoto: {}, url: '', slug: slugOf(p.title), created: new Date().toISOString().slice(0, 10),
  };
}
export const slugOf = (s: string) => latin(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'tour';

/** Текст страницы на языке: свой, иначе копия основного языка (организатор переводит сам — автоперевода пока нет). */
export const textIn = (pg: OPage, l: Lang): PageText => pg.texts[l] || pg.texts[pg.langs[0]] || Object.values(pg.texts)[0]!;

// ——— всё, что нужно странице и баннеру на одном языке ———
export type PageCtx = {
  lang: Lang; L: PageLabels; text: PageText; dates: string; route: string; country: string; f: Facts;
  days: { label: string; city: string; line: string }[]; included: string[];
  orgName: string; contact: Org['contact']; accent: string;
};
export function pageCtx(pg: OPage, l: Lang, p: OProgram, org: Org, t: Tenant): PageCtx {
  const L = PAGE_L[l];
  const text = textIn(pg, l);
  const f = factsOf(p);
  let dates = L.datesTbd;
  if (/^\d{4}-\d{2}-\d{2}$/.test(pg.start)) {
    const a = Date.parse(`${pg.start}T00:00:00Z`);
    if (Number.isFinite(a)) dates = rangeLabelIn(l, new Date(a), new Date(a + (f.nDays - 1) * 86400000));
  }
  return {
    lang: l, L, text, dates, route: f.cities.join(L.arrow), country: countryIn(p.country, l), f,
    days: p.days.map((d, i) => ({ label: L.day(i + 1), city: d.city.trim(), line: (text.days[i] ?? f.dayLines[i] ?? '').trim() })),
    included: text.included.split('\n').map((x) => x.trim()).filter(Boolean),
    orgName: t.name, contact: org.contact, accent: t.accent,
  };
}

// ——— ссылки с меткой и тексты постов ———
/** Адрес страницы + utm: в Яндекс Метрике и Google Analytics видно, из какой соцсети пришла заявка. */
export function linkFor(pg: OPage, src: string): string {
  const u = pg.url.trim();
  if (!u) return '';
  const base = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  return `${base}${base.includes('?') ? '&' : '?'}utm_source=${src}&utm_medium=social&utm_campaign=${pg.slug}`;
}
const tag = (s: string) => s.replace(/[^\p{L}\p{N}_]+/gu, '');

/** Собрать подпись так, чтобы влезла в лимит: сначала убираем дни программы с конца, потом пункты «что входит», потом подзаголовок. */
function fit(parts: { head: string[]; sub: string; facts: string[]; program: string[]; programTitle: string; inc: string[]; incTitle: string; price: string; cta: string; tags: string }, limit: number) {
  const build = (q: typeof parts) => [
    q.head.join('\n'),
    q.sub,
    q.facts.join('\n'),
    q.program.length ? `${q.programTitle}:\n${q.program.join('\n')}` : '',
    q.inc.length ? `${q.incTitle}:\n${q.inc.join('\n')}` : '',
    q.price,
    q.cta,
    q.tags,
  ].filter(Boolean).join('\n\n');
  const q = { ...parts, program: [...parts.program], inc: [...parts.inc] };
  let s = build(q);
  while (limit && s.length > limit && q.program.length) { q.program.pop(); s = build(q); }
  while (limit && s.length > limit && q.inc.length) { q.inc.pop(); s = build(q); }
  if (limit && s.length > limit) { q.sub = ''; s = build(q); }
  if (limit && s.length > limit) { q.tags = ''; s = build(q); }
  return limit && s.length > limit ? `${s.slice(0, limit - 1)}…` : s;
}

export function autoPost(net: Net, c: PageCtx, pg: OPage): string {
  const { L, text } = c;
  const link = linkFor(pg, net.src) || L.noLink;
  if (net.key === 'stories') return `${L.storiesHint}\n${link}`;
  const tags = net.key === 'instagram' || net.key === 'vk'
    ? [...L.hashtags, c.country, ...c.f.cities.slice(0, 2)].map(tag).filter(Boolean).map((x) => `#${x.toLowerCase()}`).join(' ')
    : '';
  return fit({
    head: [text.title.trim()],
    sub: text.subtitle.trim(),
    facts: [`📅 ${c.dates}`, c.route ? `📍 ${c.route}` : '', text.badge.trim() ? `⭐ ${text.badge.trim()}` : ''].filter(Boolean),
    programTitle: L.program,
    program: c.days.map((d) => `• ${d.label}${d.city ? `, ${d.city}` : ''}${d.line ? `: ${d.line}` : ''}`),
    incTitle: `✅ ${L.included}`,
    inc: c.included.map((x) => `• ${x}`),
    price: text.price.trim() ? `💰 ${L.price}: ${text.price.trim()}` : '',
    cta: net.clickable ? `${L.details} — ${link}` : `${L.details} — ${L.inBio}`,
    tags,
  }, net.limit);
}
export const postFor = (net: Net, c: PageCtx, pg: OPage) => c.text.posts[net.key] ?? autoPost(net, c, pg);

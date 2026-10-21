// Загрузка программ и участников из файлов (решение 21.10.2026: «через Excel, PDF, Word и вручную»). Всё разбирается
// на устройстве, без сервера: .xlsx и .docx — это zip с XML (fflate), PDF — pdf.js в браузере (public/pdfjs), .csv — текст.
// Таблица разбирается по заголовкам столбцов; Word и PDF — по строкам «День 2 — Шанхай», «10:00 Визит на завод».
// Результат всегда показываем организатору на проверку — он правит и только потом сохраняет.
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';
import { Platform } from 'react-native';

import { COUNTRIES } from './countries';
import { cityIn, findCity, guessKind, normDate, normTime, uid, type ODay, type OEvent, type OPerson, type OProgram, type Source } from './org';
import { xlsx, type Cell } from './xlsx';

export type Picked = { name: string; bytes: Uint8Array; kind: 'xlsx' | 'docx' | 'pdf' | 'csv' };
export const ACCEPT: Record<Picked['kind'], string[]> = {
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  pdf: ['application/pdf', '.pdf'],
  csv: ['text/csv', 'text/comma-separated-values', '.csv'],
};
const kindOf = (name: string): Picked['kind'] | null => {
  const m = name.toLowerCase().match(/\.(xlsx|docx|pdf|csv)$/);
  return m ? (m[1] as Picked['kind']) : null;
};

/** Выбрать файл: в браузере — окно выбора файла, на телефоне — «Файлы». Старые .xls и .doc просим пересохранить. */
export async function pickFile(kinds: Picked['kind'][]): Promise<Picked | { error: string } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: Platform.OS === 'web' ? kinds.flatMap((k) => ACCEPT[k]) : '*/*', copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  if (/\.(xls|doc)$/i.test(a.name)) return { error: 'Старый формат .xls или .doc — сохраните файл как .xlsx или .docx и загрузите снова' };
  const kind = kindOf(a.name);
  if (!kind || !kinds.includes(kind)) return { error: `Нужен файл ${kinds.map((k) => `.${k}`).join(', ')}` };
  const bytes = a.file ? new Uint8Array(await a.file.arrayBuffer()) : await new File(a.uri).bytes();
  return { name: a.name, bytes, kind };
}

// ——— чтение файлов ———
const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const colIndex = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

/** Первый лист .xlsx — строки ячеек (текст или число). */
export function readXlsx(bytes: Uint8Array): Cell[][] {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'xl/sharedStrings.xml' || f.name === 'xl/workbook.xml' || f.name === 'xl/_rels/workbook.xml.rels' || /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name) });
  const text = (n: string) => (files[n] ? strFromU8(files[n]) : '');
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unxml(t[1])).join(''));
  // первый лист по порядку книги, а не по имени файла
  const rid = text('xl/workbook.xml').match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  const target = rid ? text('xl/_rels/workbook.xml.rels').match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1] || text('xl/_rels/workbook.xml.rels').match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1] : undefined;
  const path = target ? `xl/${target.replace(/^\/?xl\//, '')}` : Object.keys(files).filter((n) => n.startsWith('xl/worksheets/')).sort()[0];
  const rows: Cell[][] = [];
  for (const r of text(path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Cell[] = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const t = attrs.match(/\bt="([^"]+)"/)?.[1];
      const body = c[2] || '';
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val: Cell = null;
      if (t === 's') val = shared[Number(v)] ?? '';
      else if (t === 'inlineStr') val = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unxml(m[1])).join('');
      else if (t === 'str' || t === 'e') val = v ? unxml(v) : '';
      else if (t === 'b') val = v === '1' ? 'да' : 'нет';
      else if (v !== undefined) val = Number(v);
      row[ref ? colIndex(ref) : row.length] = val;
    }
    rows.push(Array.from(row, (x) => x ?? null));
  }
  return rows;
}

/** CSV из Excel: разделитель «;» или «,», кавычки, перевод строки внутри кавычек. */
export function readCsv(bytes: Uint8Array): Cell[][] {
  let s = strFromU8(bytes).replace(/^﻿/, '');
  const first = s.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows: Cell[][] = [];
  let row: Cell[] = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"' && s[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  s = '';
  return rows;
}

/** Абзацы .docx; строка таблицы — одна строка, ячейки через « — ». */
export function readDocx(bytes: Uint8Array): string[] {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  let xml = files['word/document.xml'] ? strFromU8(files['word/document.xml']) : '';
  // текст абзаца — только из <w:t>, табуляции и переносы строк — как есть
  const runs = (p: string) => [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)\s*\/>/g)].map((m) => (m[2] === 'tab' ? '\t' : m[2] ? '\n' : unxml(m[1]))).join('');
  xml = xml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (tr) => {
    const cells = [...tr.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) => [...c[0].matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((p) => runs(p[0]).trim()).filter(Boolean).join(', '));
    return `<w:p><w:r><w:t>${cells.filter(Boolean).join(' — ').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`;
  });
  return [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].flatMap((p) => runs(p[0]).split('\n')).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Строки PDF — только в браузере (pdf.js из public/pdfjs, без внешних серверов). */
export async function readPdf(bytes: Uint8Array): Promise<string[]> {
  if (Platform.OS !== 'web') throw new Error('PDF разбирается в браузерной версии кабинета — откройте её на компьютере или планшете');
  const base = webBase();
  // загрузка модуля мимо сборщика: файл лежит рядом с сайтом как есть
  const lib = await (new Function('u', 'return import(u)') as (u: string) => Promise<PdfJs>)(`${base}/pdfjs/pdf.min.mjs`);
  lib.GlobalWorkerOptions.workerSrc = `${base}/pdfjs/pdf.worker.min.mjs`;
  const doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // строки — по высоте базовой линии (кавычки и символы из другого шрифта чуть выше), внутри строки — слева направо
    const items = (tc.items.filter((it) => 'str' in it && (it as PdfItem).str.trim()) as PdfItem[])
      .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || 10 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: (typeof items)[] = [];
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r[0].y - it.y) < Math.max(2, Math.min(r[0].h, it.h) * 0.6));
      if (row) row.push(it); else rows.push([it]);
    }
    for (const r of rows.sort((a, b) => b[0].y - a[0].y)) {
      r.sort((a, b) => a.x - b.x);
      lines.push(r.reduce((acc, it, k) => {
        const prev = r[k - 1];
        const gap = prev ? it.x - (prev.x + prev.w) : 0;
        // большой разрыв — следующий столбец таблицы: разделяем, как ячейки в Word
        const sep = !prev ? '' : gap > it.h * 1.5 ? ' — ' : gap > it.h * 0.12 && !acc.endsWith(' ') && !it.s.startsWith(' ') ? ' ' : '';
        return acc + sep + it.s;
      }, ''));
    }
  }
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
type PdfItem = { str: string; transform: number[]; width?: number; hasEOL?: boolean };
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: Uint8Array; isEvalSupported: boolean }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: (PdfItem | object)[] }> }> }> };
};
/** Путь сайта: на GitHub Pages приложение лежит в /GTT-PLATFORM, локально — в корне. */
export function webBase() {
  if (typeof document === 'undefined') return '';
  const src = [...document.querySelectorAll('script[src]')].map((s) => (s as HTMLScriptElement).src).find((s) => s.includes('/_expo/'));
  return src ? new URL(src).pathname.split('/_expo/')[0] : '';
}

// ——— таблица → программа ———
const norm = (v: Cell) => (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, ' ').trim();
const HEAD: Record<string, RegExp> = {
  program: /^(программа|название программы|название поездки|поездка|тур|program|tour|trip)$/,
  country: /^(страна|country)$/,
  day: /^(день|№ дня|номер дня|дата|day|date)$/,
  city: /^(город|city|место проведения)$/,
  time: /^(время|начало|time|start)$/,
  event: /^(событие|мероприятие|активность|что|визит|программа дня|event|activity|title)$/,
  place: /^(место|описание|адрес|подробности|комментарий|примечание|place|description|details|address|notes?)$/,
  kind: /^(тип|категория|type|category|kind)$/,
};
function headerOf(rows: Cell[][], heads: Record<string, RegExp>, need: string[]) {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const cols: Record<string, number> = {};
    rows[r].forEach((c, i) => {
      const h = norm(c).toLowerCase().replace(/[*:]+$/, '');
      for (const [k, re] of Object.entries(heads)) if (!(k in cols) && re.test(h)) { cols[k] = i; break; }
    });
    if (need.every((k) => k in cols)) return { row: r, cols };
  }
  return null;
}
const KIND_RU: [RegExp, OEvent['kind']][] = [[/визит|компан|встреч|co/i, 'co'], [/еда|обед|ужин|ресторан|meal/i, 'meal'], [/переезд|трансфер|перел|move/i, 'move'], [/культур|экскурс|culture/i, 'culture'], [/друг|инфо|info/i, 'info']];
const kindFrom = (s: string, name: string) => KIND_RU.find(([re]) => re.test(s))?.[1] || guessKind(name);
const countryFrom = (s: string) => {
  const l = s.toLowerCase();
  return Object.values(COUNTRIES).find((c) => l.includes(c.ru.toLowerCase().slice(0, 4)) || l === c.code)?.code;
};
/** Время ячейки: «10:00» или доля суток из Excel (0,4166 = 10:00). */
const timeCell = (v: Cell) => (typeof v === 'number' && v >= 0 && v < 1 ? normTime(`${Math.floor(v * 24)}:${String(Math.round((v * 24 - Math.floor(v * 24)) * 60) % 60).padStart(2, '0')}`) : normTime(norm(v).split(/[–—-]/)[0]));
/** День: номер, «День 2», дата или число Excel-даты. */
const dayKey = (v: Cell) => {
  if (typeof v === 'number') return v > 20000 ? `d${Math.round(v)}` : `n${v}`;
  const s = norm(v);
  const n = s.match(/(\d+)\s*(?:-?й)?\s*(?:день|day)|(?:день|day)\s*(\d+)/i);
  if (n) return `n${n[1] || n[2]}`;
  const d = normDate(s);
  return d ? `d${d}` : s ? `s${s}` : '';
};
/** Дата начала поездки из столбца «Дата», если он заполнен датами. */
const startFrom = (v: Cell) => {
  if (typeof v === 'number' && v > 20000) return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  return normDate(norm(v));
};

export type ProgramImport = { programs: OProgram[]; start?: string; warning?: string };

export function programsFromRows(rows: Cell[][], file: string, source: Source): ProgramImport {
  const h = headerOf(rows, HEAD, ['event']);
  if (!h) return programFromLines(rows.map((r) => r.map(norm).filter(Boolean).join(' — ')).filter(Boolean), file, source);
  const { cols } = h;
  const get = (r: Cell[], k: string) => (k in cols ? r[cols[k]] : null);
  const byProgram = new Map<string, { country: string; days: Map<string, ODay>; order: string[] }>();
  let curProgram = '', curDay = '', curCity = '', start = '';
  const fallbackTitle = file.replace(/\.[^.]+$/, '');
  for (const r of rows.slice(h.row + 1)) {
    const name = norm(get(r, 'event'));
    const pr = norm(get(r, 'program'));
    if (pr) curProgram = pr;
    const title = curProgram || fallbackTitle;
    if (!byProgram.has(title)) byProgram.set(title, { country: '', days: new Map(), order: [] });
    const P = byProgram.get(title)!;
    const country = norm(get(r, 'country'));
    if (country) P.country = countryFrom(country) || P.country;
    const dk = dayKey(get(r, 'day'));
    if (dk) { curDay = dk; if (!start) start = startFrom(get(r, 'day')); }
    const city = norm(get(r, 'city'));
    if (city) curCity = city;
    if (!name) continue;
    const k = curDay || 'n1';
    if (!P.days.has(k)) { P.days.set(k, { city: curCity, note: '', events: [] }); P.order.push(k); }
    const D = P.days.get(k)!;
    if (city) D.city = city;
    const place = norm(get(r, 'place'));
    D.events.push({ id: uid('e'), t: timeCell(get(r, 'time')) || '', name, place, kind: kindFrom(norm(get(r, 'kind')), `${name} ${place}`) });
  }
  const programs: OProgram[] = [...byProgram.entries()].filter(([, P]) => P.order.length).map(([title, P]) => {
    const order = [...P.order].sort((a, b) => (a[0] === b[0] && a[0] !== 's' ? (a[0] === 'n' ? Number(a.slice(1)) - Number(b.slice(1)) : a.localeCompare(b)) : 0));
    const days = order.map((k) => P.days.get(k)!);
    fillTimes(days);
    const text = days.flatMap((d) => [d.city, ...d.events.map((e) => `${e.name} ${e.place}`)]).join(' ');
    return { id: uid('p'), title, country: P.country || countryFrom(text) || cityCountry(days) || 'cn', summary: '', days, source, file };
  });
  return programs.length ? { programs, start: start || undefined } : { programs: [], warning: 'В таблице не нашлось строк с событиями — проверьте столбец «Событие»' };
}

const cityCountry = (days: ODay[]) => days.map((d) => findCity(d.city)?.country).find(Boolean);
/** Событиям без времени — время по порядку, чтобы день читался: 09:30, 11:30, обед 13:00, 15:00… */
function fillTimes(days: ODay[]) {
  for (const d of days) {
    let next = 570;
    for (const e of d.events) {
      if (e.t) { const [hh, mm] = e.t.split(':').map(Number); next = hh * 60 + mm + 120; continue; }
      const m = e.kind === 'meal' && next < 780 ? 780 : next;
      e.t = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      next = m + 120;
    }
  }
}

// ——— текст (Word, PDF) → программа ———
const MONTH_RE = /(\d{1,2})\s+(январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)/i;
// \b в JS не видит границу кириллического слова — конец слова проверяем явно
const DAY_RE = /^(?:день|day)\s*(\d{1,2})(?![\d:.])|^(\d{1,2})\s*(?:-?й)?\s*(?:день|day)(?=$|[\s:.,—–-])/i;
const TIME_RE = /^(\d{1,2}[:.]\d{2})(?:\s*[–—-]\s*\d{1,2}[:.]\d{2})?\s*[—–:\-|·]?\s*(.+)$/;
const BULLET_RE = /^[•·▪●◦\-–—*]\s*(.+)$/;

export function programFromLines(lines: string[], file: string, source: Source): ProgramImport {
  const days: ODay[] = [];
  let title = '';
  let intro: string[] = [];
  let start = '';
  const cur = () => days[days.length - 1];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const dm = line.match(DAY_RE);
    const date = !dm && (line.match(/^(\d{1,2}[./]\d{1,2}[./]\d{4})\b/) || (line.length < 60 && line.match(MONTH_RE) && !TIME_RE.test(line) ? [line] : null));
    if (dm || date) {
      if (date && !start) start = normDate(String(date[1] || '')) || '';
      const rest = line.replace(DAY_RE, '').replace(/^\d{1,2}[./]\d{1,2}[./]\d{4}/, '').replace(/^[\s—–:\-|,.·]+/, '').trim();
      const c = cityIn(rest) || cityIn(line);
      days.push({ city: c ? c.ru.replace(/\s*\(.*\)/, '').split(' / ')[0] : rest.split(/[,.—–:(]/)[0].trim().slice(0, 40), note: '', events: [] });
      continue;
    }
    const tm = line.match(TIME_RE);
    if (tm && normTime(tm[1])) {
      if (!days.length) days.push({ city: '', note: '', events: [] });
      const [name, ...more] = tm[2].split(/\s+[—–]\s+|\s+-\s+|\s*\|\s*|:\s+/);
      cur().events.push({ id: uid('e'), t: normTime(tm[1]), name: name.trim(), place: more.join(' — ').trim(), kind: guessKind(tm[2]) });
      if (!cur().city) { const c = cityIn(tm[2]); if (c) cur().city = c.ru.replace(/\s*\(.*\)/, '').split(' / ')[0]; }
      continue;
    }
    if (!title && !days.length && line.length <= 120 && !/^(программа|program)\s*:?$/i.test(line)) { title = line.replace(/^программа( поездки)?\s*[:«"]?\s*/i, '').replace(/[»"]$/, ''); continue; }
    if (!days.length) { intro.push(line); continue; }
    const b = line.match(BULLET_RE);
    const text = b ? b[1] : line;
    const kind = guessKind(text);
    // строка с действием — событие (время подставим по порядку), остальное — примечание дня
    if (b || kind !== 'info') {
      const [name, ...more] = text.split(/\s+[—–]\s+|\s+-\s+|:\s+/);
      cur().events.push({ id: uid('e'), t: '', name: name.trim().slice(0, 120), place: more.join(' — ').trim(), kind });
    } else cur().note = [cur().note, line].filter(Boolean).join('\n').slice(0, 600);
    if (!cur().city) { const c = cityIn(line); if (c) cur().city = c.ru.replace(/\s*\(.*\)/, '').split(' / ')[0]; }
  }
  if (!days.length && intro.length) {
    // нет разметки по дням — всё в один день, организатор разнесёт сам
    days.push({ city: cityIn(intro.join(' '))?.ru || '', note: '', events: intro.slice(0, 30).map((l) => ({ id: uid('e'), t: '', name: l.slice(0, 120), place: '', kind: guessKind(l) })) });
    intro = [];
  }
  fillTimes(days);
  const text = [title, ...intro, ...days.flatMap((d) => [d.city, ...d.events.map((e) => e.name)])].join(' ');
  const program: OProgram = {
    id: uid('p'), title: title || file.replace(/\.[^.]+$/, ''), country: countryFrom(text) || cityCountry(days) || 'cn',
    summary: intro.slice(0, 3).join(' ').slice(0, 400), days, source, file,
  };
  return days.length && days.some((d) => d.events.length)
    ? { programs: [program], start: start || undefined }
    : { programs: [], warning: 'Не удалось найти дни и время в файле — проверьте, что в нём есть строки вида «День 1» и «10:00 Визит…», или заполните программу вручную' };
}

/** Любой файл → программы на проверку. */
export async function importProgram(f: Picked): Promise<ProgramImport> {
  if (f.kind === 'xlsx') return programsFromRows(readXlsx(f.bytes), f.name, 'xlsx');
  if (f.kind === 'csv') return programsFromRows(readCsv(f.bytes), f.name, 'csv');
  if (f.kind === 'docx') return programFromLines(readDocx(f.bytes), f.name, 'docx');
  return programFromLines(await readPdf(f.bytes), f.name, 'pdf');
}

// ——— участники ———
const PHEAD: Record<string, RegExp> = {
  name: /^(фио|ф\.и\.о\.?|имя и фамилия|фамилия и имя|участник|делегат|full name|name)$/,
  last: /^(фамилия|last name|surname)$/,
  first: /^(имя|first name)$/,
  company: /^(компания|организация|company|organization)$/,
  role: /^(должность|позиция|роль|role|position|title|job title)$/,
  phone: /^(телефон|мобильный|тел\.?|phone|mobile)$/,
  email: /^(почта|e-?mail|эл\.? почта|электронная почта)$/,
};
export function peopleFromRows(rows: Cell[][]): { people: OPerson[]; warning?: string } {
  const h = headerOf(rows, PHEAD, []);
  const ok = h && ('name' in h.cols || 'last' in h.cols || 'first' in h.cols);
  const cols = ok ? h!.cols : { name: 0, company: 1, role: 2, phone: 3, email: 4 };
  const body = ok ? rows.slice(h!.row + 1) : rows;
  const g = (r: Cell[], k: string) => (k in cols ? norm(r[(cols as Record<string, number>)[k]]) : '');
  const people = body.map((r) => {
    const name = g(r, 'name') || [g(r, 'last'), g(r, 'first')].filter(Boolean).join(' ');
    return { id: uid('u'), name, company: g(r, 'company'), role: g(r, 'role'), phone: g(r, 'phone'), email: g(r, 'email'), invite: 'new' as const };
  }).filter((p) => p.name && !/^(фио|имя|name)$/i.test(p.name));
  return people.length ? { people } : { people, warning: 'В таблице не нашлось участников — нужен столбец «ФИО» или «Имя»' };
}
export async function importPeople(f: Picked) {
  if (f.kind === 'xlsx') return peopleFromRows(readXlsx(f.bytes));
  if (f.kind === 'csv') return peopleFromRows(readCsv(f.bytes));
  return { people: [] as OPerson[], warning: 'Участников загружаем из Excel или CSV' };
}

// ——— шаблоны Excel для скачивания ———
export const programTemplate = () => xlsx([{
  name: 'Программа',
  widths: [34, 12, 8, 16, 8, 36, 40, 12],
  rows: [
    ['Программа', 'Страна', 'День', 'Город', 'Время', 'Событие', 'Место / описание', 'Тип'],
    ['Деловая поездка в Китай', 'Китай', 1, 'Шанхай', '14:00', 'Прилёт и трансфер в отель', 'Аэропорт Пудун', 'Переезд'],
    ['', '', 1, 'Шанхай', '19:30', 'Приветственный ужин', 'Ресторан [уточнить]', 'Еда'],
    ['', '', 2, 'Шанхай', '10:00', 'Визит на завод', '[компания] — экскурсия по цехам', 'Визит'],
    ['', '', 2, 'Шанхай', '13:00', 'Обед', 'Ресторан рядом с заводом', 'Еда'],
    ['', '', 3, 'Ханчжоу', '08:30', 'Поезд в Ханчжоу', 'Скоростной поезд', 'Переезд'],
    ['', '', 3, 'Ханчжоу', '15:00', 'Чайная церемония', 'Культурная программа', 'Культура'],
  ],
}]);
export const peopleTemplate = () => xlsx([{
  name: 'Участники',
  widths: [28, 28, 28, 18, 26],
  rows: [['ФИО', 'Компания', 'Должность', 'Телефон', 'Почта'], ['Иван Петров', 'Пример Ритейл', 'Коммерческий директор', '+7 900 000-00-00', 'ivan@example.com'], ['Ольга Сидорова', 'Пример Логистика', 'Директор по логистике', '', '']],
}]);

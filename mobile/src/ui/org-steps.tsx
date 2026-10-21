// Шаги кабинета организатора: компания, программы (вручную, шаблон, Excel, Word, PDF), поездка, участники, приглашение.
// Бренд — общая форма ui/brand-form.tsx. Все изменения сразу сохраняются (до сервера — на этом устройстве).
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { countryOf } from '@/data/countries';
import { importPeople, importProgram, peopleTemplate, pickFile, programTemplate, webBase } from '@/data/import';
import {
  COUNTRY_LIST, KINDS, SOURCE_RU, WEB_URL, addSample, daysRu, eventsCount, isIsoDate, newTrip, normDate, normTime, ruDate, templateProgram, tripDates, uid,
  type ODay, type OEvent, type OPerson, type OProgram, type OTrip, type Org,
} from '@/data/org';
import { plural } from '@/data/group';
import { qrSvg } from '@/data/qr';
import { REGION_RU, allTenants, type DataRegion, type Tenant } from '@/data/tenant';
import { useToast } from '@/state/toast';
import { shareFile } from './files';
import { Icon } from './Icon';
import { Button, Card, Check, Chip, Chips, Field, H3, Label, Pick, Section, T, TitleRow, inputStyle } from './kit';
import { ActionTile } from './org-ui';
import { C, F, SH } from './theme';

type Upd = (fn: (o: Org) => Org) => void;
const REGIONS = Object.entries(REGION_RU) as [DataRegion, string][];

// ——— 1. Компания ———
export function CompanyStep({ t, patch, org, upd, saved, onCreate }: { t: Tenant; patch: (p: Partial<Tenant>) => void; org: Org; upd: Upd; saved: boolean; onCreate: () => void }) {
  const c = org.contact;
  const setC = (p: Partial<Org['contact']>) => upd((o) => ({ ...o, contact: { ...o.contact, ...p } }));
  return (
    <>
      <Card>
        <H3>Организация</H3>
        <Field label="Название компании *" value={t.name} onChangeText={(name) => patch({ name })} placeholder="Например, Деловые поездки в Азию" />
        <Field label="Слоган под названием" value={t.tagline} onChangeText={(tagline) => patch({ tagline })} placeholder="Чем вы занимаетесь" />
      </Card>
      <Card>
        <H3>Контакты для связи с платформой</H3>
        <Field label="Почта" value={c.email} onChangeText={(email) => setC({ email })} placeholder="office@example.com" keyboardType="email-address" />
        <Field label="Телефон" value={c.phone} onChangeText={(phone) => setC({ phone })} placeholder="+7 900 000-00-00" keyboardType="phone-pad" />
        <Field label="Сайт" value={c.site} onChangeText={(site) => setC({ site })} placeholder="example.com" />
        <T muted>Это показ: до подключения сервера ничего никуда не отправляется и хранится только на этом устройстве.</T>
      </Card>
      <Card>
        <H3>Где хранить данные участников</H3>
        <Chips>{REGIONS.map(([k, ru]) => <Pick key={k} title={ru} on={t.region === k} onPress={() => patch({ region: k })} />)}</Chips>
        <T muted>Выбирайте страну, где работает ваша компания: например, для России закон требует хранить данные граждан в России.</T>
      </Card>
      {!saved ? <Button title="Создать кабинет" icon="check" onPress={onCreate} /> : null}
    </>
  );
}

// ——— 3. Программы ———
type Edit = { p: OProgram; banner?: string; start?: string; isNew: boolean };

export function ProgramsStep({ org, upd, onPreview, goTrip }: { org: Org; upd: Upd; onPreview: (programId: string) => void; goTrip: () => void }) {
  const toast = useToast();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [tpl, setTpl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState('');
  const [armed, setArmed] = useState('');
  const open = (e: Edit) => { setEdit(e); setWarn(''); onPreview(e.p.id); };

  const load = async (kinds: ('xlsx' | 'csv' | 'docx' | 'pdf')[]) => {
    if (busy) return;
    setWarn('');
    const f = await pickFile(kinds);
    if (!f) return;
    if ('error' in f) { setWarn(f.error); return; }
    setBusy(true);
    try {
      const r = await importProgram(f);
      if (!r.programs.length) { setWarn(r.warning || 'Ничего не распознано'); return; }
      if (r.programs.length === 1) {
        const p = r.programs[0];
        open({ p, isNew: true, start: r.start, banner: `Распознано из «${f.name}»: ${daysRu(p.days.length)}, ${eventsCount(p)} ${plural(eventsCount(p), 'событие', 'события', 'событий')}. Проверьте, поправьте и сохраните.` });
      } else {
        upd((o) => ({ ...o, programs: [...o.programs, ...r.programs] }));
        toast(`Из «${f.name}» добавлено программ: ${r.programs.length}`);
      }
    } catch (e) {
      setWarn(e instanceof Error ? e.message : 'Не получилось прочитать файл');
    } finally {
      setBusy(false);
    }
  };
  const save = (p: OProgram) => {
    const e = edit!;
    upd((o) => {
      const programs = o.programs.some((x) => x.id === p.id) ? o.programs.map((x) => (x.id === p.id ? p : x)) : [...o.programs, p];
      // даты из файла — сразу черновик поездки
      const trips = e.isNew && e.start && isIsoDate(e.start) ? [...o.trips, newTrip(p, e.start)] : o.trips;
      return { ...o, programs, trips };
    });
    toast(e.isNew && e.start ? `Сохранено. Поездка с ${ruDate(e.start)} — черновик на шаге «Поездка»` : 'Программа сохранена');
    setEdit(null);
  };
  const remove = (p: OProgram) => {
    if (armed !== p.id) { setArmed(p.id); return; }
    upd((o) => ({ ...o, programs: o.programs.filter((x) => x.id !== p.id), trips: o.trips.filter((x) => x.programId !== p.id) }));
    setArmed('');
  };

  if (edit) return <ProgramEditor key={edit.p.id} init={edit.p} banner={edit.banner} onSave={save} onCancel={() => setEdit(null)} onChange={(p) => onPreview(p.id)} />;
  return (
    <>
      {!org.programs.length ? (
        <Card tone="info">
          <H3>Программ пока нет</H3>
          <T>Добавьте первую: загрузите файл, который у вас уже есть, или заполните вручную. Всё распознанное вы проверите и поправите перед сохранением.</T>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ActionTile icon="doc" title="Заполнить вручную" sub="Дни, время, визиты, обеды и переезды — прямо здесь" onPress={() => open({ isNew: true, p: { id: uid('p'), title: '', country: 'cn', summary: '', source: 'manual', days: [{ city: '', note: '', events: [] }] } })} />
        <ActionTile icon="grid" title="Загрузить Excel" sub=".xlsx или .csv: строка — событие; столбцы «День», «Время», «Событие»" onPress={() => load(['xlsx', 'csv'])} />
        <ActionTile icon="book" title="Загрузить Word" sub=".docx: «День 1 — Шанхай», «10:00 Визит на завод», таблицы" onPress={() => load(['docx'])} />
        <ActionTile icon="passport" title="Загрузить PDF" sub="PDF с текстом (из Word, с сайта). Сканы-картинки не читаются" onPress={() => load(['pdf'])} />
        <ActionTile icon="globe" title="Из шаблона" sub="Каркас деловой поездки по стране — 9 стран" onPress={() => setTpl(!tpl)} />
        {!org.programs.some((p) => p.source === 'sample') ? <ActionTile icon="star" title="Пример поездки" sub="Вымышленная поездка с участниками — посмотреть, как всё работает" onPress={() => { upd(addSample); toast('Пример добавлен: программа, поездка и участники'); }} /> : null}
      </View>
      {busy ? <Card tone="info"><T>Читаю файл…</T></Card> : null}
      {warn ? <Card tone="warn"><T>{warn}</T></Card> : null}
      {tpl ? (
        <Card>
          <H3>Шаблон для страны</H3>
          <Chips>{COUNTRY_LIST.map(([c, ru]) => <Pick key={c} title={ru} on={false} onPress={() => { setTpl(false); open({ isNew: true, p: templateProgram(c), banner: 'Шаблон: замените заглушки [уточнить] на свои компании, рестораны и время.' }); }} />)}</Chips>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Скачать шаблон Excel" kind="ghost" icon="share" small onPress={() => shareFile('Шаблон-программы.xlsx', programTemplate(), 'xlsx')} />
      </View>
      {org.programs.length ? <Section title={`Ваши программы · ${org.programs.length}`} /> : null}
      {org.programs.map((p) => (
        <Card key={p.id}>
          <TitleRow title={p.title || 'Без названия'} right={<Chip tone={p.source === 'sample' ? 'warn' : 'info'}>{SOURCE_RU[p.source]}</Chip>} />
          <T muted>{`${countryOf(p.country).ru} · ${daysRu(p.days.length)} · ${eventsCount(p)} ${plural(eventsCount(p), 'событие', 'события', 'событий')}${p.file ? ` · ${p.file}` : ''}`}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button title="Изменить" kind="light" small icon="doc" onPress={() => open({ p, isNew: false })} />
            <Button title="Поездка по программе" kind="light" small icon="cal" onPress={() => { if (!org.trips.some((x) => x.programId === p.id)) upd((o) => ({ ...o, trips: [...o.trips, newTrip(p, '2026-11-16')] })); goTrip(); }} />
            <Button title={armed === p.id ? 'Нажмите ещё раз — удалить' : 'Удалить'} kind="ghost" small onPress={() => remove(p)} />
          </View>
        </Card>
      ))}
    </>
  );
}

function ProgramEditor({ init, banner, onSave, onCancel, onChange }: { init: OProgram; banner?: string; onSave: (p: OProgram) => void; onCancel: () => void; onChange: (p: OProgram) => void }) {
  const [p, setP] = useState<OProgram>(init);
  const toast = useToast();
  const set = (fn: (x: OProgram) => OProgram) => setP((x) => { const n = fn(x); onChange(n); return n; });
  const setDay = (i: number, d: Partial<ODay>) => set((x) => ({ ...x, days: x.days.map((y, k) => (k === i ? { ...y, ...d } : y)) }));
  const setEv = (i: number, j: number, e: Partial<OEvent>) => set((x) => ({ ...x, days: x.days.map((y, k) => (k === i ? { ...y, events: y.events.map((z, m) => (m === j ? { ...z, ...e } : z)) } : y)) }));
  const addEv = (i: number) => set((x) => ({ ...x, days: x.days.map((y, k) => (k === i ? { ...y, events: [...y.events, { id: uid('e'), t: '', name: '', place: '', kind: 'co' }] } : y)) }));
  const delEv = (i: number, j: number) => set((x) => ({ ...x, days: x.days.map((y, k) => (k === i ? { ...y, events: y.events.filter((_, m) => m !== j) } : y)) }));
  const save = () => {
    if (!p.title.trim()) { toast('Впишите название программы'); return; }
    if (!p.days.length) { toast('Добавьте хотя бы один день'); return; }
    onSave({ ...p, title: p.title.trim(), days: p.days.map((d) => ({ ...d, events: d.events.filter((e) => e.name.trim()).map((e) => ({ ...e, t: normTime(e.t) || '12:00' })) })) });
  };
  return (
    <>
      {banner ? <Card tone="info"><T>{banner}</T></Card> : null}
      <Card>
        <H3>Программа</H3>
        <Field label="Название *" value={p.title} onChangeText={(title) => set((x) => ({ ...x, title }))} placeholder="Например, Умные фабрики Китая" />
        <Label>Страна</Label>
        <Chips>{COUNTRY_LIST.map(([c, ru]) => <Pick key={c} title={ru} on={p.country === c} onPress={() => set((x) => ({ ...x, country: c }))} />)}</Chips>
        <Field label="Коротко о программе" value={p.summary} onChangeText={(summary) => set((x) => ({ ...x, summary }))} placeholder="Для кого и зачем эта поездка" multiline />
      </Card>
      {p.days.map((d, i) => (
        <Card key={i}>
          <TitleRow title={`День ${i + 1}`} right={p.days.length > 1 ? <Button title="Удалить день" kind="ghost" small onPress={() => set((x) => ({ ...x, days: x.days.filter((_, k) => k !== i) }))} /> : undefined} />
          <Field label="Город" value={d.city} onChangeText={(city) => setDay(i, { city })} placeholder="Например, Шанхай" />
          {d.events.length ? <Label>Время · событие · место · тип</Label> : <T muted>Событий пока нет — добавьте визит, обед или переезд.</T>}
          {d.events.map((e, j) => <EventRow key={e.id} e={e} onChange={(x) => setEv(i, j, x)} onRemove={() => delEv(i, j)} />)}
          <View style={{ flexDirection: 'row' }}><Button title="Добавить событие" icon="plus" kind="light" small onPress={() => addEv(i)} /></View>
          <Field label="Примечание дня" value={d.note} onChangeText={(note) => setDay(i, { note })} placeholder="Например, дресс-код или что взять с собой" multiline />
        </Card>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Добавить день" icon="plus" kind="light" onPress={() => set((x) => ({ ...x, days: [...x.days, { city: x.days[x.days.length - 1]?.city || '', note: '', events: [] }] }))} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Сохранить программу" icon="check" onPress={save} />
        <Button title="Отмена" kind="ghost" onPress={onCancel} />
      </View>
    </>
  );
}

const KIND_ICON: Record<OEvent['kind'], 'building' | 'food' | 'bus' | 'culture' | 'doc'> = { co: 'building', meal: 'food', move: 'bus', culture: 'culture', info: 'doc' };
function EventRow({ e, onChange, onRemove }: { e: OEvent; onChange: (p: Partial<OEvent>) => void; onRemove: () => void }) {
  const kind = KINDS.find(([k]) => k === e.kind) || KINDS[0];
  const nextKind = () => onChange({ kind: KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length][0] });
  const inp = [inputStyle, { minHeight: 40, paddingVertical: 8 }];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderColor: C.line2 }}>
      <TextInput value={e.t} onChangeText={(t) => onChange({ t })} onEndEditing={() => onChange({ t: normTime(e.t) || e.t })} placeholder="10:00" placeholderTextColor={C.muted}
        accessibilityLabel="Время" style={[...inp, { width: 72 }]} />
      <TextInput value={e.name} onChangeText={(name) => onChange({ name })} placeholder="Событие" placeholderTextColor={C.muted} accessibilityLabel="Событие" style={[...inp, { flexGrow: 2, flexBasis: 170, minWidth: 0 }]} />
      <TextInput value={e.place} onChangeText={(place) => onChange({ place })} placeholder="Место или описание" placeholderTextColor={C.muted} accessibilityLabel="Место" style={[...inp, { flexGrow: 2, flexBasis: 170, minWidth: 0 }]} />
      <Pressable onPress={nextKind} accessibilityRole="button" accessibilityLabel={`Тип: ${kind[1]}. Нажмите, чтобы сменить`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.blueSoft }}>
        <Icon name={KIND_ICON[e.kind]} size={15} color={C.blueInk} />
        <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.blueInk }}>{kind[1]}</Text>
      </Pressable>
      <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Удалить событие ${e.name}`} hitSlop={6}
        style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, boxShadow: SH.small }}>
        <Icon name="trash" size={16} color={C.muted} />
      </Pressable>
    </View>
  );
}

// ——— 4. Поездка ———
export function TripStep({ org, upd, sel, setSel, goPrograms }: { org: Org; upd: Upd; sel: string; setSel: (id: string) => void; goPrograms: () => void }) {
  const toast = useToast();
  const [prog, setProg] = useState(org.programs[0]?.id || '');
  const [start, setStart] = useState('16.11.2026');
  const [armed, setArmed] = useState(false);
  const trip = org.trips.find((x) => x.id === sel);
  const setTrip = (p: Partial<OTrip>) => upd((o) => ({ ...o, trips: o.trips.map((x) => (x.id === sel ? { ...x, ...p } : x)) }));
  const nDays = (tr: OTrip) => org.programs.find((x) => x.id === tr.programId)?.days.length || 1;
  if (!org.programs.length) {
    return (
      <Card tone="info">
        <H3>Сначала программа</H3>
        <T>Поездка — это программа с датами, отелем и участниками. Добавьте программу на шаге «Программы».</T>
        <View style={{ flexDirection: 'row' }}><Button title="К программам" icon="route" onPress={goPrograms} /></View>
      </Card>
    );
  }
  const create = () => {
    const iso = normDate(start);
    const p = org.programs.find((x) => x.id === prog);
    if (!p) { toast('Выберите программу'); return; }
    if (!iso) { toast('Дата начала — в формате ДД.ММ.ГГГГ'); return; }
    const tr = newTrip(p, iso);
    upd((o) => ({ ...o, trips: [...o.trips, tr] }));
    setSel(tr.id);
    toast('Поездка создана — проверьте отель и откройте её участникам');
  };
  return (
    <>
      {org.trips.map((tr) => (
        <Card key={tr.id} onPress={() => setSel(tr.id)} label={`Поездка ${tr.title}`} tone={tr.id === sel ? 'accent' : undefined}>
          <TitleRow title={tr.title} right={<Chip tone={tr.published ? 'ok' : 'warn'}>{tr.published ? (org.active === tr.id ? 'видят участники' : 'опубликована') : 'черновик'}</Chip>} />
          <T muted>{`${tripDates(tr.start, nDays(tr))} · ${tr.people.length} ${plural(tr.people.length, 'участник', 'участника', 'участников')}`}</T>
        </Card>
      ))}
      {trip ? (
        <Card>
          <H3>{`Поездка: ${trip.title}`}</H3>
          <Field label="Название для участников" value={trip.title} onChangeText={(title) => setTrip({ title })} />
          <DateField key={trip.id} value={trip.start} onChange={(s) => setTrip({ start: s })} />
          <Field label="Отель группы" value={trip.hotel} onChangeText={(hotel) => setTrip({ hotel })} placeholder="Название отеля — если уже известно" />
          <Check on={trip.published && org.active === trip.id} onPress={() => {
            const on = !(trip.published && org.active === trip.id);
            upd((o) => ({ ...o, active: on ? trip.id : o.active === trip.id ? '' : o.active, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, published: on } : x)) }));
          }}>Открыть участникам — эту поездку увидят по коду приглашения</Check>
          <View style={{ flexDirection: 'row' }}>
            <Button title={armed ? 'Нажмите ещё раз — удалить поездку' : 'Удалить поездку'} kind="ghost" small onPress={() => {
              if (!armed) { setArmed(true); return; }
              upd((o) => ({ ...o, trips: o.trips.filter((x) => x.id !== trip.id), active: o.active === trip.id ? '' : o.active }));
              setSel(''); setArmed(false);
            }} />
          </View>
        </Card>
      ) : null}
      <Card>
        <H3>Новая поездка</H3>
        <Label>Программа</Label>
        <Chips>{org.programs.map((p) => <Pick key={p.id} title={p.title || 'Без названия'} on={prog === p.id} onPress={() => setProg(p.id)} />)}</Chips>
        <Field label="Дата начала (ДД.ММ.ГГГГ)" value={start} onChangeText={setStart} placeholder="16.11.2026" />
        <View style={{ flexDirection: 'row' }}><Button title="Создать поездку" icon="cal" onPress={create} /></View>
      </Card>
    </>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [v, setV] = useState(ruDate(value));
  return (
    <>
      <Field label="Дата начала (ДД.ММ.ГГГГ)" value={v} onChangeText={(x) => { setV(x); const iso = normDate(x); if (iso) onChange(iso); }} placeholder="16.11.2026" />
      {!normDate(v) ? <T muted>Формат: 16.11.2026</T> : null}
    </>
  );
}

// ——— 5. Участники ———
export function PeopleStep({ org, upd, sel, setSel, goTrip }: { org: Org; upd: Upd; sel: string; setSel: (id: string) => void; goTrip: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', company: '', role: '', phone: '', email: '' });
  const [warn, setWarn] = useState('');
  const trip = org.trips.find((x) => x.id === sel) || org.trips[0];
  if (!trip) {
    return (
      <Card tone="info">
        <H3>Сначала поездка</H3>
        <T>Участники добавляются в конкретную поездку. Создайте её на шаге «Поездка».</T>
        <View style={{ flexDirection: 'row' }}><Button title="К поездке" icon="cal" onPress={goTrip} /></View>
      </Card>
    );
  }
  const setPeople = (fn: (p: OPerson[]) => OPerson[]) => upd((o) => ({ ...o, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, people: fn(x.people) } : x)) }));
  const add = () => {
    if (!f.name.trim()) { toast('Впишите имя участника'); return; }
    setPeople((p) => [...p, { id: uid('u'), ...f, name: f.name.trim(), invite: 'new' }]);
    setF({ name: '', company: '', role: '', phone: '', email: '' });
  };
  const load = async () => {
    setWarn('');
    const file = await pickFile(['xlsx', 'csv']);
    if (!file) return;
    if ('error' in file) { setWarn(file.error); return; }
    const r = await importPeople(file);
    if (!r.people.length) { setWarn(r.warning || 'Участников не нашлось'); return; }
    setPeople((p) => [...p, ...r.people]);
    toast(`Добавлено участников: ${r.people.length}`);
  };
  const INV: Record<OPerson['invite'], [string, 'info' | 'warn' | 'ok']> = { new: ['не приглашён', 'warn'], sent: ['приглашение отправлено', 'info'], joined: ['в приложении', 'ok'] };
  return (
    <>
      {org.trips.length > 1 ? <Chips>{org.trips.map((x) => <Pick key={x.id} title={x.title} on={x.id === trip.id} onPress={() => setSel(x.id)} />)}</Chips> : null}
      <Card tone="info"><T>{`Поездка «${trip.title}». Участников можно добавить по одному или загрузить списком из Excel. До подключения сервера список хранится только на этом устройстве.`}</T></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ActionTile icon="grid" title="Загрузить из Excel" sub="Столбцы «ФИО», «Компания», «Должность», «Телефон», «Почта»" onPress={load} />
        <ActionTile icon="share" title="Шаблон Excel" sub="Скачать пустую таблицу участников" onPress={() => shareFile('Шаблон-участники.xlsx', peopleTemplate(), 'xlsx')} />
      </View>
      {warn ? <Card tone="warn"><T>{warn}</T></Card> : null}
      <Card>
        <H3>Добавить вручную</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {([['name', 'Имя и фамилия *'], ['company', 'Компания'], ['role', 'Должность'], ['phone', 'Телефон'], ['email', 'Почта']] as const).map(([k, l]) => (
            <View key={k} style={{ flexGrow: 1, flexBasis: 220, minWidth: 0 }}>
              <Field label={l} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} keyboardType={k === 'phone' ? 'phone-pad' : k === 'email' ? 'email-address' : undefined} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}><Button title="Добавить участника" icon="plus" onPress={add} /></View>
      </Card>
      <Section title={`Участники · ${trip.people.length}`} />
      {trip.people.length ? (
        <Card>
          {trip.people.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line2 }}>
              <View style={{ flexGrow: 1, flexBasis: 200, minWidth: 0 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14.5, color: C.ink }}>{p.name}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{[p.role, p.company, p.phone, p.email].filter(Boolean).join(' · ') || '—'}</Text>
              </View>
              <Chip tone={INV[p.invite][1]}>{INV[p.invite][0]}</Chip>
              <Pressable onPress={() => setPeople((x) => x.filter((y) => y.id !== p.id))} accessibilityRole="button" accessibilityLabel={`Убрать ${p.name}`} hitSlop={6}>
                <Icon name="trash" size={16} color={C.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : <T muted>Пока никого нет.</T>}
    </>
  );
}

// ——— 6. Приглашение ———
export function InviteStep({ t, patch, org, upd, sel, openAsDelegate }: { t: Tenant; patch: (p: Partial<Tenant>) => void; org: Org; upd: Upd; sel: string; openAsDelegate: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState(t.code);
  const trip = org.trips.find((x) => x.id === sel) || org.trips.find((x) => x.id === org.active) || org.trips[0];
  const base = Platform.OS === 'web' && typeof location !== 'undefined' ? `${location.origin}${webBase()}` : WEB_URL;
  const link = `${base}/join?code=${t.code}`;
  const taken = allTenants().some((x) => x.id !== t.id && x.code.toLowerCase() === code.toLowerCase());
  const okCode = /^[A-Z0-9]{3,12}$/.test(code) && !taken;
  const text = `Здравствуйте! Приглашаем вас в поездку${trip ? ` «${trip.title}»` : ''}. Вся программа, адреса, чат с координатором и памятки — в приложении: откройте ссылку ${link} или установите приложение и введите код ${t.code}. ${t.name}`;
  const copy = async (s: string, what: string) => { try { await Clipboard.setStringAsync(s); toast(`${what} скопирован${what === 'Текст' ? '' : 'а'}`); } catch { toast('Не получилось скопировать'); } };
  const markSent = () => {
    if (!trip) return;
    const n = trip.people.filter((p) => p.invite === 'new').length;
    upd((o) => ({ ...o, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, people: x.people.map((p) => (p.invite === 'new' ? { ...p, invite: 'sent' } : p)) } : x)) }));
    toast(n ? `Отмечено: приглашения отправлены ${n} ${plural(n, 'участнику', 'участникам', 'участникам')}` : 'Все уже приглашены');
  };
  return (
    <>
      <Card>
        <H3>Код приглашения</H3>
        <Field label="Код (латиница и цифры, 3–12 знаков)" value={code} onChangeText={(v) => { const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); setCode(c); if (/^[A-Z0-9]{3,12}$/.test(c) && !allTenants().some((x) => x.id !== t.id && x.code.toLowerCase() === c.toLowerCase())) patch({ code: c }); }} />
        {!okCode ? <T muted style={{ color: C.warn }}>{taken ? 'Такой код уже занят — придумайте другой' : '3–12 латинских букв или цифр'}</T> : null}
        <Label>Ссылка-приглашение</Label>
        <Text selectable style={{ fontFamily: F.semibold, fontSize: 14, color: C.blueInk }}>{link}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title="Скопировать ссылку" icon="copy" kind="light" small onPress={() => copy(link, 'Ссылка')} />
        </View>
      </Card>
      <Card>
        <H3>QR-код</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <View accessibilityLabel={`QR-код ссылки ${link}`} style={{ width: 200, height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', boxShadow: SH.small }}>
            <SvgXml xml={qrSvg(link)} width="100%" height="100%" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 0, gap: 8 }}>
            <T>Покажите на брифинге, напечатайте в памятке или вставьте в письмо: участник наводит камеру — открывается поездка под вашим брендом.</T>
            <View style={{ flexDirection: 'row' }}><Button title="Скачать QR (SVG)" icon="share" kind="light" small onPress={() => shareFile(`QR-${t.code}.svg`, qrSvg(link), 'svg')} /></View>
          </View>
        </View>
      </Card>
      <Card>
        <H3>Текст приглашения</H3>
        <Text selectable style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink }}>{text}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title="Скопировать текст" icon="copy" kind="light" small onPress={() => copy(text, 'Текст')} />
          {trip?.people.length ? <Button title="Отметить: приглашения отправлены" icon="send" kind="light" small onPress={markSent} /> : null}
        </View>
      </Card>
      <Card tone="info">
        <H3>Проверить глазами участника</H3>
        <T>{trip ? `Откроется поездка «${trip.title}» в вашем бренде — так её увидят участники.` : 'Поездки пока нет — откроется пример с вымышленными данными.'}</T>
        <View style={{ flexDirection: 'row' }}><Button title="Открыть как участник" icon="people" onPress={openAsDelegate} /></View>
        <T muted>До подключения сервера код и ссылка работают на этом устройстве. С сервером участники откроют поездку по коду на своих телефонах.</T>
      </Card>
    </>
  );
}

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
import { REGION_RU, allTenants, uniqueCode, type DataRegion, type Tenant } from '@/data/tenant';
import { useToast } from '@/state/toast';
import { shareFile } from './files';
import { Icon } from './Icon';
import { Button, Card, Check, Chip, Chips, Field, H3, Label, Pick, Section, T, TitleRow, inputStyle } from './kit';
import { initialsOf } from './brand-form';
import { ActionTile } from './org-ui';
import { C, F, SH } from './theme';
import { __ } from '@/i18n';

type Upd = (fn: (o: Org) => Org) => void;
const REGIONS = Object.entries(REGION_RU) as [DataRegion, string][];

// ——— 1. Компания ———
export function CompanyStep({ t, patch, org, upd, saved, onCreate, onPrograms }: { t: Tenant; patch: (p: Partial<Tenant>) => void; org: Org; upd: Upd; saved: boolean; onCreate: () => void; onPrograms: () => void }) {
  const c = org.contact;
  const setC = (p: Partial<Org['contact']>) => upd((o) => ({ ...o, contact: { ...o.contact, ...p } }));
  return (
    <>
      {!org.programs.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <ActionTile icon="grid" title={__("Начать с программы")} sub={__("Есть программа в Excel, Word или PDF? Загрузите её сразу — компанию и бренд заполните потом")} onPress={onPrograms} />
        </View>
      ) : null}
      <Card>
        <H3>{__('Организация')}</H3>
        {/* пока код и монограмма — из названия (никто не правил их руками), они меняются вместе с названием */}
        <Field label={__("Название компании *")} value={t.name} onChangeText={(name) => patch({ name, ...(saved && name.trim() && t.code === uniqueCode(t.name, t.id) ? { code: uniqueCode(name, t.id) } : {}), ...(t.short === initialsOf(t.name, 3) ? { short: initialsOf(name, 3) } : {}) })} placeholder={__("Например, Деловые поездки в Азию")} />
        <Field label={__("Слоган под названием")} value={t.tagline} onChangeText={(tagline) => patch({ tagline })} placeholder={__("Чем вы занимаетесь")} />
      </Card>
      <Card>
        <H3>{__('Контакты для связи с платформой')}</H3>
        <Field label={__("Почта")} value={c.email} onChangeText={(email) => setC({ email })} placeholder="office@example.com" keyboardType="email-address" />
        <Field label={__("Телефон")} value={c.phone} onChangeText={(phone) => setC({ phone })} placeholder="+7 900 000-00-00" keyboardType="phone-pad" />
        <Field label={__("Сайт")} value={c.site} onChangeText={(site) => setC({ site })} placeholder="example.com" />
        <T muted>{__('Это показ: до подключения сервера ничего никуда не отправляется и хранится только на этом устройстве.')}</T>
      </Card>
      <Card>
        <H3>{__('Где хранить данные участников')}</H3>
        <Chips>{REGIONS.map(([k, ru]) => <Pick key={k} title={ru} on={t.region === k} onPress={() => patch({ region: k })} />)}</Chips>
        <T muted>{__('Выбирайте страну, где работает ваша компания: например, для России закон требует хранить данные граждан в России.')}</T>
      </Card>
      {!saved ? <Button title={__("Создать кабинет")} icon="check" onPress={onCreate} /> : null}
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
      if (!r.programs.length) { setWarn(r.warning || __('Ничего не распознано')); return; }
      if (r.programs.length === 1) {
        const p = r.programs[0];
        open({ p, isNew: true, start: r.start, banner: __('Распознано из «{a}»: {b}, {c} {d}. Проверьте, поправьте и сохраните.', { a: f.name, b: daysRu(p.days.length), c: eventsCount(p), d: plural(eventsCount(p), __('событие'), __('события'), __('событий')) }) });
      } else {
        upd((o) => ({ ...o, programs: [...o.programs, ...r.programs] }));
        toast(__('Из «{a}» добавлено программ: {b}', { a: f.name, b: r.programs.length }));
      }
    } catch (e) {
      setWarn(e instanceof Error ? e.message : __('Не получилось прочитать файл'));
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
    toast(e.isNew && e.start ? __('Сохранено. Поездка с {a} — черновик на шаге «Поездка»', { a: ruDate(e.start) }) : __('Программа сохранена'));
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
          <H3>{__('Программ пока нет')}</H3>
          <T>{__('Добавьте первую: загрузите файл, который у вас уже есть, или заполните вручную. Всё распознанное вы проверите и поправите перед сохранением.')}</T>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ActionTile icon="doc" title={__("Заполнить вручную")} sub={__("Дни, время, визиты, обеды и переезды — прямо здесь")} onPress={() => open({ isNew: true, p: { id: uid('p'), title: '', country: 'cn', summary: '', source: 'manual', days: [{ city: '', note: '', events: [] }] } })} />
        <ActionTile icon="grid" title={__("Загрузить Excel")} sub={__(".xlsx или .csv: строка — событие; столбцы «День», «Время», «Событие»")} onPress={() => load(['xlsx', 'csv'])} />
        <ActionTile icon="book" title={__("Загрузить Word")} sub={__(".docx: «День 1 — Шанхай», «10:00 Визит на завод», таблицы")} onPress={() => load(['docx'])} />
        <ActionTile icon="passport" title={__("Загрузить PDF")} sub={__("PDF с текстом (из Word, с сайта). Сканы-картинки не читаются")} onPress={() => load(['pdf'])} />
        <ActionTile icon="globe" title={__("Из шаблона")} sub={__("Каркас деловой поездки по стране — 9 стран")} onPress={() => setTpl(!tpl)} />
        {!org.programs.some((p) => p.source === 'sample') ? <ActionTile icon="star" title={__("Пример поездки")} sub={__("Вымышленная поездка с участниками — посмотреть, как всё работает")} onPress={() => { upd(addSample); toast(__('Пример добавлен: программа, поездка и участники')); }} /> : null}
      </View>
      {busy ? <Card tone="info"><T>{__('Читаю файл…')}</T></Card> : null}
      {warn ? <Card tone="warn"><T>{warn}</T></Card> : null}
      {tpl ? (
        <Card>
          <H3>{__('Шаблон для страны')}</H3>
          <Chips>{COUNTRY_LIST.map(([c, ru]) => <Pick key={c} title={ru} on={false} onPress={() => { setTpl(false); open({ isNew: true, p: templateProgram(c), banner: __('Шаблон: замените заглушки [уточнить] на свои компании, рестораны и время.') }); }} />)}</Chips>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title={__("Скачать шаблон Excel")} kind="ghost" icon="share" small onPress={() => shareFile(__('Шаблон-программы.xlsx'), programTemplate(), 'xlsx')} />
      </View>
      {org.programs.length ? <Section title={__('Ваши программы · {a}', { a: org.programs.length })} /> : null}
      {org.programs.map((p) => (
        <Card key={p.id}>
          <TitleRow title={p.title || __('Без названия')} right={<Chip tone={p.source === 'sample' ? 'warn' : 'info'}>{SOURCE_RU[p.source]}</Chip>} />
          <T muted>{`${__(countryOf(p.country).ru)} · ${daysRu(p.days.length)} · ${eventsCount(p)} ${plural(eventsCount(p), __('событие'), __('события'), __('событий'))}${p.file ? ` · ${p.file}` : ''}`}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button title={__("Изменить")} kind="light" small icon="doc" onPress={() => open({ p, isNew: false })} />
            <Button title={__("Поездка по программе")} kind="light" small icon="cal" onPress={() => { if (!org.trips.some((x) => x.programId === p.id)) upd((o) => ({ ...o, trips: [...o.trips, newTrip(p, '2026-11-16')] })); goTrip(); }} />
            <Button title={armed === p.id ? __('Нажмите ещё раз — удалить') : __('Удалить')} kind="ghost" small onPress={() => remove(p)} />
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
    if (!p.title.trim()) { toast(__('Впишите название программы')); return; }
    if (!p.days.length) { toast(__('Добавьте хотя бы один день')); return; }
    onSave({ ...p, title: p.title.trim(), days: p.days.map((d) => ({ ...d, events: d.events.filter((e) => e.name.trim()).map((e) => ({ ...e, t: normTime(e.t) || '12:00' })) })) });
  };
  return (
    <>
      {banner ? <Card tone="info"><T>{banner}</T></Card> : null}
      <Card>
        <H3>{__('Программа')}</H3>
        <Field label={__("Название *")} value={p.title} onChangeText={(title) => set((x) => ({ ...x, title }))} placeholder={__("Например, Умные фабрики Китая")} />
        <Label>{__('Страна')}</Label>
        <Chips>{COUNTRY_LIST.map(([c, ru]) => <Pick key={c} title={ru} on={p.country === c} onPress={() => set((x) => ({ ...x, country: c }))} />)}</Chips>
        <Field label={__("Коротко о программе")} value={p.summary} onChangeText={(summary) => set((x) => ({ ...x, summary }))} placeholder={__("Для кого и зачем эта поездка")} multiline />
      </Card>
      {p.days.map((d, i) => (
        <Card key={i}>
          <TitleRow title={__('День {a}', { a: i + 1 })} right={p.days.length > 1 ? <Button title={__("Удалить день")} kind="ghost" small onPress={() => set((x) => ({ ...x, days: x.days.filter((_, k) => k !== i) }))} /> : undefined} />
          <Field label={__("Город")} value={d.city} onChangeText={(city) => setDay(i, { city })} placeholder={__("Например, Шанхай")} />
          {d.events.length ? <Label>{__('Время · событие · место · тип')}</Label> : <T muted>{__('Событий пока нет — добавьте визит, обед или переезд.')}</T>}
          {d.events.map((e, j) => <EventRow key={e.id} e={e} onChange={(x) => setEv(i, j, x)} onRemove={() => delEv(i, j)} />)}
          <View style={{ flexDirection: 'row' }}><Button title={__("Добавить событие")} icon="plus" kind="light" small onPress={() => addEv(i)} /></View>
          <Field label={__("Примечание дня")} value={d.note} onChangeText={(note) => setDay(i, { note })} placeholder={__("Например, дресс-код или что взять с собой")} multiline />
        </Card>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title={__("Добавить день")} icon="plus" kind="light" onPress={() => set((x) => ({ ...x, days: [...x.days, { city: x.days[x.days.length - 1]?.city || '', note: '', events: [] }] }))} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title={__("Сохранить программу")} icon="check" onPress={save} />
        <Button title={__("Отмена")} kind="ghost" onPress={onCancel} />
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
        accessibilityLabel={__("Время")} style={[...inp, { width: 72 }]} />
      <TextInput value={e.name} onChangeText={(name) => onChange({ name })} placeholder={__("Событие")} placeholderTextColor={C.muted} accessibilityLabel={__("Событие")} style={[...inp, { flexGrow: 2, flexBasis: 170, minWidth: 0 }]} />
      <TextInput value={e.place} onChangeText={(place) => onChange({ place })} placeholder={__("Место или описание")} placeholderTextColor={C.muted} accessibilityLabel={__("Место")} style={[...inp, { flexGrow: 2, flexBasis: 170, minWidth: 0 }]} />
      <Pressable onPress={nextKind} accessibilityRole="button" accessibilityLabel={__('Тип: {a}. Нажмите, чтобы сменить', { a: kind[1] })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.blueSoft }}>
        <Icon name={KIND_ICON[e.kind]} size={15} color={C.blueInk} />
        <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.blueInk }}>{kind[1]}</Text>
      </Pressable>
      <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={__('Удалить событие {a}', { a: e.name })} hitSlop={6}
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
        <H3>{__('Сначала программа')}</H3>
        <T>{__('Поездка — это программа с датами, отелем и участниками. Добавьте программу на шаге «Программы».')}</T>
        <View style={{ flexDirection: 'row' }}><Button title={__("К программам")} icon="route" onPress={goPrograms} /></View>
      </Card>
    );
  }
  const create = () => {
    const iso = normDate(start);
    const p = org.programs.find((x) => x.id === prog);
    if (!p) { toast(__('Выберите программу')); return; }
    if (!iso) { toast(__('Дата начала — в формате ДД.ММ.ГГГГ')); return; }
    const tr = newTrip(p, iso);
    upd((o) => ({ ...o, trips: [...o.trips, tr] }));
    setSel(tr.id);
    toast(__('Поездка создана — проверьте отель и откройте её участникам'));
  };
  return (
    <>
      {org.trips.map((tr) => (
        <Card key={tr.id} onPress={() => setSel(tr.id)} label={__('Поездка {a}', { a: tr.title })} tone={tr.id === sel ? 'accent' : undefined}>
          <TitleRow title={tr.title} right={<Chip tone={tr.published ? 'ok' : 'warn'}>{tr.published ? (org.active === tr.id ? __('видят участники') : __('опубликована')) : __('черновик')}</Chip>} />
          <T muted>{`${tripDates(tr.start, nDays(tr))} · ${tr.people.length} ${plural(tr.people.length, __('участник'), __('участника'), __('участников'))}`}</T>
        </Card>
      ))}
      {trip ? (
        <Card>
          <H3>{__('Поездка: {a}', { a: trip.title })}</H3>
          <Field label={__("Название для участников")} value={trip.title} onChangeText={(title) => setTrip({ title })} />
          <DateField key={trip.id} value={trip.start} onChange={(s) => setTrip({ start: s })} />
          <Field label={__("Отель группы")} value={trip.hotel} onChangeText={(hotel) => setTrip({ hotel })} placeholder={__("Название отеля — если уже известно")} />
          <Check on={trip.published && org.active === trip.id} onPress={() => {
            const on = !(trip.published && org.active === trip.id);
            upd((o) => ({ ...o, active: on ? trip.id : o.active === trip.id ? '' : o.active, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, published: on } : x)) }));
          }}>{__('Открыть участникам — эту поездку увидят по коду приглашения')}</Check>
          <View style={{ flexDirection: 'row' }}>
            <Button title={armed ? __('Нажмите ещё раз — удалить поездку') : __('Удалить поездку')} kind="ghost" small onPress={() => {
              if (!armed) { setArmed(true); return; }
              upd((o) => ({ ...o, trips: o.trips.filter((x) => x.id !== trip.id), active: o.active === trip.id ? '' : o.active }));
              setSel(''); setArmed(false);
            }} />
          </View>
        </Card>
      ) : null}
      <Card>
        <H3>{__('Новая поездка')}</H3>
        <Label>{__('Программа')}</Label>
        <Chips>{org.programs.map((p) => <Pick key={p.id} title={p.title || __('Без названия')} on={prog === p.id} onPress={() => setProg(p.id)} />)}</Chips>
        <Field label={__("Дата начала (ДД.ММ.ГГГГ)")} value={start} onChangeText={setStart} placeholder="16.11.2026" />
        <View style={{ flexDirection: 'row' }}><Button title={__("Создать поездку")} icon="cal" onPress={create} /></View>
      </Card>
    </>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [v, setV] = useState(ruDate(value));
  return (
    <>
      <Field label={__("Дата начала (ДД.ММ.ГГГГ)")} value={v} onChangeText={(x) => { setV(x); const iso = normDate(x); if (iso) onChange(iso); }} placeholder="16.11.2026" />
      {!normDate(v) ? <T muted>{__('Формат: 16.11.2026')}</T> : null}
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
        <H3>{__('Сначала поездка')}</H3>
        <T>{__('Участники добавляются в конкретную поездку. Создайте её на шаге «Поездка».')}</T>
        <View style={{ flexDirection: 'row' }}><Button title={__("К поездке")} icon="cal" onPress={goTrip} /></View>
      </Card>
    );
  }
  const setPeople = (fn: (p: OPerson[]) => OPerson[]) => upd((o) => ({ ...o, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, people: fn(x.people) } : x)) }));
  const add = () => {
    if (!f.name.trim()) { toast(__('Впишите имя участника')); return; }
    setPeople((p) => [...p, { id: uid('u'), ...f, name: f.name.trim(), invite: 'new' }]);
    setF({ name: '', company: '', role: '', phone: '', email: '' });
  };
  const load = async () => {
    setWarn('');
    const file = await pickFile(['xlsx', 'csv']);
    if (!file) return;
    if ('error' in file) { setWarn(file.error); return; }
    const r = await importPeople(file);
    if (!r.people.length) { setWarn(r.warning || __('Участников не нашлось')); return; }
    setPeople((p) => [...p, ...r.people]);
    toast(__('Добавлено участников: {a}', { a: r.people.length }));
  };
  const INV: Record<OPerson['invite'], [string, 'info' | 'warn' | 'ok']> = { new: [__('не приглашён'), 'warn'], sent: [__('приглашение отправлено'), 'info'], joined: [__('в приложении'), 'ok'] };
  return (
    <>
      {org.trips.length > 1 ? <Chips>{org.trips.map((x) => <Pick key={x.id} title={x.title} on={x.id === trip.id} onPress={() => setSel(x.id)} />)}</Chips> : null}
      <Card tone="info"><T>{__('Поездка «{a}». Участников можно добавить по одному или загрузить списком из Excel. До подключения сервера список хранится только на этом устройстве.', { a: trip.title })}</T></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ActionTile icon="grid" title={__("Загрузить из Excel")} sub={__("Столбцы «ФИО», «Компания», «Должность», «Телефон», «Почта»")} onPress={load} />
        <ActionTile icon="share" title={__("Шаблон Excel")} sub={__("Скачать пустую таблицу участников")} onPress={() => shareFile(__('Шаблон-участники.xlsx'), peopleTemplate(), 'xlsx')} />
      </View>
      {warn ? <Card tone="warn"><T>{warn}</T></Card> : null}
      <Card>
        <H3>{__('Добавить вручную')}</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {([['name', __('Имя и фамилия *')], ['company', __('Компания')], ['role', __('Должность')], ['phone', __('Телефон')], ['email', __('Почта')]] as const).map(([k, l]) => (
            <View key={k} style={{ flexGrow: 1, flexBasis: 220, minWidth: 0 }}>
              <Field label={l} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} keyboardType={k === 'phone' ? 'phone-pad' : k === 'email' ? 'email-address' : undefined} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}><Button title={__("Добавить участника")} icon="plus" onPress={add} /></View>
      </Card>
      <Section title={__('Участники · {a}', { a: trip.people.length })} />
      {trip.people.length ? (
        <Card>
          {trip.people.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line2 }}>
              <View style={{ flexGrow: 1, flexBasis: 200, minWidth: 0 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14.5, color: C.ink }}>{p.name}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{[p.role, p.company, p.phone, p.email].filter(Boolean).join(' · ') || '—'}</Text>
              </View>
              <Chip tone={INV[p.invite][1]}>{INV[p.invite][0]}</Chip>
              <Pressable onPress={() => setPeople((x) => x.filter((y) => y.id !== p.id))} accessibilityRole="button" accessibilityLabel={__('Убрать {a}', { a: p.name })} hitSlop={6}>
                <Icon name="trash" size={16} color={C.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : <T muted>{__('Пока никого нет.')}</T>}
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
  const text = __('Здравствуйте! Приглашаем вас в поездку{a}. Вся программа, адреса, чат с координатором и памятки — в приложении: откройте ссылку {b} или установите приложение и введите код {c}. {d}', { a: trip ? ` «${trip.title}»` : '', b: link, c: t.code, d: t.name });
  const copy = async (s: string, done: string) => { try { await Clipboard.setStringAsync(s); toast(done); } catch { toast(__('Не получилось скопировать')); } };
  const markSent = () => {
    if (!trip) return;
    const n = trip.people.filter((p) => p.invite === 'new').length;
    upd((o) => ({ ...o, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, people: x.people.map((p) => (p.invite === 'new' ? { ...p, invite: 'sent' } : p)) } : x)) }));
    toast(n ? __('Отмечено: приглашения отправлены {a} {b}', { a: n, b: plural(n, __('участнику'), __('участникам'), __('участникам')) }) : __('Все уже приглашены'));
  };
  return (
    <>
      <Card>
        <H3>{__('Код приглашения')}</H3>
        <Field label={__("Код (латиница и цифры, 3–12 знаков)")} value={code} onChangeText={(v) => { const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); setCode(c); if (/^[A-Z0-9]{3,12}$/.test(c) && !allTenants().some((x) => x.id !== t.id && x.code.toLowerCase() === c.toLowerCase())) patch({ code: c }); }} />
        {!okCode ? <T muted style={{ color: C.warn }}>{taken ? __('Такой код уже занят — придумайте другой') : __('3–12 латинских букв или цифр')}</T> : null}
        <Label>{__('Ссылка-приглашение')}</Label>
        <Text selectable style={{ fontFamily: F.semibold, fontSize: 14, color: C.blueInk }}>{link}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title={__("Скопировать ссылку")} icon="copy" kind="light" small onPress={() => copy(link, __('Ссылка скопирована'))} />
        </View>
      </Card>
      <Card>
        <H3>{__('QR-код')}</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <View accessibilityLabel={__('QR-код ссылки {a}', { a: link })} style={{ width: 200, height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', boxShadow: SH.small }}>
            <SvgXml xml={qrSvg(link)} width="100%" height="100%" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 0, gap: 8 }}>
            <T>{__('Покажите на брифинге, напечатайте в памятке или вставьте в письмо: участник наводит камеру — открывается поездка под вашим брендом.')}</T>
            <View style={{ flexDirection: 'row' }}><Button title={__("Скачать QR (SVG)")} icon="share" kind="light" small onPress={() => shareFile(`QR-${t.code}.svg`, qrSvg(link), 'svg')} /></View>
          </View>
        </View>
      </Card>
      <Card>
        <H3>{__('Текст приглашения')}</H3>
        <Text selectable style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink }}>{text}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title={__("Скопировать текст")} icon="copy" kind="light" small onPress={() => copy(text, __('Текст скопирован'))} />
          {trip?.people.length ? <Button title={__("Отметить: приглашения отправлены")} icon="send" kind="light" small onPress={markSent} /> : null}
        </View>
      </Card>
      <Card tone="info">
        <H3>{__('Проверить глазами участника')}</H3>
        <T>{trip ? __('Откроется поездка «{a}» в вашем бренде — так её увидят участники.', { a: trip.title }) : __('Поездки пока нет — откроется пример с вымышленными данными.')}</T>
        <View style={{ flexDirection: 'row' }}><Button title={__("Открыть как участник")} icon="people" onPress={openAsDelegate} /></View>
        <T muted>{__('До подключения сервера код и ссылка работают на этом устройстве. С сервером участники откроют поездку по коду на своих телефонах.')}</T>
      </Card>
    </>
  );
}

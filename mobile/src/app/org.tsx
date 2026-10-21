// Кабинет организатора (решение 21.10.2026: «десктопная версия и через браузер, чтобы работать с любого устройства,
// в том числе с планшета»). Шаги: компания → бренд → программы → поездка → участники → приглашение; справа — живой
// предпросмотр телефона участника. Раскладка под ширину: компьютер — меню слева, форма, телефон справа; планшет — шаги
// сверху, форма и телефон рядом; телефон — шаги сверху, предпросмотр по кнопке.
// /org — список организаторов или новый; /org?id=…&step=… — кабинет; /org?new=1 — новый организатор.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { liveTrip, orgOf, previewTrip, saveOrg, type Org } from '@/data/org';
import { allTenants, blankTenant, setCustomTenants, uniqueCode, type Tenant } from '@/data/tenant';
import { useSwitchTenant } from '@/state/reset';
import { peekStored, putStored } from '@/state/store';
import { useToast } from '@/state/toast';
import { BrandForm, initialsOf } from '@/ui/brand-form';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icon-paths';
import { Button, Card, Row, T } from '@/ui/kit';
import { Monogram } from '@/ui/Monogram';
import { Press } from '@/ui/motion';
import { CompanyStep, InviteStep, PeopleStep, ProgramsStep, TripStep } from '@/ui/org-steps';
import { PhonePreview } from '@/ui/org-ui';
import { C, F, SH } from '@/ui/theme';
import { LANG, __ } from '@/i18n';

type Step = 'company' | 'brand' | 'programs' | 'trip' | 'people' | 'invite';
const NEW_NAME = __('Новый организатор');
const STEPS: [Step, string, IconName, string][] = [
  ['company', __('Компания'), 'building', __('Название, контакты и где хранить данные участников.')],
  ['brand', __('Бренд'), 'star', __('Логотип, цвет, координатор и что участник видит на экране «Сегодня».')],
  ['programs', __('Программы'), 'route', __('Загрузите Excel, Word или PDF — или заполните вручную. Всё распознанное можно поправить.')],
  ['trip', __('Поездка'), 'cal', __('Программа + даты + отель. Откройте поездку участникам, когда она готова.')],
  ['people', __('Участники'), 'people', __('Список группы: по одному или из Excel.')],
  ['invite', __('Приглашение'), 'send', __('Код, ссылка и QR-код — участник открывает поездку под вашим брендом.')],
];

export default function OrgCabinet() {
  const params = useLocalSearchParams<{ id?: string; step?: string; new?: string }>();
  const mine = allTenants().filter((t) => t.custom);
  if (!params.id && !params.new && mine.length) return <OrgPicker list={mine} />;
  return <Cabinet key={params.id || 'new'} id={params.id} step0={STEPS.some(([k]) => k === params.step) ? (params.step as Step) : undefined} />;
}

function OrgPicker({ list }: { list: Tenant[] }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Text style={{ fontFamily: F.display, fontSize: 40, color: C.ink, textTransform: 'uppercase' }}>{__('Кабинет организатора')}</Text>
      <T muted>{__('Выберите организатора или создайте нового — у каждого свои программы, поездки, участники и бренд.')}</T>
      {list.map((t) => {
        const o = orgOf(t.id);
        return (
          <Card key={t.id} onPress={() => router.setParams({ id: t.id, step: 'programs' })} label={__('Кабинет: {a}', { a: t.name })}>
            <Row left={<Monogram t={t} size={46} />} title={t.name} sub={__('код {a} · программ {b} · поездок {c}', { a: t.code, b: o.programs.length, c: o.trips.length })} right={<Icon name="route" size={18} color={C.muted} />} />
          </Card>
        );
      })}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Button title={__("Новый организатор")} icon="plus" onPress={() => router.setParams({ new: '1' })} />
        <Button title={__("Сразу загрузить программу")} icon="grid" kind="light" onPress={() => router.setParams({ new: '1', step: 'programs' })} />
      </View>
    </ScrollView>
  );
}

function Cabinet({ id, step0 }: { id?: string; step0?: Step }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const switchTenant = useSwitchTenant();
  const existing = id ? allTenants().find((x) => x.id === id && x.custom) : undefined;
  const [t, setT] = useState<Tenant>(() => (existing ? { ...existing, blocks: existing.blocks.map((b) => ({ ...b })) } : blankTenant()));
  const [saved, setSaved] = useState(!!existing);
  const [org, setOrg] = useState<Org>(() => orgOf(t.id));
  const [hex, setHex] = useState(t.accent);
  const [step, setStepState] = useState<Step>(step0 || (existing ? 'programs' : 'company'));
  const [sel, setSel] = useState(org.active || org.trips[0]?.id || '');
  const [previewProgram, setPreviewProgram] = useState('');
  const [sheet, setSheet] = useState(false);

  const persistTenant = (n: Tenant) => {
    const list = (peekStored<Tenant[]>('tenants.custom') || []).filter((x) => x.id !== n.id).concat(n);
    putStored('tenants.custom', list);
    setCustomTenants(list);
  };
  const patch = (p: Partial<Tenant>) => setT((x) => { const n = { ...x, ...p }; if (saved) persistTenant(n); return n; });
  const upd = (fn: (o: Org) => Org) => setOrg((o) => { const n = fn(o); if (saved) saveOrg(t.id, n); return n; });
  // любой шаг открыт сразу: без названия кабинет создаётся сам («Новый организатор», переименовать — на шаге «Компания»),
  // чтобы можно было начать с загрузки программы (решение пользователя 21.10.2026)
  const setStep = (s: Step) => {
    if (!saved && s !== 'company') { create(s, true); return; }
    setStepState(s); setPreviewProgram(''); if (saved) router.setParams({ step: s });
  };

  const create = (next: Step = 'brand', quiet = false) => {
    const name = t.name.trim() || (quiet ? NEW_NAME : '');
    if (!name) { toast(__('Впишите название компании')); return; }
    const code = uniqueCode(name, t.id);
    const n: Tenant = { ...t, name, short: t.short || initialsOf(name, 3), code };
    persistTenant(n);
    saveOrg(n.id, org);
    setSaved(true);
    toast(name === NEW_NAME ? __('Кабинет создан — название компании впишете, когда будет удобно') : __('Кабинет создан · код приглашения {a}', { a: code }));
    router.setParams({ id: n.id, step: next, new: '' });
  };
  // /org?new=1&step=programs — сразу к загрузке программы
  useEffect(() => { if (!saved && step0 && step0 !== 'company') create(step0, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const openAsDelegate = () => {
    // поездка, которую открываем, — опубликованная; если ни одна не открыта, открываем выбранную
    const trip = org.trips.find((x) => x.id === sel) || liveTrip(org) || org.trips[0];
    if (trip && !liveTrip(org)) upd((o) => ({ ...o, active: trip.id, trips: o.trips.map((x) => (x.id === trip.id ? { ...x, published: true } : x)) }));
    setTimeout(() => { switchTenant(t.id); router.replace('/trip'); }, 60);
  };

  // «Продажа тура» — страница тура и баннеры (src/app/sale.tsx); кабинет должен быть уже создан
  const goSale = (programId?: string) => {
    if (!saved) { create('programs', true); return; }
    router.push(programId ? `/sale?id=${t.id}&program=${programId}` : `/sale?id=${t.id}`);
  };

  const i = STEPS.findIndex(([k]) => k === step);
  const [, title, , sub] = STEPS[i];
  const done: Record<Step, boolean> = {
    company: saved && t.name !== NEW_NAME, brand: saved && !!t.coordinator.name, programs: org.programs.length > 0, trip: org.trips.length > 0,
    people: org.trips.some((x) => x.people.length > 0), invite: org.trips.some((x) => x.people.some((p) => p.invite !== 'new')),
  };
  const locked = (_k: Step) => false;
  const preview = previewTrip(org, step === 'trip' || step === 'people' || step === 'invite' ? sel : undefined, previewProgram || undefined);

  const wide = width >= 1100;
  const side = width >= 860;
  const phoneW = wide ? 300 : 270;

  const content = (
    step === 'company' ? <CompanyStep t={t} patch={patch} org={org} upd={upd} saved={saved} onCreate={() => create()} onPrograms={() => setStep('programs')} />
      : step === 'brand' ? <BrandForm t={t} patch={patch} hex={hex} setHex={setHex} />
        : step === 'programs' ? <ProgramsStep org={org} upd={upd} onPreview={setPreviewProgram} goTrip={() => setStep('trip')} onSale={(pid) => goSale(pid)} />
          : step === 'trip' ? <TripStep org={org} upd={upd} sel={sel} setSel={setSel} goPrograms={() => setStep('programs')} />
            : step === 'people' ? <PeopleStep org={org} upd={upd} sel={sel} setSel={setSel} goTrip={() => setStep('trip')} />
              : <InviteStep t={t} patch={patch} org={org} upd={upd} sel={sel} openAsDelegate={openAsDelegate} />
  );

  const stepList = (
    <View style={{ gap: 4 }}>
      {STEPS.map(([k, name, icon], n) => {
        const on = k === step;
        return (
          <Press key={k} onPress={() => setStep(k)} label={__('Шаг {a}: {b}', { a: n + 1, b: name })} scaleTo={0.98} state={{ selected: on, disabled: locked(k) }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: on ? C.card : 'transparent', boxShadow: on ? SH.small : undefined, opacity: locked(k) ? 0.45 : 1 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done[k] ? C.blue : on ? C.blueSoft : C.well }}>
              {done[k] ? <Icon name="check" size={15} color="#fff" /> : <Text style={{ fontFamily: F.bold, fontSize: 12, color: on ? C.blueInk : C.muted }}>{n + 1}</Text>}
            </View>
            <Icon name={icon} size={17} color={on ? C.blueInk : C.muted} />
            <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 14, color: C.ink }}>{name}</Text>
          </Press>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: wide ? 'row' : 'column' }}>
      {wide ? (
        <View style={{ width: 250, padding: 18, gap: 18, borderRightWidth: 1, borderColor: C.line2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Monogram t={t} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{t.name || __('Новый организатор')}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>{saved ? __('код {a}', { a: t.code }) : __('кабинет организатора')}</Text>
            </View>
          </View>
          {stepList}
          {step !== 'programs' ? <Button title={__("Загрузить программу")} icon="plus" kind="light" small onPress={() => setStep('programs')} /> : null}
          <SaleLink onPress={() => goSale()} />
          <View style={{ flex: 1 }} />
          {saved ? <Button title={__("Открыть как участник")} icon="people" kind="light" small onPress={openAsDelegate} /> : null}
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" hitSlop={6}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{`${__('Язык и тема')} · ${LANG.toUpperCase()}`}</Text></Pressable>
          <Pressable onPress={() => router.replace('/org')} accessibilityRole="button" hitSlop={6}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{__('Все организаторы')}</Text></Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
          {STEPS.map(([k, name], n) => (
            <Press key={k} onPress={() => setStep(k)} label={__('Шаг {a}: {b}', { a: n + 1, b: name })} state={{ selected: k === step, disabled: locked(k) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: k === step ? C.blue : C.card, boxShadow: k === step ? SH.blue : SH.small, opacity: locked(k) ? 0.45 : 1 }}>
              {done[k] && k !== step ? <Icon name="check" size={14} color={C.blueInk} /> : <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: k === step ? '#fff' : C.muted }}>{n + 1}</Text>}
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: k === step ? '#fff' : C.ink }}>{name}</Text>
            </Press>
          ))}
          <Press onPress={() => goSale()} label={__('Продажа тура')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: C.card, boxShadow: SH.small }}>
            <Icon name="megaphone" size={15} color={C.blueInk} />
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.ink }}>{__('Продажа тура')}</Text>
          </Press>
          <Press onPress={() => router.push('/settings')} label={__('Язык и тема')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: C.card, boxShadow: SH.small }}>
            <Icon name="globe" size={15} color={C.blueInk} />
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.ink }}>{LANG.toUpperCase()}</Text>
          </Press>
        </ScrollView>
      )}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: wide ? 32 : 16, paddingTop: wide ? 26 : 8, paddingBottom: insets.bottom + 110, gap: 14, maxWidth: 860, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>{__('ШАГ {a} ИЗ {b}', { a: i + 1, b: STEPS.length })}</Text>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: wide ? 44 : 34, lineHeight: wide ? 48 : 38, color: C.ink, textTransform: 'uppercase' }}>{title}</Text>
            <T muted>{sub}</T>
          </View>
          {content}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {i > 0 ? <Button title={`← ${STEPS[i - 1][1]}`} kind="ghost" onPress={() => setStep(STEPS[i - 1][0])} /> : null}
            {i < STEPS.length - 1 && !locked(STEPS[i + 1][0]) ? <Button title={__('Дальше: {a} →', { a: STEPS[i + 1][1] })} kind="light" onPress={() => setStep(STEPS[i + 1][0])} /> : null}
          </View>
        </ScrollView>
        {side ? (
          <ScrollView style={{ width: phoneW + 50, flexGrow: 0, borderLeftWidth: 1, borderColor: C.line2 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>{__('ТАК ВИДИТ УЧАСТНИК')}</Text>
            <PhonePreview t={t} trip={preview} width={phoneW} />
          </ScrollView>
        ) : null}
      </View>
      {!side ? (
        <>
          <Press onPress={() => setSheet(true)} label={__("Предпросмотр: так видит участник")}
            style={{ position: 'absolute', right: 16, bottom: insets.bottom + 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 48, borderRadius: 24, backgroundColor: C.dark, boxShadow: SH.dark }}>
            <Icon name="people" size={18} color="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: '#fff' }}>{__('Предпросмотр')}</Text>
          </Press>
          <Modal visible={sheet} transparent animationType="fade" onRequestClose={() => setSheet(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(15, 27, 45, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <PhonePreview t={t} trip={preview} width={Math.min(300, width - 40)} />
              <View style={{ marginTop: 12 }}><Button title={__("Закрыть")} kind="light" onPress={() => setSheet(false)} /></View>
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
}

/** Вход в «Продажу тура» из меню кабинета: заметная плитка, а не строчка — это то, ради чего организатор платит. */
function SaleLink({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} label={__('Продажа тура')} scaleTo={0.98}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.blueSoft }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="megaphone" size={17} color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{__('Продажа тура')}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>{__('Страница и баннеры для соцсетей')}</Text>
      </View>
    </Press>
  );
}

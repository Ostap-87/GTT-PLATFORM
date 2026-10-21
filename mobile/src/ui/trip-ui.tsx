// Элементы поездки, общие для нескольких экранов: лента времени дня, строка события и адрес на трёх языках.
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { countryOf } from '@/data/countries';
import { TRIP, type EventKind, type TripEvent } from '@/data/trip';
import { VISITS } from '@/data/group';
import { useToast } from '@/state/toast';
import { Icon } from './Icon';
import type { IconName } from './icon-paths';
import { Button, Card, Chip, Row, s as kit } from './kit';
import { Appear, Press } from './motion';
import { C, F, SH } from './theme';
import { __ } from '@/i18n';

/** Логотип компании с сайта (как в карточках компаний globaltechtour.ru); картинка кэшируется и открывается без сети. */
export const logoUrl = (path: string) => `https://globaltechtour.ru${encodeURI(path)}`;

export function CoLogo({ path, fallback = 'building', color = C.blue, w = 54, h = 42 }: { path?: string; fallback?: IconName; color?: string; w?: number; h?: number }) {
  const [bad, setBad] = useState(false);
  if (!path || bad) return <View style={[tl.ico, { width: h, height: h }]}><Icon name={fallback} size={21} color={color} /></View>;
  return (
    <View style={[tl.logo, { width: w, height: h }]}>
      <Image source={{ uri: logoUrl(path) }} contentFit="contain" cachePolicy="disk" onError={() => setBad(true)} style={{ width: w - 10, height: h - 14 }} accessibilityIgnoresInvertColors />
    </View>
  );
}

// цвет и значок события по виду: визит — синий, еда — зелёный, переезд — серый, культура — фиолетовый
// функция, а не константа: синий — цвет бренда организатора, его меняет applyTenant
const kindOf = (k: EventKind): [string, IconName] => ({ co: [C.blue, 'building'], meal: [C.green, 'food'], move: ['#8a94a6', 'bus'], culture: [C.violet, 'culture'], info: [C.blueInk, 'megaphone'] } as Record<EventKind, [string, IconName]>)[k];
const moveIcon = (name: string): IconName => (/перел|вылет|прил/i.test(name) ? 'plane' : /поезд/i.test(name) ? 'train' : 'bus');
// обед или ужин — по названию события (оно на языке организатора)
const mealOf = (e: TripEvent) => (/обед|lunch|午餐|түскі|غداء|दोपहर/i.test(e.name) ? __('обед') : __('ужин'));
const chipOf = (e: TripEvent): [string, string] => (e.moved ? [__('перенесено'), '#d9822b']
  : e.kind === 'co' ? [__('визит'), C.blue]
    : e.kind === 'meal' ? [mealOf(e), C.green]
      : e.kind === 'culture' ? [__('культура'), C.violet]
        : e.kind === 'move' ? [__('переезд'), '#8a94a6'] : [__('инфо'), C.blueInk]);
const hrefOf = (e: TripEvent) => {
  const visit = e.kind === 'co' ? VISITS.find((v) => v.name === e.name) : undefined;
  return { visit, href: e.ref?.startsWith('m-') ? `/meal/${e.ref}` : e.ref?.startsWith('c-') ? `/culture/${e.ref}` : visit ? `/company/${visit.id}` : null };
};

/** Лента времени (решение 21.10.2026): слева время, по линии цветные точки, у визитов — логотип компании. Пункты
 *  появляются по очереди; нажатие открывает компанию, ресторан или культурную программу. */
export function Timeline({ events, from = 0 }: { events: TripEvent[]; from?: number }) {
  return (
    <View style={{ paddingLeft: 62 }}>
      <View style={tl.line} />
      <View style={{ gap: 10 }}>
        {events.map((e, i) => <TimelineItem key={e.t + e.name} e={e} i={from + i} />)}
      </View>
    </View>
  );
}

function TimelineItem({ e, i }: { e: TripEvent; i: number }) {
  const [k, icon] = kindOf(e.kind);
  const { visit, href } = hrefOf(e);
  const [chip, chipColor] = chipOf(e);
  const body = (
    <>
      <View style={[tl.side, { left: -62, width: 42 }]}><Text style={[tl.time, e.moved && { color: C.warn }]}>{e.t}</Text></View>
      <View style={[tl.side, { left: -15 }]}><View style={[tl.dot, { backgroundColor: k }]} /></View>
      {e.kind === 'co' ? <CoLogo path={visit?.logo} color={k} /> : <View style={tl.ico}><Icon name={e.kind === 'move' ? moveIcon(e.name) : icon} size={21} color={k} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={tl.name} numberOfLines={1}>{e.name}</Text>
        {e.place ? <Text style={tl.place} numberOfLines={1}>{e.place}</Text> : null}
      </View>
      <View style={[tl.chip, { backgroundColor: `${chipColor}24` }]}><Text style={[tl.chipText, { color: chipColor }]}>{chip}</Text></View>
    </>
  );
  return (
    <Appear i={i}>
      {href ? <Press onPress={() => router.push(href as never)} label={`${e.t} ${e.name}`} scaleTo={0.97} style={tl.ev}>{body}</Press> : <View style={tl.ev}>{body}</View>}
    </Appear>
  );
}

const tl = StyleSheet.create({
  line: { position: 'absolute', left: 51, top: 14, bottom: 14, width: 2, borderRadius: 1, backgroundColor: C.line },
  ev: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 20, backgroundColor: C.card, boxShadow: SH.small },
  side: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  time: { textAlign: 'right', fontFamily: F.bold, fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  dot: { width: 12, height: 12, borderRadius: 6, boxShadow: `0px 0px 0px 3px ${C.bg}, 2px 2px 4px #c3ccd9` },
  ico: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.well, boxShadow: SH.inset },
  logo: { borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', boxShadow: 'inset 0px 0px 0px 1px #e3e8f0' },
  name: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  place: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, marginTop: 1 },
  chip: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontFamily: F.bold, fontSize: 11 },
});

export function EventRow({ e }: { e: TripEvent }) {
  const chip = e.moved ? <Chip tone="warn">{__('перенесено')}</Chip>
    : e.kind === 'co' ? <Chip>{__('визит')}</Chip>
      : e.kind === 'meal' ? <Chip tone="ok">{mealOf(e)}</Chip>
        : e.kind === 'culture' ? <Chip tone="dark">{__('культура')}</Chip>
          : e.kind === 'move' ? <Chip tone="plain">{__('переезд')}</Chip> : null;
  const { href } = hrefOf(e);
  return (
    <Row
      title={<Text style={kit.rowTitle}><Text style={{ fontVariant: ['tabular-nums'], color: e.moved ? C.warn : C.ink }}>{e.t}</Text>  {e.name}</Text>}
      sub={e.place}
      right={chip}
      onPress={href ? () => router.push(href as never) : undefined}
      label={href ? `${e.t} ${e.name}` : undefined}
    />
  );
}

export function Address3({ zh, ru, en, note }: { zh: string; ru: string; en: string; note?: string }) {
  const toast = useToast();
  const copy = async (text: string) => {
    try { await Clipboard.setStringAsync(text); } catch { /* буфер недоступен — достаточно сообщения */ }
    toast(__('Адрес скопирован'));
  };
  const cn = TRIP.country === 'cn';
  const openMaps = () => {
    const q = encodeURIComponent(zh || en || ru);
    // Amap (高德) — карты, которые работают в Китае; Google Карты там заблокированы. В остальных странах — Google Карты
    if (!cn) { Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`); return; }
    Linking.openURL(Platform.OS === 'ios' ? `iosamap://poi?sourceApplication=gtt&name=${q}` : `https://uri.amap.com/search?keyword=${q}`)
      .catch(() => Linking.openURL(`https://uri.amap.com/search?keyword=${q}`));
  };
  const line = (label: string, text: string, cjk?: boolean) => (
    <Row
      key={label}
      title={<View><Text style={[kit.rowSub, { fontFamily: F.bold, marginTop: 0 }]}>{label}</Text><Text style={cjk ? { fontSize: 20, fontFamily: F.bold, color: C.ink } : { fontSize: 14, fontFamily: F.regular, color: C.ink }} selectable>{text}</Text></View>}
      right={<Pressable onPress={() => copy(text)} accessibilityRole="button" accessibilityLabel={__('Скопировать адрес: {a}', { a: label })} hitSlop={8}><Icon name="copy" size={20} color={C.blueInk} /></Pressable>}
    />
  );
  return (
    <Card style={{ backgroundColor: C.bg }}>
      {zh ? line(__('{a} · для водителя', { a: countryOf(TRIP.country).lang.self }), zh, true) : null}
      {ru ? line(__('Русский'), ru) : null}
      {en ? line('English', en) : null}
      {note ? <Text style={kit.muted}>{note}</Text> : null}
      {zh ? <Button title={__('Показать водителю')} full onPress={() => router.push({ pathname: '/driver', params: { zh, ru } })} /> : null}
      {zh || en ? <Button title={__('Открыть в картах ({a})', { a: cn ? 'Amap' : 'Google' })} kind="ghost" full onPress={openMaps} /> : null}
    </Card>
  );
}

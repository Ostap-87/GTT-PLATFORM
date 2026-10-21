// Кабинет организатора: живой предпросмотр телефона участника (в цветах бренда из формы, ещё до сохранения) и плитки
// действий. Предпросмотр — макет, а не настоящие экраны: он рисуется рядом с формой и обновляется на каждую правку.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { PreviewTrip } from '@/data/org';
import { TOOLS, type Tenant } from '@/data/tenant';
import { Icon } from './Icon';
import type { IconName } from './icon-paths';
import { Monogram } from './Monogram';
import { Press } from './motion';
import { C, F, SH } from './theme';
import { __ } from '@/i18n';

type Screen = 'start' | 'today' | 'plan' | 'library' | 'people' | 'trip' | 'chat';
const KIND_ICON: Record<string, IconName> = { co: 'building', meal: 'food', move: 'bus', culture: 'culture', info: 'doc' };

export function PhonePreview({ t, trip, width = 300 }: { t: Tenant; trip: PreviewTrip | null; width?: number }) {
  const [screen, setScreen] = useState<Screen>('today');
  // разделы — как вкладки приложения участника; выключенные в бренде вкладки не показываем
  const sections: [Screen, string][] = [['start', __('Вход')], ['today', __('Сегодня')], ['plan', __('План')], ...(t.tabs.library ? [['library', __('Материалы')] as [Screen, string]] : []),
    ...(t.tabs.people ? [['people', __('Люди')] as [Screen, string]] : []), ['trip', __('Поездка')], ['chat', __('Чат')]];
  const cur = sections.some(([k]) => k === screen) ? screen : 'today';
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: width + 40 }}>
        {sections.map(([k, l]) => (
          <Press key={k} onPress={() => setScreen(k)} label={__('Предпросмотр: {a}', { a: l })} state={{ selected: cur === k }} scaleTo={0.94}
            style={{ paddingHorizontal: 11, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: cur === k ? C.ink : C.card, boxShadow: cur === k ? undefined : SH.small }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 12, color: cur === k ? C.bg : C.ink }}>{l}</Text>
          </Press>
        ))}
      </View>
      <View accessibilityLabel={__('Предпросмотр приложения участника: {a}', { a: t.name || __('новый организатор') })}
        style={{ width, height: Math.round(width * 2.02), borderRadius: 46, padding: 9, backgroundColor: '#101826', boxShadow: '0px 24px 50px rgba(15, 27, 45, 0.28)' }}>
        <View style={{ flex: 1, borderRadius: 38, overflow: 'hidden', backgroundColor: C.bg }}>
          <View style={{ height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.ink }}>9:41</Text>
            <View style={{ width: 74, height: 20, borderRadius: 12, backgroundColor: '#101826' }} />
            <Text style={{ fontFamily: F.bold, fontSize: 10, color: C.ink }}>5G</Text>
          </View>
          {cur === 'start' ? <StartMock t={t} trip={trip} /> : (
            <>
              <ScrollView key={cur} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
                {cur === 'today' ? <TodayMock t={t} trip={trip} /> : cur === 'plan' ? <PlanMock t={t} trip={trip} />
                  : cur === 'library' ? <LibraryMock t={t} trip={trip} /> : cur === 'people' ? <PeopleMock t={t} trip={trip} />
                    : cur === 'trip' ? <TripMock t={t} trip={trip} /> : <ChatMock t={t} />}
              </ScrollView>
              <TabsMock t={t} on={cur} go={setScreen} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const small = (color: string = C.muted) => ({ fontFamily: F.medium, fontSize: 11, color });
const label = { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.2, color: C.muted, marginTop: 4 } as const;
const card = { backgroundColor: C.card, borderRadius: 18, padding: 12, gap: 6, boxShadow: SH.small } as const;

function Head({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Monogram t={t} size={28} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 12.5, color: C.ink }}>{t.name || __('Название организации')}</Text>
      </View>
      <Text style={small()}>{trip ? `${trip.days[Math.min(1, trip.days.length - 1)]?.label || ''} · ${trip.days[Math.min(1, trip.days.length - 1)]?.city || ''}` : __('Поездка появится после создания')}</Text>
    </View>
  );
}

function TodayMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  const day = trip?.days[Math.min(1, trip.days.length - 1)];
  const evs = day?.events || [];
  const now = evs[0];
  const tools = TOOLS.filter(([k]) => t.tools.includes(k));
  const block = (k: string) => {
    switch (k) {
      case 'now': return (
        <LinearGradient key={k} colors={[t.heroFrom, t.heroTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 22, padding: 14, gap: 3 }}>
          <Text style={small('rgba(255,255,255,0.85)')}>{now ? __('{a} · через 25 мин', { a: now.t }) : __('Ближайшее событие')}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 24, lineHeight: 26, color: '#fff', textTransform: 'uppercase' }}>{now ? now.name : __('Создайте поездку')}</Text>
          {now?.place ? <Text numberOfLines={1} style={small('rgba(255,255,255,0.8)')}>{now.place}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1, height: 32, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: t.accent }}>{__('Я в автобусе')}</Text></View>
            <View style={{ flex: 1, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#fff' }}>{__('Такси')}</Text></View>
          </View>
        </LinearGradient>
      );
      case 'next': return (
        <View key={k} style={{ gap: 6 }}>
          <Text style={label}>{__('ДАЛЬШЕ СЕГОДНЯ')}</Text>
          {(evs.length > 1 ? evs.slice(1, 4) : []).map((e) => (
            <View key={e.id} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }]}>
              <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: t.accentInk, width: 38 }}>{e.t}</Text>
              <Icon name={KIND_ICON[e.kind] || 'doc'} size={15} color={t.accentInk} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 12, color: C.ink }}>{e.name}</Text>
                {e.place ? <Text numberOfLines={1} style={small()}>{e.place}</Text> : null}
              </View>
            </View>
          ))}
          {evs.length <= 1 ? <View style={card}><Text style={small()}>{__('Здесь будут визиты, обеды и переезды дня')}</Text></View> : null}
        </View>
      );
      case 'ann': return (
        <View key={k} style={[card, { backgroundColor: C.warnCard }]}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="megaphone" size={14} color={C.warn} /><Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>{__('Объявление координатора')}</Text></View>
          <Text style={small(C.ink)}>{__('Сбор в лобби за 15 минут до выезда.')}</Text>
        </View>
      );
      case 'tools': return tools.length ? (
        <View key={k} style={{ gap: 6 }}>
          <Text style={label}>{__('ПОД РУКОЙ')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tools.map(([key, title, icon]) => (
              <View key={key} style={{ width: '30.5%', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 16, backgroundColor: C.card, boxShadow: SH.small }}>
                <Icon name={icon} size={18} color={t.accentInk} />
                <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 10.5, color: C.ink }}>{title}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null;
      case 'coord': return (
        <View key={k} style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: t.accentInk }}>{t.coordinator.initials || '•'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 12, color: C.ink }}>{t.coordinator.name || __('Координатор')}</Text>
              <Text style={small()}>{__('Координатор · на связи круглосуточно')}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, height: 30, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: '#fff' }}>{__('Написать')}</Text></View>
            <View style={{ flex: 1, height: 30, borderRadius: 11, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: t.accentInk }}>{__('Позвонить')}</Text></View>
          </View>
        </View>
      );
      case 'weather': return (
        <View key={k} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>{__('Погода и отель')}</Text>
          <Text style={small()}>{__('Прогноз — за неделю до поездки · {a}', { a: trip?.hotel || __('отель подтвердит координатор') })}</Text>
        </View>
      );
      case 'route': return trip?.route ? (
        <View key={k} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>{__('Маршрут поездки')}</Text>
          <Text style={small()}>{trip.route}</Text>
        </View>
      ) : null;
      default: return null;
    }
  };
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={{ fontFamily: F.display, fontSize: 32, color: C.ink, textTransform: 'uppercase' }}>{__('Сегодня')}</Text>
      {t.blocks.filter((b) => b.on).map((b) => block(b.key))}
    </>
  );
}

function PlanMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={{ fontFamily: F.display, fontSize: 32, color: C.ink, textTransform: 'uppercase' }}>{__('План')}</Text>
      {trip ? <Text style={small()}>{`${trip.title} · ${trip.dates}`}</Text> : null}
      {(trip?.days || []).map((d, i) => (
        <View key={i} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: t.accentInk }}>{__('День {a} · {b}{c}', { a: i + 1, b: d.label, c: d.city ? ` · ${d.city}` : '' })}</Text>
          {d.events.slice(0, 5).map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.muted, width: 36 }}>{e.t}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 11.5, color: C.ink }}>{e.name}</Text>
            </View>
          ))}
          {d.events.length > 5 ? <Text style={small()}>{__('ещё {a}', { a: d.events.length - 5 })}</Text> : null}
        </View>
      ))}
      {!trip ? <View style={card}><Text style={small()}>{__('Добавьте программу — здесь появятся дни поездки')}</Text></View> : null}
    </>
  );
}

const big = { fontFamily: F.display, fontSize: 32, color: C.ink, textTransform: 'uppercase' } as const;
const rowTitle = { fontFamily: F.semibold, fontSize: 12, color: C.ink } as const;

function LibraryMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  const docs: [IconName, string, string][] = [
    ['doc', __('Программа поездки{a}', { a: trip ? ` «${trip.title}»` : '' }), __('От {a}', { a: t.name || __('организатора') })],
    ['passport', __('Памятка: {a}', { a: trip?.country || __('страна поездки') }), __('Связь, оплата, розетки, приложения')],
    ['building', __('Справки о компаниях'), __('Карточки визитов программы')],
  ];
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={big}>{__('Материалы')}</Text>
      {docs.map(([icon, title, sub]) => (
        <View key={title} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} color={t.accentInk} /></View>
          <View style={{ flex: 1 }}><Text numberOfLines={2} style={rowTitle}>{title}</Text><Text numberOfLines={1} style={small()}>{sub}</Text></View>
        </View>
      ))}
    </>
  );
}

function PeopleMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  const people = trip?.people.length ? trip.people : [];
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={big}>{__('Люди')}</Text>
      <View style={[card, { backgroundColor: C.dark }]}>
        <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{__('Связь с координатором')}</Text>
        <Text style={small(C.onDark)}>{__('{a} · на связи круглосуточно', { a: t.coordinator.name || __('Координатор') })}</Text>
      </View>
      <Text style={label}>{__('УЧАСТНИКИ · {a}', { a: people.length })}</Text>
      <View style={card}>
        {people.slice(0, 8).map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 9.5, color: t.accentInk }}>{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</Text>
            </View>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={rowTitle}>{p.name}</Text><Text numberOfLines={1} style={small()}>{[p.role, p.company].filter(Boolean).join(' · ') || __('Участник')}</Text></View>
          </View>
        ))}
        {!people.length ? <Text style={small()}>{__('Участники появятся, когда вы добавите их на шаге «Участники»')}</Text> : null}
        {people.length > 8 ? <Text style={small()}>{__('и ещё {a}', { a: people.length - 8 })}</Text> : null}
      </View>
    </>
  );
}

function TripMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  const items: [string, string, boolean][] = [[__('Скан паспорта'), __('Проверит координатор'), true], [__('Билеты и страховка'), __('Загрузите, когда будут готовы'), false],
    [__('Мой профиль: питание, аллергии, номер'), __('Учтём в отеле и ресторанах'), false], [__('Памятка: {a}', { a: trip?.country || __('страна поездки') }), __('Связь, оплата, этикет'), false]];
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={big}>{__('Поездка')}</Text>
      {trip ? <Text style={small()}>{`${trip.title} · ${trip.dates}`}</Text> : null}
      <Text style={label}>{__('ПОДГОТОВКА')}</Text>
      <View style={card}>
        {items.map(([title, sub, ok]) => (
          <View key={title} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 3 }}>
            <View style={{ width: 20, height: 20, borderRadius: 7, backgroundColor: ok ? t.accent : C.well, alignItems: 'center', justifyContent: 'center' }}>{ok ? <Icon name="check" size={12} color="#fff" /> : null}</View>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={rowTitle}>{title}</Text><Text numberOfLines={1} style={small()}>{sub}</Text></View>
          </View>
        ))}
      </View>
      {trip?.route ? <View style={card}><Text style={rowTitle}>{__('Маршрут')}</Text><Text style={small()}>{trip.route}</Text></View> : null}
    </>
  );
}

function ChatMock({ t }: { t: Tenant }) {
  const msgs: [boolean, string][] = [[false, __('Доброе утро! Я на связи круглосуточно — пишите сюда.')], [true, __('Где встречаемся?')], [false, __('В лобби отеля в 09:15, автобус у главного входа.')], [true, __('Я в автобусе')]];
  return (
    <>
      <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 10, color: t.accentInk }}>{t.coordinator.initials || '•'}</Text></View>
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={rowTitle}>{t.coordinator.name || __('Координатор')}</Text><Text style={small()}>{__('Координатор · {a}', { a: t.name || __('организатор') })}</Text></View>
      </View>
      {msgs.map(([mine, text], k) => (
        <View key={k} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, backgroundColor: mine ? t.accent : C.card, boxShadow: mine ? undefined : SH.small }}>
          <Text style={{ fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: mine ? '#fff' : C.ink }}>{text}</Text>
        </View>
      ))}
    </>
  );
}

function StartMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  return (
    <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 40 }}>
        <Monogram t={t} size={88} />
        <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 32, color: C.ink, textTransform: 'uppercase', textAlign: 'center' }}>{t.name || __('Название организации')}</Text>
        <Text style={[small(), { fontSize: 12, textAlign: 'center' }]}>{t.tagline}</Text>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ height: 42, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 13, color: '#fff' }}>{__('Войти в поездку')}</Text></View>
        <View style={{ height: 42, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 13, color: t.accentInk }}>{__('Код приглашения · {a}', { a: t.code || '—' })}</Text></View>
        <Text style={[small(), { textAlign: 'center' }]}>{trip ? `${trip.title}, ${trip.dates}` : __('Поездка появится после приглашения')}</Text>
      </View>
    </View>
  );
}

function TabsMock({ t, on, go }: { t: Tenant; on: Screen; go: (s: Screen) => void }) {
  const tabs: [IconName, string, Screen][] = [['sun', __('Сегодня'), 'today'], ['cal', __('План'), 'plan'], ...(t.tabs.library ? [['book', __('Материалы'), 'library'] as [IconName, string, Screen]] : []), ...(t.tabs.people ? [['people', __('Люди'), 'people'] as [IconName, string, Screen]] : []), ['suitcase', __('Поездка'), 'trip']];
  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: 12, height: 58, borderRadius: 22, backgroundColor: C.surface, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', boxShadow: SH.float }}>
      {tabs.map(([icon, title, key]) => (
        <Press key={title} onPress={() => go(key)} label={__('Вкладка {a}', { a: title })} state={{ selected: key === on }} scaleTo={0.9} feel={false} style={{ alignItems: 'center', gap: 2, paddingHorizontal: 2 }}>
          <Icon name={icon} size={18} color={key === on ? t.accent : '#8a94a6'} />
          <Text style={{ fontFamily: F.semibold, fontSize: 9, color: key === on ? t.accent : '#8a94a6' }}>{title}</Text>
        </Press>
      ))}
    </View>
  );
}

/** Плитка действия: «Загрузить Excel», «Заполнить вручную»… — в сетке, которая перестраивается под ширину экрана. */
export function ActionTile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} label={title} scaleTo={0.97}
      style={{ flexGrow: 1, flexBasis: 200, minWidth: 150, backgroundColor: C.card, borderRadius: 20, padding: 14, gap: 6, boxShadow: SH.small }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={C.blueInk} /></View>
      <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: C.ink }}>{title}</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.muted }}>{sub}</Text>
    </Press>
  );
}

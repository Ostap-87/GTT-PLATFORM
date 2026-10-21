// Кабинет организатора: живой предпросмотр телефона участника (в цветах бренда из формы, ещё до сохранения) и плитки
// действий. Предпросмотр — макет, а не настоящие экраны: он рисуется рядом с формой и обновляется на каждую правку.
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { PreviewTrip } from '@/data/org';
import { TOOLS, type Tenant } from '@/data/tenant';
import { Icon } from './Icon';
import type { IconName } from './icon-paths';
import { Seg } from './kit';
import { Monogram } from './Monogram';
import { Press } from './motion';
import { C, F, SH } from './theme';

type Screen = 'start' | 'today' | 'plan';
const KIND_ICON: Record<string, IconName> = { co: 'building', meal: 'food', move: 'bus', culture: 'culture', info: 'doc' };

export function PhonePreview({ t, trip, width = 300 }: { t: Tenant; trip: PreviewTrip | null; width?: number }) {
  const [screen, setScreen] = useState<Screen>('today');
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Seg options={[['start', 'Вход'], ['today', 'Сегодня'], ['plan', 'План']] as const} value={screen} onChange={setScreen} />
      <View accessibilityLabel={`Предпросмотр приложения участника: ${t.name || 'новый организатор'}`}
        style={{ width, height: Math.round(width * 2.02), borderRadius: 46, padding: 9, backgroundColor: '#101826', boxShadow: '0px 24px 50px rgba(15, 27, 45, 0.28)' }}>
        <View style={{ flex: 1, borderRadius: 38, overflow: 'hidden', backgroundColor: C.bg }}>
          <View style={{ height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.ink }}>9:41</Text>
            <View style={{ width: 74, height: 20, borderRadius: 12, backgroundColor: '#101826' }} />
            <Text style={{ fontFamily: F.bold, fontSize: 10, color: C.ink }}>5G</Text>
          </View>
          {screen === 'start' ? <StartMock t={t} trip={trip} /> : (
            <>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
                {screen === 'today' ? <TodayMock t={t} trip={trip} /> : <PlanMock t={t} trip={trip} />}
              </ScrollView>
              <TabsMock t={t} on={screen} />
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
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.bold, fontSize: 12.5, color: C.ink }}>{t.name || 'Название организации'}</Text>
      </View>
      <Text style={small()}>{trip ? `${trip.days[Math.min(1, trip.days.length - 1)]?.label || ''} · ${trip.days[Math.min(1, trip.days.length - 1)]?.city || ''}` : 'Поездка появится после создания'}</Text>
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
          <Text style={small('rgba(255,255,255,0.85)')}>{now ? `${now.t} · через 25 мин` : 'Ближайшее событие'}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 24, lineHeight: 26, color: '#fff', textTransform: 'uppercase' }}>{now ? now.name : 'Создайте поездку'}</Text>
          {now?.place ? <Text numberOfLines={1} style={small('rgba(255,255,255,0.8)')}>{now.place}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={{ flex: 1, height: 32, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: t.accent }}>Я в автобусе</Text></View>
            <View style={{ flex: 1, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: '#fff' }}>Такси</Text></View>
          </View>
        </LinearGradient>
      );
      case 'next': return (
        <View key={k} style={{ gap: 6 }}>
          <Text style={label}>ДАЛЬШЕ СЕГОДНЯ</Text>
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
          {evs.length <= 1 ? <View style={card}><Text style={small()}>Здесь будут визиты, обеды и переезды дня</Text></View> : null}
        </View>
      );
      case 'ann': return (
        <View key={k} style={[card, { backgroundColor: '#fff6ea' }]}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="megaphone" size={14} color={C.warn} /><Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>Объявление координатора</Text></View>
          <Text style={small(C.ink)}>Сбор в лобби за 15 минут до выезда.</Text>
        </View>
      );
      case 'tools': return tools.length ? (
        <View key={k} style={{ gap: 6 }}>
          <Text style={label}>ПОД РУКОЙ</Text>
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
              <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 12, color: C.ink }}>{t.coordinator.name || 'Координатор'}</Text>
              <Text style={small()}>Координатор · на связи круглосуточно</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, height: 30, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: '#fff' }}>Написать</Text></View>
            <View style={{ flex: 1, height: 30, borderRadius: 11, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 11, color: t.accentInk }}>Позвонить</Text></View>
          </View>
        </View>
      );
      case 'weather': return (
        <View key={k} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>Погода и отель</Text>
          <Text style={small()}>{`Прогноз — за неделю до поездки · ${trip?.hotel || 'отель подтвердит координатор'}`}</Text>
        </View>
      );
      case 'route': return trip?.route ? (
        <View key={k} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink }}>Маршрут поездки</Text>
          <Text style={small()}>{trip.route}</Text>
        </View>
      ) : null;
      default: return null;
    }
  };
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={{ fontFamily: F.display, fontSize: 32, color: C.ink, textTransform: 'uppercase' }}>Сегодня</Text>
      {t.blocks.filter((b) => b.on).map((b) => block(b.key))}
    </>
  );
}

function PlanMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  return (
    <>
      <Head t={t} trip={trip} />
      <Text style={{ fontFamily: F.display, fontSize: 32, color: C.ink, textTransform: 'uppercase' }}>План</Text>
      {trip ? <Text style={small()}>{`${trip.title} · ${trip.dates}`}</Text> : null}
      {(trip?.days || []).map((d, i) => (
        <View key={i} style={card}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, color: t.accentInk }}>{`День ${i + 1} · ${d.label}${d.city ? ` · ${d.city}` : ''}`}</Text>
          {d.events.slice(0, 5).map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.muted, width: 36 }}>{e.t}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.medium, fontSize: 11.5, color: C.ink }}>{e.name}</Text>
            </View>
          ))}
          {d.events.length > 5 ? <Text style={small()}>{`ещё ${d.events.length - 5}`}</Text> : null}
        </View>
      ))}
      {!trip ? <View style={card}><Text style={small()}>Добавьте программу — здесь появятся дни поездки</Text></View> : null}
    </>
  );
}

function StartMock({ t, trip }: { t: Tenant; trip: PreviewTrip | null }) {
  return (
    <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 10, marginTop: 40 }}>
        <Monogram t={t} size={88} />
        <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 32, color: C.ink, textTransform: 'uppercase', textAlign: 'center' }}>{t.name || 'Название организации'}</Text>
        <Text style={[small(), { fontSize: 12, textAlign: 'center' }]}>{t.tagline}</Text>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ height: 42, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 13, color: '#fff' }}>Войти в поездку</Text></View>
        <View style={{ height: 42, borderRadius: 14, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 13, color: t.accentInk }}>{`Код приглашения · ${t.code || '—'}`}</Text></View>
        <Text style={[small(), { textAlign: 'center' }]}>{trip ? `${trip.title}, ${trip.dates}` : 'Поездка появится после приглашения'}</Text>
      </View>
    </View>
  );
}

function TabsMock({ t, on }: { t: Tenant; on: Screen }) {
  const tabs: [IconName, string, Screen | ''][] = [['sun', 'Сегодня', 'today'], ['cal', 'План', 'plan'], ...(t.tabs.library ? [['book', 'Материалы', ''] as [IconName, string, '']] : []), ...(t.tabs.people ? [['people', 'Люди', ''] as [IconName, string, '']] : []), ['suitcase', 'Поездка', '']];
  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: 12, height: 58, borderRadius: 22, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', boxShadow: SH.float }}>
      {tabs.map(([icon, title, key]) => (
        <View key={title} style={{ alignItems: 'center', gap: 2 }}>
          <Icon name={icon} size={18} color={key === on ? t.accent : '#8a94a6'} />
          <Text style={{ fontFamily: F.semibold, fontSize: 9, color: key === on ? t.accent : '#8a94a6' }}>{title}</Text>
        </View>
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

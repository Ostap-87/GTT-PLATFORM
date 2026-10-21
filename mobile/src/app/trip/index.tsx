// «Сегодня» (дизайн 21.10.2026: «пластилин» + синяя глянцевая карточка «Сейчас» из варианта 1): ближайшее событие крупно
// с «Я в автобусе» и «Такси», лента времени дня с логотипами компаний, «Под рукой», связь с координатором, погода и отель.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Text, View } from 'react-native';

import { GUIDE } from '@/data/extras';
import { NOW, VISITS, toMin } from '@/data/group';
import { routeText } from '@/data/route';
import { TENANT, TOOLS, type TodayBlock } from '@/data/tenant';
import { CITY, DAYS, DAY_NOTES, TRIP, WEATHER, dayEvents, hotelOf, monthOf, weatherLine, type TripEvent } from '@/data/trip';
import { useCoord } from '@/state/coord';
import { useToast } from '@/state/toast';
import { useTrip } from '@/state/trip';
import { okFeel } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { Avatar, Button, Card, Chip, H3, Row, Screen, Section, T, TitleRow } from '@/ui/kit';
import { ND, Press, Pulse, reduceMotion } from '@/ui/motion';
import { OfflineNote } from '@/ui/OfflineNote';
import { Timeline } from '@/ui/trip-ui';
import { C, F, SH } from '@/ui/theme';

/** «через 25 минут» — от текущего времени демо до события. */
function untilText(t: string) {
  const m = toMin(t) - toMin(NOW);
  if (m <= 0) return 'сейчас';
  return m < 60 ? `через ${m} мин` : `через ${Math.floor(m / 60)} ч ${m % 60 ? `${m % 60} мин` : ''}`.trim();
}

export default function Today() {
  const i = TRIP.today;
  const d = DAYS[i];
  const w = WEATHER[i];
  const h = hotelOf(i);
  const k = useCoord();
  const ann = k.anns.find((a) => a.toD); // последнее объявление координатора делегатам
  // ближайшее: выезд или переезд перед первым визитом дня — крупно в «Сейчас», остальное — лентой
  const ev = dayEvents(i);
  const firstCo = ev.find((e) => e.kind === 'co');
  const dep = ev.find((e) => e.kind === 'move' && (!firstCo || toMin(e.t) <= toMin(firstCo.t))) || ev[0];
  const v = firstCo ? VISITS.find((x) => x.name === firstCo.name) : undefined;
  const taxi = v ? { zh: v.zh || v.name, ru: v.addr || `${v.name}, ${CITY[i]}` } : { zh: h?.addrZh || '', ru: h?.addrRu || '' };
  const rest = ev.filter((e) => e !== dep);
  const unread = k.unread('delegate');
  const tools = TOOLS.filter(([key]) => TENANT.tools.includes(key));

  // блоки экрана — организатор включает нужные и задаёт порядок в конструкторе (TENANT.blocks)
  const block = (key: TodayBlock) => {
    switch (key) {
      case 'now': return dep || k.guideLive ? (
        <View key={key} style={{ gap: 14 }}>
          <Section title="Сейчас" />
          {dep ? <NowHero dep={dep} onTaxi={() => router.push({ pathname: '/driver', params: taxi })} /> : null}
          {k.guideLive ? (
            <Card tone="info" onPress={() => router.push('/guide')} label="Гид в эфире — слушать">
              <Row left={<Icon name="headphones" size={24} color={C.blueInk} />} title="Гид в эфире" sub={`${GUIDE.name} · нажмите, чтобы слушать в наушниках`} />
            </Card>
          ) : null}
        </View>
      ) : null;
      case 'next': return rest.length ? (
        <View key={key} style={{ gap: 14 }}>
          <Section title="Дальше сегодня" link="Весь план" onLink={() => router.push('/trip/plan')} />
          <Timeline events={rest} from={1} />
          {DAY_NOTES[i] ? <T muted style={{ paddingHorizontal: 4 }}>{DAY_NOTES[i]}</T> : null}
        </View>
      ) : null;
      case 'ann': return ann ? (
        <Card key={key} tone="warn">
          <TitleRow title={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="megaphone" size={20} color={C.warn} /><H3>Объявление координатора</H3></View>} right={<T muted>{ann.time}</T>} />
          <T>{ann.ru}</T>
        </Card>
      ) : null;
      case 'tools': return tools.length ? (
        <View key={key} style={{ gap: 14 }}>
          <Section title="Под рукой" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {tools.map(([tk, title, icon, to]) => {
              const sos = tk === 'help';
              return (
                <Press key={tk} onPress={() => router.push(to as never)} label={title} scaleTo={0.93}
                  style={{ flexBasis: '29%', flexGrow: 1, alignItems: 'center', gap: 7, paddingTop: 13, paddingBottom: 11, borderRadius: 22, backgroundColor: C.card, boxShadow: SH.clay }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: sos ? '#fbe4d4' : C.well, boxShadow: SH.inset }}>
                    <Icon name={icon} size={22} color={sos ? '#d9622b' : C.blueInk} />
                  </View>
                  <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.ink }}>{title}</Text>
                </Press>
              );
            })}
          </View>
        </View>
      ) : null;
      case 'coord': return (
        <Card key={key}>
          <Row left={<Avatar text={TENANT.coordinator.initials} size={42} />} title={TENANT.coordinator.name} sub="Координатор · на связи круглосуточно" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title={unread > 0 ? `Написать · ${unread}` : 'Написать'} icon="chat" label={unread > 0 ? `Чат с координатором: ${unread} новых` : 'Написать координатору'} onPress={() => router.push('/chat')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Позвонить" icon="phone" kind="light" onPress={() => (TENANT.phone ? Linking.openURL(`tel:${TENANT.phone.replace(/[^+\d]/g, '')}`) : router.push('/contacts'))} />
            </View>
          </View>
        </Card>
      );
      case 'weather': return (
        <Card key={key}>
          <H3>Погода и отель</H3>
          <Row left={<Icon name={w.icon} size={26} />} title={`${weatherLine(w)} · ${CITY[i]}`} sub={w.text} />
          {h ? (
            <Row left={<Icon name="bed" size={26} />} title={h.name} sub={`${h.nights} · ${h.addrZh ? 'адрес на 3 языках' : 'адрес пришлёт координатор'}`}
              right={<Chip>отель</Chip>} onPress={() => router.push(`/hotel/${h.key}`)} label={`Отель: ${h.name}`} />
          ) : null}
        </Card>
      );
      case 'route': return (
        <Card key={key} onPress={() => router.push('/route')} label="Маршрут поездки на схеме">
          <Row left={<Icon name="route" size={24} color={C.blueInk} />} title={TRIP.title} sub={routeText()} right={<Chip tone="info">маршрут</Chip>} />
        </Card>
      );
      default: return null;
    }
  };

  return (
    <Screen eyebrow={`${d.wd}, ${d.n} ${monthOf(i)} · ${CITY[i]}${w.max ? ` · ${w.max}` : ''}`} title="Сегодня"
      right={<Button title="Сменить поездку" kind="light" small label={`Сменить поездку. Сейчас: ${TRIP.title}`} onPress={() => router.push('/demo')} />}>
      <OfflineNote />
      <Card onPress={() => router.push('/search')} label="Поиск по поездке" style={{ paddingVertical: 13, borderRadius: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="search" size={20} color={C.muted} />
          <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.muted }}>Поиск: компания, адрес, телефон</Text>
        </View>
      </Card>
      {TENANT.blocks.filter((b) => b.on).map((b) => block(b.key))}
    </Screen>
  );
}

/** Синяя глянцевая карточка «Сейчас»: блик, пробегающий отсвет, пульсирующая точка, белая «Я в автобусе» и прозрачная «Такси». */
function NowHero({ dep, onTaxi }: { dep: TripEvent; onTaxi: () => void }) {
  const { inBus, setInBus } = useTrip();
  const k = useCoord();
  const toast = useToast();
  const [wd, setWd] = useState(0);
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion() || !wd) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(1200),
      Animated.timing(shine, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.delay(2200),
    ]));
    loop.start();
    return () => loop.stop();
  }, [shine, wd]);
  const big = dep.name === 'Выезд из отеля' ? `Выезд в ${dep.t}` : `${dep.t} · ${dep.name}`;
  return (
    <View style={{ borderRadius: 26, boxShadow: SH.hero }} onLayout={(e) => setWd(e.nativeEvent.layout.width)}>
      <LinearGradient colors={[C.heroFrom, C.heroTo]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 26, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
        {/* глянцевый блик сверху слева */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']} start={{ x: 0.2, y: 0.2 }} end={{ x: 0.75, y: 0.8 }}
          style={{ position: 'absolute', left: '-20%', top: '-60%', width: '90%', height: '130%', borderRadius: 999 }} />
        {wd ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -40, bottom: -40, width: wd * 0.45, transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-wd * 0.6, wd * 1.1] }) }, { rotate: '18deg' }] }}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        ) : null}
        {/* объём «пластилина»: светлый край сверху, тень снизу */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 26, boxShadow: 'inset 4px 4px 10px rgba(255,255,255,0.28), inset -6px -6px 14px rgba(0,0,0,0.14)' }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pulse />
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{untilText(dep.t)}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 42, color: '#fff', textTransform: 'uppercase', marginTop: 6 }}>{big}</Text>
        {dep.place ? <Text style={{ fontFamily: F.regular, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{dep.place}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Press onPress={() => { setInBus(!inBus); if (!inBus) { okFeel(); toast(`Координатор видит: в автобусе ${k.busCount + 1} из 18`); } }} feel={false} scaleTo={0.94}
            label={inBus ? 'В автобусе — отменить отметку' : 'Я в автобусе'} state={{ selected: inBus }}
            style={{ flex: 1, height: 48, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: inBus ? '#dcf7e6' : '#ffffff', boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.08), 4px 4px 10px rgba(0,0,0,0.14)' }}>
            <Icon name={inBus ? 'check' : 'bus'} size={19} color={inBus ? '#137a43' : C.blue} />
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: inBus ? '#137a43' : C.blue }}>{inBus ? 'В автобусе' : 'Я в автобусе'}</Text>
          </Press>
          <Press onPress={onTaxi} label="Такси: адрес для водителя" scaleTo={0.94}
            style={{ flex: 1, height: 48, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -2px -2px 6px rgba(255,255,255,0.2)' }}>
            <Icon name="car" size={19} color="#fff" />
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>Такси</Text>
          </Press>
        </View>
      </LinearGradient>
    </View>
  );
}

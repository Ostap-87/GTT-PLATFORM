// «План»: дни поездки, у каждого — погода, отель, визиты, рестораны и культурная программа.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CITY, DAYS, DAY_NOTES, TRIP, WEATHER, dayEvents, hotelOf, monthOf, weatherLine } from '@/data/trip';
import { Icon } from '@/ui/Icon';
import { Card, Chip, Row, Screen, Section, T, TitleRow } from '@/ui/kit';
import { selectFeel } from '@/ui/haptics';
import { Timeline } from '@/ui/trip-ui';
import { C, F, SH } from '@/ui/theme';

export default function Plan() {
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(TRIP.today);
  // из поиска и напоминаний открывается нужный день
  useEffect(() => { const d = Number(params.day); if (params.day !== undefined && d >= 0 && d < DAYS.length) setDay(d); }, [params.day]);
  const d = DAYS[day];
  const w = WEATHER[day];
  const h = hotelOf(day);
  return (
    <Screen eyebrow={TRIP.route} title="План">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 10, margin: -10 }}>
        {DAYS.map((x, i) => {
          const on = i === day;
          return (
            <Pressable key={x.n} onPress={() => { selectFeel(); setDay(i); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${x.wd}, ${x.n} ноября`}
              style={{ width: 56, paddingVertical: 9, borderRadius: 18, alignItems: 'center', backgroundColor: on ? C.blue : C.card, boxShadow: on ? SH.blue : SH.small }}>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: on ? '#fff' : C.muted }}>{x.wd}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 18, color: on ? '#fff' : C.ink }}>{x.n}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: on ? '#fff' : C.muted }} numberOfLines={1}>{WEATHER[i].max || CITY[i]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Card>
        <TitleRow title={`${d.wd}, ${d.n} ${monthOf(day)} · ${CITY[day]}`} right={day === TRIP.today ? <Chip tone="warn">сегодня</Chip> : null} />
        <Row left={<Icon name={w.icon} size={26} />} title={weatherLine(w)} sub={w.text} />
        {h ? (
          <Row left={<Icon name="bed" size={26} />} title={h.name} sub={`${h.nights} · ${h.addrZh ? "адрес на 3 языках" : "адрес пришлёт координатор"}`} right={<Chip>отель</Chip>} onPress={() => router.push(`/hotel/${h.key}`)} label={`Отель: ${h.name}`} />
        ) : (
          <Row left={<Icon name="bed" size={26} />} title="Выезд из отеля до 12:00" sub={day === DAYS.length - 1 ? 'Багаж у стойки отеля, вылет вечером' : 'Ночь в пути'} />
        )}
      </Card>
      <Section title="Расписание" />
      {/* ключ по дню: при смене дня лента появляется заново, по очереди */}
      <Timeline key={day} events={dayEvents(day)} />
      {DAY_NOTES[day] ? <T muted style={{ paddingHorizontal: 4 }}>{DAY_NOTES[day]}</T> : null}
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>Нажмите на обед, ужин или культурную программу — откроется описание и адрес.</Text>
      </View>
    </Screen>
  );
}

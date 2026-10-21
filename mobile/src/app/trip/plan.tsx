// «План»: дни поездки, у каждого — погода, отель, визиты, рестораны и культурная программа.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CITY, DAYS, DAY_NOTES, TRIP, WEATHER, dayEvents, hotelOf, dayTitle, weatherLine } from '@/data/trip';
import { Icon } from '@/ui/Icon';
import { Card, Chip, Row, Screen, Section, T, TitleRow } from '@/ui/kit';
import { selectFeel } from '@/ui/haptics';
import { Timeline } from '@/ui/trip-ui';
import { C, F, SH } from '@/ui/theme';
import { __ } from '@/i18n';

export default function Plan() {
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(TRIP.today);
  // из поиска и напоминаний открывается нужный день
  useEffect(() => { const d = Number(params.day); if (params.day !== undefined && d >= 0 && d < DAYS.length) setDay(d); }, [params.day]);
  const d = DAYS[day];
  const w = WEATHER[day];
  const h = hotelOf(day);
  return (
    <Screen eyebrow={TRIP.route} title={__("План")}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 10, margin: -10 }}>
        {DAYS.map((x, i) => {
          const on = i === day;
          return (
            <Pressable key={x.n} onPress={() => { selectFeel(); setDay(i); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={__('{a}, {b} ноября', { a: x.wd, b: x.n })}
              style={{ width: 56, paddingVertical: 9, borderRadius: 18, alignItems: 'center', backgroundColor: on ? C.blue : C.card, boxShadow: on ? SH.blue : SH.small }}>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: on ? '#fff' : C.muted }}>{x.wd}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 18, color: on ? '#fff' : C.ink }}>{x.n}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: on ? '#fff' : C.muted }} numberOfLines={1}>{WEATHER[i].max || CITY[i]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Card>
        <TitleRow title={`${dayTitle(day)} · ${CITY[day]}`} right={day === TRIP.today ? <Chip tone="warn">{__('сегодня')}</Chip> : null} />
        <Row left={<Icon name={w.icon} size={26} />} title={weatherLine(w)} sub={w.text} />
        {h ? (
          <Row left={<Icon name="bed" size={26} />} title={h.name} sub={`${h.nights} · ${h.addrZh ? __("адрес на 3 языках") : __("адрес пришлёт координатор")}`} right={<Chip>{__('отель')}</Chip>} onPress={() => router.push(`/hotel/${h.key}`)} label={__('Отель: {a}', { a: h.name })} />
        ) : (
          <Row left={<Icon name="bed" size={26} />} title={__("Выезд из отеля до 12:00")} sub={day === DAYS.length - 1 ? __('Багаж у стойки отеля, вылет вечером') : __('Ночь в пути')} />
        )}
      </Card>
      <Section title={__("Расписание")} />
      {/* ключ по дню: при смене дня лента появляется заново, по очереди */}
      <Timeline key={day} events={dayEvents(day)} />
      {DAY_NOTES[day] ? <T muted style={{ paddingHorizontal: 4 }}>{DAY_NOTES[day]}</T> : null}
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{__('Нажмите на обед, ужин или культурную программу — откроется описание и адрес.')}</Text>
      </View>
    </Screen>
  );
}

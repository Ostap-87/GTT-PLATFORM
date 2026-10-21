// «Чат с координатором» (решение 21.10.2026, по примеру Navan: поддержка 24/7 прямо в приложении, без поиска номера в
// мессенджерах). Быстрые ответы — одним нажатием; «Я в автобусе» заодно ставит отметку для сбора группы.
// Координатор открывает тот же чат с пульта: /chat?as=coord.
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TENANT } from '@/data/tenant';
import { ME } from '@/data/trip';
import { useCoord, type Msg } from '@/state/coord';
import { useTrip } from '@/state/trip';
import { okFeel } from '@/ui/haptics';
import { Icon } from '@/ui/Icon';
import { Avatar, Button, Card, Row, initials, inputStyle } from '@/ui/kit';
import { Appear, Press } from '@/ui/motion';
import { C, F, SH } from '@/ui/theme';
import { __ } from '@/i18n';

const QUICK: Record<Msg['from'], string[]> = {
  delegate: [__('Я в автобусе'), __('Опаздываю на 10 минут'), __('Где встречаемся?'), __('Потерялся, нужна помощь'), __('Не успеваю к выезду')],
  coord: [__('Принято'), __('Ждём вас в лобби'), __('Автобус у главного входа'), __('Отправьте, где вы: «Помощь» → «Где я»')],
};

export default function Chat() {
  const { as } = useLocalSearchParams<{ as?: string }>();
  const who: Msg['from'] = as === 'coord' ? 'coord' : 'delegate';
  const k = useCoord();
  const trip = useTrip();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const ref = useRef<ScrollView>(null);
  // открытый чат — сообщения другой стороны прочитаны
  useEffect(() => { k.readChat(who); }, [k, who]);

  const send = (t: string) => {
    const msg = t.trim();
    if (!msg) return;
    okFeel();
    k.sendChat(who, msg);
    if (who === 'delegate' && msg === __('Я в автобусе') && !trip.inBus) trip.setInBus(true);
    setText('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen options={{ title: who === 'coord' ? __('Чат: {a}', { a: ME.ru }) : __('Чат с координатором') }} />
      <ScrollView ref={ref} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}>
        <Card>
          {who === 'delegate' ? (
            <Row left={<Avatar text={TENANT.coordinator.initials} size={42} />} title={TENANT.coordinator.name} sub={__('Координатор · {a} · на связи круглосуточно', { a: TENANT.name })}
              right={<Button title="" icon="phone" kind="light" small label={__("Позвонить координатору")} onPress={() => router.push('/contacts')} />} />
          ) : (
            <Row left={<Avatar text={initials(ME.lat)} size={42} />} title={ME.ru} sub={`${ME.roleRu} · ${ME.coRu}`} />
          )}
        </Card>
        {k.chat.map((m) => {
          const mine = m.from === who;
          return (
            <Appear key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <View style={[{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 }, mine
                ? { backgroundColor: C.blue, borderBottomRightRadius: 6, boxShadow: SH.blue }
                : { backgroundColor: C.card, borderBottomLeftRadius: 6, boxShadow: SH.small }]}>
                <Text style={{ fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: mine ? '#fff' : C.ink }}>{m.text}</Text>
              </View>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.muted, marginTop: 3, marginHorizontal: 6 }}>
                {mine ? `${m.at} · ${k.readBy(m) ? __('прочитано') : __('доставлено')}` : m.at}
              </Text>
            </Appear>
          );
        })}
      </ScrollView>
      <View style={{ paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, gap: 8, backgroundColor: C.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 6 }} keyboardShouldPersistTaps="handled">
          {QUICK[who].map((q) => (
            <Press key={q} onPress={() => send(q)} label={__('Отправить: {a}', { a: q })} style={{ backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, boxShadow: SH.small }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{q}</Text>
            </Press>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16 }}>
          <TextInput value={text} onChangeText={setText} placeholder={__("Сообщение")} placeholderTextColor={C.muted} multiline accessibilityLabel={__("Сообщение координатору")}
            onSubmitEditing={() => send(text)} style={[inputStyle, { flex: 1, minWidth: 0, maxHeight: 120, fontSize: 15 }]} />
          <Press onPress={() => send(text)} label={__("Отправить")} scaleTo={0.9}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? C.blue : '#9fb7dc', alignItems: 'center', justifyContent: 'center', boxShadow: SH.blue }}>
            <Icon name="send" size={20} color="#fff" />
          </Press>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

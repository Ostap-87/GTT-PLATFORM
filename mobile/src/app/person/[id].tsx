// Профиль участника глазами координатора: шапка (этап, автобус, документы, «Позвонить», «Написать») → «Важно в поездке» →
// питание и проживание → связь и цели → документы → заметки координатора → история изменений → «Проверено».
import { router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';

import { NOT_READY, byId, phoneOf } from '@/data/group';
import { ENG, PSTEPS, algNames, dietNames } from '@/data/profile';
import { DELEGATES } from '@/data/trip';
import { useCoord } from '@/state/coord';
import { useToast } from '@/state/toast';
import { useTrip } from '@/state/trip';
import { Avatar, Button, Card, Chip, H3, Plain, Row, T, initials, inputStyle } from '@/ui/kit';
import { C, F } from '@/ui/theme';

const KV = ({ k, v }: { k: string; v: string }) => (
  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line2 }}>
    <Text style={{ width: 96, fontFamily: F.regular, fontSize: 13, color: C.muted }}>{k}</Text>
    <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, color: C.ink }}>{v}</Text>
  </View>
);

function Notes({ id }: { id: string }) {
  const k = useCoord();
  return (
    <Card>
      <H3>Заметки координатора</H3>
      <T muted>Видите только вы и ваша команда — участник их не видит.</T>
      <TextInput value={k.notes[id] || ''} onChangeText={(v) => k.setNote(id, v)} multiline placeholder="Например: принимает решения о закупках; интересна встреча с Meituan" placeholderTextColor={C.muted}
        accessibilityLabel="Заметка координатора" style={{ ...inputStyle, minHeight: 64 }} />
    </Card>
  );
}

export default function Person() {
  const { id = 'd1' } = useLocalSearchParams<{ id: string }>();
  const k = useCoord();
  const { pStep } = useTrip();
  const toast = useToast();
  const d = byId[id];
  const p = k.profileOf(id);
  const s = k.pStage(id);
  const severe = k.severeOf(id);
  const docMiss = k.docsMissing.includes(id);

  const head = (
    <Card>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={severe ? { borderRadius: 32, borderWidth: 3, borderColor: C.red, padding: 1 } : null}><Avatar text={initials(d.lat)} size={56} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.ink }}>{d.ru}</Text>
          <T muted>{`${d.roleRu} · ${d.coRu} · ${d.cityRu}`}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip tone={s[2]}>{s[1]}</Chip>
        {k.missing.includes(id) ? <Chip tone="warn">нет в автобусе</Chip> : <Chip tone="ok">в автобусе</Chip>}
        {docMiss ? <Chip tone="warn">{id === 'd4' ? 'нет билета' : 'нет паспорта'}</Chip> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Позвонить" icon="phone" kind="ghost" small onPress={() => toast(`Звонок: ${phoneOf(id)}`)} /></View>
        <View style={{ flex: 1 }}><Button title="Написать" icon="msg" kind="ghost" small onPress={() => toast(`Откроется чат в ${(p && p.saved && p.msg) || 'приложении'} (в демо без отправки)`)} /></View>
      </View>
    </Card>
  );

  if (!k.ready(id) || !p) {
    const nr = NOT_READY[id];
    return (
      <Plain>
        {head}
        <Card tone="warn">
          <T bold>Профиль ещё не готов</T>
          <T>{nr ? nr.sub : `Заполняет анкету в приложении: шаг ${pStep + 1} из 4 — ${PSTEPS[pStep].toLowerCase()}`}</T>
          {k.reminded[id] ? <Chip tone="info">напоминание отправлено</Chip> : <Button title="Напомнить заполнить" onPress={() => { k.remind(id); toast(`${d.ru} получит напоминание`); }} />}
        </Card>
        <Card>
          <H3>Из заявки</H3>
          <KV k="Телефон" v={phoneOf(id)} />
          <KV k="Компания" v={d.coRu} />
          <KV k="Город" v={d.cityRu} />
          <T muted>Эти данные пришли с заявкой — участник их только проверит.</T>
        </Card>
        <Notes id={id} />
        {id === 'd1' ? <Button title="Смотреть как этот участник" kind="ghost" onPress={() => { k.setViewing(true); router.push('/trip/prep'); }} /> : null}
      </Plain>
    );
  }

  const alg = algNames(p);
  const health = p.health.concat(p.healthNote.trim() ? [p.healthNote.trim()] : []);
  const mates = DELEGATES.filter((x) => x.id !== id)
    .map((x) => { const q = k.profileOf(x.id); return { x, common: (q && q.saved ? q.interests : []).filter((y) => p.interests.includes(y)) }; })
    .filter((m) => m.common.length).sort((a, b) => b.common.length - a.common.length).slice(0, 2);
  const docs: [string, boolean][] = [['Паспорт', !(docMiss && id !== 'd4')], ['Билеты', !(docMiss && id === 'd4')], ['Страховка', true], ['Оплата', true]];
  const hist = k.historyOf(id);

  return (
    <Plain>
      {head}
      {alg.length || health.length ? (
        <Card tone={p.severe ? undefined : 'warn'} style={p.severe ? { backgroundColor: C.redSoft, borderColor: C.redLine } : null}>
          <T bold>Важно в поездке</T>
          {alg.length ? <Text style={{ fontFamily: F.bold, fontSize: 14.5, color: p.severe ? C.red : C.warn }}>{`Аллергия: ${alg.join(', ')}${p.severe ? ' — серьёзная, опасна для жизни' : ''}`}</Text> : null}
          {health.length ? <T>{health.join('; ')}</T> : null}
          {alg.length ? <T muted>Ресторанам — в сводке без имени; гид и переводчик знают и предупредят официанта.</T> : null}
        </Card>
      ) : null}
      <Card>
        <H3>Питание и проживание</H3>
        <KV k="Питание" v={dietNames(p).join(', ') || '—'} />
        <KV k="Аллергия" v={alg.length ? `${alg.join(', ')} · ${p.severe ? 'серьёзная' : 'лёгкая'}` : 'нет'} />
        <KV k="Номер" v={p.room === 'single' ? 'одноместный' : `двухместный · ${p.mate ? `с ${byId[p.mate].ru}` : 'соседа подобрать'}`} />
        <KV k="На будущее" v={p.keep ? 'профиль сохранить для следующих поездок' : 'не сохранять — здоровье удалим через 30 дней после поездки'} />
      </Card>
      <Card>
        <H3>Связь и цели поездки</H3>
        <KV k="Телефон" v={phoneOf(id)} />
        <KV k="Мессенджер" v={p.msg} />
        <KV k="Английский" v={ENG.find(([e]) => e === p.eng)?.[1] || '—'} />
        <KV k="Интересы" v={p.interests.join(', ') || '—'} />
        {mates.length ? <T muted>{`Познакомить: ${mates.map((m) => `${m.x.ru} (${m.common.join(', ').toLowerCase()})`).join('; ')}`}</T> : null}
      </Card>
      <Card>
        <H3>Документы</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {docs.map(([name, ok]) => <Chip key={name} tone={ok ? 'ok' : 'warn'}>{`${name}${ok ? ' ✓' : ' — нет'}`}</Chip>)}
        </View>
      </Card>
      <Notes id={id} />
      <Card>
        <H3>История изменений</H3>
        {hist.length ? hist.map(([when, what], i) => <Row key={`${when}${i}`} title={what} sub={when} />) : <T muted>Пока нет.</T>}
      </Card>
      {s[0] === 'ready'
        ? <Button title="Проверено — всё понятно" icon="check" onPress={() => { k.check(id); toast('Отмечено: профиль проверен'); }} />
        : <T muted style={{ textAlign: 'center' }}>Проверено координатором. Если участник что-то поменяет — вы получите уведомление.</T>}
      {k.missing.includes(id) ? <Button title="Отметить в автобусе" kind="ghost" onPress={() => k.markBus(id)} /> : null}
      {id === 'd1' ? <Button title="Смотреть как этот участник" kind="ghost" onPress={() => { k.setViewing(true); router.push('/trip/prep'); }} /> : null}
    </Plain>
  );
}

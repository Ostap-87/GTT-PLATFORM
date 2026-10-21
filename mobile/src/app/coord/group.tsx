// «Группа» координатора: «Люди» (этапы профилей и фильтры), «Питание» (приёмы пищи, серьёзные аллергии, сводка ресторанам),
// «Расселение» (пары, одноместные, список для отеля латиницей). Путь участника и правила — docs/profile-cjm.md.
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ALG_BY, DIET_BY, NOT_READY, byId } from '@/data/group';
import { algNames, dietNames } from '@/data/profile';
import { DELEGATES, dayEvents, hotelOf } from '@/data/trip';
import { useCoord } from '@/state/coord';
import { Avatar, Button, Card, Chip, Chips, H3, Pick, Row, Seg, T, TitleRow, initials } from '@/ui/kit';
import { Bar, CoordScreen } from '@/ui/coord-ui';
import { C, F } from '@/ui/theme';

type Filter = 'all' | 'attn' | 'alg' | 'diet' | 'todo';

function People() {
  const k = useCoord();
  const [f, setF] = useState<Filter>('all');
  const st = DELEGATES.map((d) => k.pStage(d.id)[0]);
  const n = (x: string) => st.filter((y) => y === x).length;
  const done = n('checked') + n('ready');
  const hasAlg = (id: string) => { const p = k.profileOf(id); return !!p && p.saved && algNames(p).length > 0; };
  const hasDiet = (id: string) => { const p = k.profileOf(id); return !!p && p.saved && p.diets.some((x) => x !== 'none'); };
  const keep = (id: string) => (f === 'attn' ? k.attnOf(id) : f === 'alg' ? hasAlg(id) : f === 'diet' ? hasDiet(id) : f === 'todo' ? !k.ready(id) : true);
  const filters: [Filter, string, number][] = [
    ['all', 'Все', DELEGATES.length], ['attn', 'Требуют внимания', DELEGATES.filter((d) => k.attnOf(d.id)).length], ['alg', 'Аллергии', DELEGATES.filter((d) => hasAlg(d.id)).length],
    ['diet', 'Особое питание', DELEGATES.filter((d) => hasDiet(d.id)).length], ['todo', 'Не заполнили', n('invited') + n('filling')],
  ];
  const rows = DELEGATES.filter((d) => keep(d.id));
  return (
    <>
      <Card>
        <TitleRow title="Профили участников" right={<Text style={{ fontFamily: F.display, fontSize: 26, color: C.ink }}>{`${done}/${DELEGATES.length}`}</Text>} />
        <Bar value={done / DELEGATES.length} />
        <T muted>{`Проверены ${n('checked')} · ждут проверки ${n('ready')} · заполняют ${n('filling')} · не открыли приглашение ${n('invited')}. Срок — за 14 дней до вылета (26.10).`}</T>
      </Card>
      <Chips>{filters.map(([key, l, c]) => <Pick key={key} title={`${l} · ${c}`} on={f === key} onPress={() => setF(key)} />)}</Chips>
      <Card>
        {rows.length ? rows.map((d) => {
          const p = k.profileOf(d.id);
          const s = k.pStage(d.id);
          const ok = k.ready(d.id) && p;
          const food = ok ? dietNames(p).filter((x) => x !== 'Без ограничений') : [];
          const alg = ok ? algNames(p) : [];
          const line = !ok ? (NOT_READY[d.id]?.sub || 'Заполняет анкету в приложении')
            : food.length || alg.length ? (
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                {food.join(', ')}{alg.length ? <Text style={{ fontFamily: F.bold, color: p.severe ? C.red : C.warn }}>{`${food.length ? ' · ' : ''}аллергия: ${alg.join(', ')}`}</Text> : null}
              </Text>
            ) : 'Без ограничений в питании';
          return (
            <Row
              key={d.id}
              onPress={() => router.push(`/person/${d.id}`)}
              label={`Профиль: ${d.ru}`}
              left={<View style={k.severeOf(d.id) ? { borderRadius: 22, borderWidth: 2, borderColor: C.red, padding: 1 } : null}><Avatar text={initials(d.lat)} /></View>}
              title={d.ru}
              sub={<View style={{ gap: 4 }}>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{`${d.roleRu} · ${d.coRu}`}</Text>
                {typeof line === 'string' ? <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{line}</Text> : line}
                <Chip tone={s[2]}>{s[1]}</Chip>
              </View>}
            />
          );
        }) : <T muted>Никого по этому фильтру.</T>}
      </Card>
      <T muted>Нажмите на участника — его профиль: что важно в поездке, питание, номер, документы, история изменений и ваши заметки.</T>
    </>
  );
}

function Food() {
  const k = useCoord();
  const g = k.food;
  const severe = DELEGATES.filter((d) => k.severeOf(d.id));
  const meals = dayEvents(1).filter((e) => e.kind === 'meal');
  return (
    <>
      {k.foodDirty ? (
        <Card tone="warn">
          <T bold>Питание изменилось после отправки</T>
          <T>{k.foodChanges().join('; ')}</T>
          <Button title="Отправить обновление ресторанам" onPress={() => router.push('/food-summary')} />
        </Card>
      ) : null}
      <Card>
        <H3>Сегодня · Вт, 10 ноября</H3>
        {meals.map((e) => (
          <Row key={e.t} title={`${e.t}  ${e.name}`} sub={`${e.place} · ${k.foodDirty ? 'сводка устарела' : `сводка отправлена ${k.foodSent.at}`}`}
            right={<Chip tone={k.foodDirty ? 'warn' : 'ok'}>{k.foodDirty ? 'обновить' : 'ресторан знает'}</Chip>} />
        ))}
      </Card>
      <Card>
        <TitleRow title="Серьёзные аллергии" right={<Chip tone="new">{String(severe.length)}</Chip>} />
        <T muted>Видите вы, гид и переводчик. Перед каждым приёмом пищи — напоминание.</T>
        {severe.length ? severe.map((d) => {
          const p = k.profileOf(d.id)!;
          return (
            <Row key={d.id} onPress={() => router.push(`/person/${d.id}`)} title={d.ru}
              sub={<><Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.red, marginTop: 2 }}>{algNames(p).join(', ')}</Text>{p.healthNote.trim() ? <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{p.healthNote.trim()}</Text> : null}</>}
              right={<Chip tone="new">серьёзная</Chip>} />
          );
        }) : <T muted>Нет.</T>}
      </Card>
      <Card>
        <TitleRow title="Питание группы" right={<Chip tone={g.filled === DELEGATES.length ? 'ok' : 'warn'}>{`профили ${g.filled}/${DELEGATES.length}`}</Chip>} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(g.dc).map(([key, c]) => <Chip key={key} tone="info">{`${DIET_BY[key][1]} · ${c}`}</Chip>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(g.ac).map(([key, c]) => <Chip key={key} tone={g.sev[key] ? 'new' : 'warn'}>{`${ALG_BY[key][1]} · ${c}${g.sev[key] ? ` · серьёзная у ${g.sev[key]}` : ''}`}</Chip>)}
        </View>
        <Button title="Сводка для ресторана · 中文" icon="translate" kind="light" onPress={() => router.push('/food-summary')} />
      </Card>
    </>
  );
}

function Rooms() {
  const k = useCoord();
  const r = k.rooming();
  const h = hotelOf(1)!;
  return (
    <>
      <Card>
        <TitleRow title={h.name} right={<T muted>{h.nights}</T>} />
        <T>{`Номеров: ${r.pairs.length + r.singles.length + r.open.length} · двухместных ${r.pairs.length} · одноместных ${r.singles.length}${r.open.length ? ` · не решено ${r.open.length}` : ''}`}</T>
        <Button title="Список для отеля (латиницей)" kind="light" onPress={() => router.push('/rooming')} />
      </Card>
      {r.open.length ? (
        <Card>
          <TitleRow title="Нужно решить" right={<Chip tone="warn">{String(r.open.length)}</Chip>} />
          {r.open.map((id) => (
            <Row key={id} onPress={() => router.push(`/person/${id}`)} title={byId[id].ru}
              sub={k.ready(id) ? 'двухместный — сосед не выбран или не совпал' : 'профиль не заполнен'} right={<Chip tone="warn">решить</Chip>} />
          ))}
        </Card>
      ) : null}
      <Card>
        <H3>Двухместные</H3>
        {r.pairs.map(([a, b]) => <Row key={a} title={`${byId[a].ru} + ${byId[b].ru}`} sub="двухместный · пожелания совпали" right={<Chip tone="ok">пара</Chip>} />)}
      </Card>
      <Card>
        <H3>Одноместные</H3>
        {r.singles.map((id) => <Row key={id} title={byId[id].ru} sub="одноместный" right={<Chip tone="info">один</Chip>} />)}
      </Card>
    </>
  );
}

export default function Group() {
  const [tab, setTab] = useState<'people' | 'food' | 'rooms'>('people');
  return (
    <CoordScreen title={`Группа · ${DELEGATES.length}`}>
      <Seg options={[['people', 'Люди'], ['food', 'Питание'], ['rooms', 'Расселение']] as const} value={tab} onChange={setTab} />
      {tab === 'food' ? <Food /> : tab === 'rooms' ? <Rooms /> : <People />}
    </CoordScreen>
  );
}

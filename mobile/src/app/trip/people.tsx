// «Люди»: связь с координатором, «Вам стоит познакомиться», делегаты группы (без телефонов — контакты по согласию).
import { router } from 'expo-router';

import { TENANT } from '@/data/tenant';
import { DELEGATES, INTROS, ME } from '@/data/trip';
import { useToast } from '@/state/toast';
import { useTrip } from '@/state/trip';
import { Avatar, Button, Card, Row, Screen, T, TitleRow, initials } from '@/ui/kit';
import { C } from '@/ui/theme';

const byId = Object.fromEntries(DELEGATES.map((d) => [d.id, d]));

export default function People() {
  const { intros, introduce } = useTrip();
  const toast = useToast();
  return (
    <Screen eyebrow={`Группа · ${DELEGATES.length} делегатов и 2 организатора`} title="Люди">
      <Card tone="dark">
        <TitleRow title={<T bold style={{ color: '#fff' }}>Связь с координатором</T>} />
        <T style={{ color: C.onDark }}>{`${TENANT.coordinator.name} · ${TENANT.id !== 'gtt' ? 'на связи' : 'русский, китайский, английский'} · круглосуточно`}</T>
        <Button title="Все контакты и экстренные номера" onPress={() => router.push('/contacts')} />
      </Card>
      {INTROS.length ? <Card>
        <TitleRow title="Вам стоит познакомиться" />
        {INTROS.map(({ id, why }) => {
          const d = byId[id];
          const done = intros[id];
          return (
            <Row
              key={id}
              left={<Avatar text={initials(d.lat)} />}
              title={d.ru}
              sub={why}
              right={<Button title={done ? 'Запрос отправлен' : 'Познакомиться'} kind="light" small onPress={() => { if (!done) { introduce(id); toast(`${d.ru} получит запрос; контактами обменяетесь, если оба согласны`); } }} />}
            />
          );
        })}
      </Card> : null}
      <Card>
        <TitleRow title="Делегаты" right={<T muted>{DELEGATES.length}</T>} />
        {DELEGATES.map((d) => (
          <Row key={d.id} left={<Avatar text={initials(d.lat)} />} title={d.id === ME.id ? `${d.ru} (вы)` : d.ru} sub={[d.roleRu, d.coRu, d.cityRu].filter(Boolean).join(' · ')} />
        ))}
        <T muted>Телефоны в списке не показываем: контактами обмениваются по согласию.</T>
      </Card>
    </Screen>
  );
}

// «Люди»: связь с координатором, «Вам стоит познакомиться», делегаты группы (без телефонов — контакты по согласию).
import { router } from 'expo-router';

import { TENANT } from '@/data/tenant';
import { DELEGATES, INTROS, ME } from '@/data/trip';
import { useToast } from '@/state/toast';
import { useTrip } from '@/state/trip';
import { Avatar, Button, Card, Row, Screen, T, TitleRow, initials } from '@/ui/kit';
import { C } from '@/ui/theme';
import { __ } from '@/i18n';

const byId = Object.fromEntries(DELEGATES.map((d) => [d.id, d]));

export default function People() {
  const { intros, introduce } = useTrip();
  const toast = useToast();
  return (
    <Screen eyebrow={__('Группа · {a} делегатов и 2 организатора', { a: DELEGATES.length })} title={__("Люди")}>
      <Card tone="dark">
        <TitleRow title={<T bold style={{ color: '#fff' }}>{__('Связь с координатором')}</T>} />
        <T style={{ color: C.onDark }}>{__('{a} · {b} · круглосуточно', { a: TENANT.coordinator.name, b: TENANT.id !== 'gtt' ? __('на связи') : __('русский, китайский, английский') })}</T>
        <Button title={__("Все контакты и экстренные номера")} onPress={() => router.push('/contacts')} />
      </Card>
      {INTROS.length ? <Card>
        <TitleRow title={__("Вам стоит познакомиться")} />
        {INTROS.map(({ id, why }) => {
          const d = byId[id];
          const done = intros[id];
          return (
            <Row
              key={id}
              left={<Avatar text={initials(d.lat)} />}
              title={d.ru}
              sub={why}
              right={<Button title={done ? __('Запрос отправлен') : __('Познакомиться')} kind="light" small onPress={() => { if (!done) { introduce(id); toast(__('{a} получит запрос; контактами обменяетесь, если оба согласны', { a: d.ru })); } }} />}
            />
          );
        })}
      </Card> : null}
      <Card>
        <TitleRow title={__("Делегаты")} right={<T muted>{DELEGATES.length}</T>} />
        {DELEGATES.map((d) => (
          <Row key={d.id} left={<Avatar text={initials(d.lat)} />} title={d.id === ME.id ? __('{a} (вы)', { a: d.ru }) : d.ru} sub={[d.roleRu, d.coRu, d.cityRu].filter(Boolean).join(' · ')} />
        ))}
        <T muted>{__('Телефоны в списке не показываем: контактами обмениваются по согласию.')}</T>
      </Card>
    </Screen>
  );
}

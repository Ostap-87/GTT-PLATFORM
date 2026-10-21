// «Поездки»: все поездки (полный доступ) или только назначенные (ограниченный); статус публикации и неопубликованные правки.
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { datesText } from '@/data/admin';
import { REGION_RU, TENANT } from '@/data/tenant';
import { useAdmin } from '@/state/admin';
import { AdminScreen } from '@/ui/admin-ui';
import { Button, Card, Chip, Row, T, TitleRow } from '@/ui/kit';
import { Monogram } from '@/ui/Monogram';
import { C, F } from '@/ui/theme';

export default function AdminTrips() {
  const a = useAdmin();
  return (
    <AdminScreen title="Поездки">
      {/* white label: какой организатор (клиент платформы) открыт и где хранятся данные его участников */}
      <Card onPress={() => router.push('/join')} label={`Организатор: ${TENANT.name}. Сменить`}>
        <Row first left={<Monogram t={TENANT} size={40} />} title={`Организатор: ${TENANT.name}`}
          sub={`Код приглашения ${TENANT.code} · данные участников хранятся: ${REGION_RU[TENANT.region]}`} right={<Chip tone="info">сменить</Chip>} />
        <Button title={TENANT.custom ? 'Кабинет организатора' : 'Кабинет: новый организатор'} kind="light" icon="grid"
          onPress={() => router.push(TENANT.custom ? `/org?id=${TENANT.id}` : '/org?new=1')} />
      </Card>
      <Card tone="info">
        <T>{a.level === 'full'
          ? 'Поездка создаётся из программы сайта, дальше — даты, дни, люди. Правки копятся в черновике и уходят делегатам кнопкой «Опубликовать».'
          : 'Ограниченный доступ: видны только назначенные вам поездки, правки уходят администратору на публикацию.'}</T>
      </Card>
      {a.can('trip.create') ? <Button title="Создать поездку из программы" icon="globe" onPress={() => router.push('/admin/programs')} /> : null}
      {a.myTrips.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/admin-trip/${t.id}`)} label={`Поездка ${t.title}`}>
          <TitleRow title={t.title} right={<Chip tone={t.status === 'published' && !t.pending ? 'ok' : 'warn'}>{t.status === 'draft' ? 'черновик' : t.pending ? 'есть правки' : 'опубликована'}</Chip>} />
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{datesText(t)}</Text>
          <T muted>{`${t.days.length} дн. · ${[...new Set(t.days.map((d) => d.city))].join(' → ')}`}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip tone="info">{`участников ${t.people.length}`}</Chip>
            <Chip tone="info">{`событий ${t.days.reduce((n, d) => n + d.events.length, 0)}`}</Chip>
            {t.pending ? <Chip tone="warn">{`не опубликовано ${t.pending}`}</Chip> : null}
          </View>
        </Card>
      ))}
      {!a.myTrips.length ? <T muted>Поездок пока нет.</T> : null}
    </AdminScreen>
  );
}

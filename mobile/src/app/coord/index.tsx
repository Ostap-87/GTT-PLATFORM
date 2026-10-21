// «Пульт» координатора: цифры дня, сбор группы, переезды, «Требует внимания» — только то, что ждёт действия.
import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { AGENCY, calcTitle, citLine, tourById } from '@/data/agent';
import { VISITS, byId, fem, plural } from '@/data/group';
import { DELEGATES, ME, TRIP } from '@/data/trip';
import { useAgent } from '@/state/agent';
import { useCoord } from '@/state/coord';
import { useToast } from '@/state/toast';
import { Avatar, Button, Card, Chip, Row, T, TitleRow, initials } from '@/ui/kit';
import { Bar, CoordScreen, LegsCard, Stat } from '@/ui/coord-ui';
import { C } from '@/ui/theme';
import { TENANT } from '@/data/tenant';

type Item = { key: string; title: string; sub?: string; btns: [string, 'primary' | 'ghost', () => void][] };

export default function Center() {
  const k = useCoord();
  const ag = useAgent();
  const toast = useToast();
  const ready = DELEGATES.filter((d) => k.ready(d.id)).length;
  // визиты Hema и Pinduoduo с их вопросами есть только в подробном демо
  const has = (id: string) => VISITS.some((v) => v.id === id);
  const conf = VISITS.filter((v) => v.st[0] === 'ok').length + (k.hema === 'accepted' && has('hema') ? 1 : 0);
  const todo = k.notReady.filter((d) => !k.reminded[d.id]);

  const items: Item[] = [];
  // делегат нажал «Помощь → Отправить, где я» — самое срочное наверху
  k.where.filter((w) => !w.seen).forEach((w) => items.push({
    key: `w-${w.id}`, title: `Где сейчас ${w.who} · отправлено в ${w.at}`, sub: `Точность ~${Math.round(w.acc || 0)} м · ${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}`,
    btns: [['Открыть на карте', 'primary', () => Linking.openURL(w.links[0])], ['Позвонил, всё в порядке', 'ghost', () => k.seeWhere(w.id)]],
  }));
  // сообщения делегата в чате приложения
  const lastD = [...k.chat].reverse().find((m) => m.from === 'delegate');
  if (k.unread('coord') > 0 && lastD) items.push({
    key: 'chat', title: `${ME.ru} пишет в чат · ${lastD.at}`, sub: `«${lastD.text}»${k.unread('coord') > 1 ? ` и ещё ${k.unread('coord') - 1}` : ''}`,
    btns: [['Ответить', 'primary', () => router.push({ pathname: '/chat', params: { as: 'coord' } })]],
  });
  if (k.foodDirty) items.push({ key: 'food', title: 'Питание изменилось после отправки ресторанам', sub: `Сводка ушла ${k.foodSent.at}; с тех пор: ${k.foodChanges().join('; ')}`, btns: [['Отправить обновление', 'primary', () => router.push('/food-summary')]] });
  DELEGATES.filter((d) => k.pStage(d.id)[0] === 'ready').forEach((d) => items.push({
    key: `p-${d.id}`, title: `${d.ru} ${fem(d.id) ? 'заполнила' : 'заполнил'} профиль — проверьте`, sub: k.foodLineOf(d.id),
    btns: [['Открыть профиль', 'primary', () => router.push(`/person/${d.id}`)]],
  }));
  if (todo.length) items.push({
    key: 'todo', title: `${todo.length} ${plural(todo.length, 'профиль не заполнен', 'профиля не заполнены', 'профилей не заполнены')}`, sub: todo.map((d) => d.ru).join(', '),
    btns: [['Напомнить всем', 'ghost', () => { k.remindAll(); toast('Напоминания отправлены: push и мессенджер'); }]],
  });
  ag.apps.filter((x) => x.status === 'new').forEach((x) => items.push({
    key: `a-${x.id}`, title: `${x.mine ? `Заявка агента ${AGENCY}` : x.agency.startsWith('Сайт') ? 'Заявка с сайта' : `Заявка агента ${x.agency}`}: ${tourById[x.tour].title}`, sub: `${x.dates} · ${x.people} чел. · ${x.client}`,
    btns: [['Взять в работу', 'primary', () => { ag.takeApp(x.id); toast(x.mine ? 'Агент видит: заявка в работе' : 'Заявка в работе'); }], ['Все заявки', 'ghost', () => router.navigate('/coord/leads')]],
  }));
  ag.calcs.filter((r) => r.status === 'new').forEach((r) => items.push({
    key: `c-${r.id}`, title: `Запрос на расчёт ${r.id} от ${AGENCY}`, sub: `${calcTitle(r)} · ${r.people} чел. · ${citLine(r.cit)}`,
    btns: [['Открыть ТЗ', 'primary', () => router.push({ pathname: '/calc/[id]', params: { id: r.id, as: 'coord' } })]],
  }));
  if (k.hema === 'pending' && has('hema')) items.push({ key: 'hema', title: 'Hema предлагает 14:00 вместо 13:30', sub: 'Ср, 11 ноября · написали на странице визита',
    btns: [['Принять и сообщить группе', 'primary', () => { k.setHema('accepted'); toast('Принято: делегаты и автобус узнают о 14:00'); }], ['Открыть визит', 'ghost', () => router.push('/visit/hema')]] });
  k.followups.filter((f) => f.status === 'new').forEach((f) => items.push({
    key: `f-${f.id}`, title: `Анна Смирнова хочет продолжить с ${f.company}`, sub: `${f.typeRu}${f.consent ? ' · контакты передать можно' : ' · без контактов'}`,
    btns: [['Отправить компании', 'primary', () => { k.sendFollowup(f.id); toast(`${f.company} получит запрос по-китайски`); }]],
  }));
  k.reviews.filter((r) => r.status === 'new').forEach((r) => items.push({
    key: `r-${r.id}`, title: `Отзыв о поездке от Анны Смирновой · ${r.video ? 'видео 0:48' : 'текст'}`, sub: r.text ? `«${r.text}»` : 'Видеоотзыв с телефона',
    btns: ([['Поблагодарить', 'primary', () => { k.markReview(r.id, 'thanked'); toast('Анна получит благодарность'); }]] as Item['btns'])
      .concat(r.consent ? [[`В соцсети ${TENANT.short}`, 'ghost', () => { k.markReview(r.id, 'shared'); toast(`Отзыв в очереди публикаций ${TENANT.short} — выйдет после вашего «утверждаю»`); }]] : []),
  }));
  if (!k.pddReminded && has('pdd')) items.push({ key: 'pdd', title: 'Pinduoduo не открыла ссылку визита · 3 дня', btns: [['Напомнить', 'ghost', () => { k.remindPdd(); toast('Pinduoduo получит напоминание в WeChat'); }]] });
  if (!k.igorReminded) items.push({ key: 'igor', title: 'Игорь Белов · нет билета', btns: [['Напомнить', 'ghost', () => { k.remindIgor(); toast('Игорь получит напоминание в Telegram'); }]] });

  const dep = k.legs.l1?.dep;
  return (
    <CoordScreen title={`${TRIP.programId ? TRIP.title : 'Новый ритейл'} · день ${TRIP.today + 1}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat dark label="В автобусе" value={`${k.busCount} / ${DELEGATES.length}`} sub={dep ? `выехали в ${dep}` : 'выезд в 09:30'} />
        <Stat label="Визиты подтверждены" value={`${conf} / ${VISITS.length}`} sub={VISITS.filter((v) => v.st[0] !== 'ok' && !(v.id === 'hema' && k.hema === 'accepted')).map((v) => v.name.split(' ')[0]).join(', ')} />
        <Stat label="Профили готовы" value={`${ready} / ${DELEGATES.length}`} sub={k.notReady.length ? `${k.notReady.length} ждём` : 'все заполнены'} />
        <Stat label="Документы" value={`${DELEGATES.length - k.docsMissing.length} / ${DELEGATES.length}`} sub={`${k.docsMissing.length} ждём`} />
      </View>

      <Card>
        <TitleRow title="Сбор группы · автобус №2" right={<Chip tone={k.missing.length ? 'warn' : 'ok'}>{`${k.busCount}/${DELEGATES.length}`}</Chip>} />
        <Bar value={k.busCount / DELEGATES.length} />
        {k.missing.length ? k.missing.map((id) => (
          <Row
            key={id}
            left={<Avatar text={initials(byId[id].lat)} />}
            title={byId[id].ru}
            right={<View style={{ flexDirection: 'row', gap: 6 }}>
              <Button title="" icon="phone" kind="ghost" small label={`Позвонить: ${byId[id].ru}`} onPress={() => toast(`Звонок: ${byId[id].ru} (в демо без звонка)`)} />
              <Button title="В автобусе" kind="ghost" small onPress={() => k.markBus(id)} />
            </View>}
          />
        )) : <T muted>Все в автобусе.</T>}
        {dep ? <Chip tone="ok">{`Выехали в ${dep} · JD.com знает: прибытие ~10:25`}</Chip> : null}
      </Card>

      <LegsCard />

      <Card onPress={() => router.push({ pathname: '/chat', params: { as: 'coord' } })} label="Чат с делегатами">
        <TitleRow title="Чат с делегатами" right={k.unread('coord') > 0 ? <Chip tone="new">{`${k.unread('coord')} новых`}</Chip> : <Chip tone="ok">всё прочитано</Chip>} />
        <T muted numberOfLines={2}>{lastD ? `${ME.ru}, ${lastD.at}: «${lastD.text}»` : 'Делегаты пишут сюда из приложения — без поиска номера в мессенджерах.'}</T>
      </Card>

      <Card>
        <TitleRow title="Радиогид для группы" right={k.guideLive ? <Chip tone="new">в эфире</Chip> : null} />
        {k.guideLive ? (
          <>
            <T muted>Говорит Ли Мэй · {`слушают ${Math.min(11, DELEGATES.length)} из ${DELEGATES.length}`}</T>
            <Button title="Остановить трансляцию" kind="ghost" onPress={() => { k.setGuideLive(false); toast('Трансляция остановлена'); }} />
          </>
        ) : (
          <>
            <T muted>Переводчик или гид говорит в свой телефон, группа слушает в своих наушниках.</T>
            <Button title="Начать трансляцию" icon="headphones" onPress={() => { k.setGuideLive(true); toast('Делегаты видят «Гид в эфире»'); }} />
          </>
        )}
      </Card>
      {k.out ? <Card tone="info"><T bold>Свободное время</T><T>{`Гуляет самостоятельно: Анна Смирнова, вернётся до ${k.out}`}</T></Card> : null}

      <Card>
        <TitleRow title="Требует внимания" right={<Chip tone={items.length ? 'warn' : 'ok'}>{items.length ? String(items.length) : 'всё решено'}</Chip>} />
        {items.length ? items.map((a) => (
          <View key={a.key} style={{ gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 }}>
            <T bold>{a.title}</T>
            {a.sub ? <T muted>{a.sub}</T> : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {a.btns.map(([l, kind, fn]) => <Button key={l} title={l} kind={kind} small onPress={fn} />)}
            </View>
          </View>
        )) : <T muted>Новых дел нет.</T>}
      </Card>
    </CoordScreen>
  );
}

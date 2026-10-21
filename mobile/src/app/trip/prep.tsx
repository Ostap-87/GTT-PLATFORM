// «Поездка»: мой профиль (питание, аллергии, номер), подготовка до выезда — документы, интересы, памятка; после поездки — отзыв (шаг 2).
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CHECK_DOCS } from '@/data/docs';
import { foodLine } from '@/data/profile';
import { countryOf } from '@/data/countries';
import { VISITS, plural } from '@/data/group';
import { VISIT_DAY } from '@/data/mindmap';
import { MAP_LEGS, MAP_STOPS, ROUTE_STATS, routeText } from '@/data/route';
import { CHECKLIST, CITY, CULTURE, DAYS, ME, TRIP, monthOf } from '@/data/trip';
import { useCoord } from '@/state/coord';
import { useToast } from '@/state/toast';
import { useTrip } from '@/state/trip';
import { Icon } from '@/ui/Icon';
import { Avatar, Button, Card, Check, Chip, Field, H3, Row, Screen, Seg, T, TitleRow, initials } from '@/ui/kit';
import { CountryApps } from '@/ui/ChinaApps';
import { EsimOffers } from '@/ui/EsimOffers';
import { RemindersCard } from '@/ui/RemindersCard';
import { RouteMap } from '@/ui/RouteMap';
import { C, F, SH } from '@/ui/theme';
import { TENANT } from '@/data/tenant';
import { __ } from '@/i18n';

/** «Страна: связь, оплата, розетки» — раскрывающиеся советы с отметкой «сделано»; набор — по стране поездки. */
function CountryPrep() {
  const { done, toggle } = useTrip();
  const [open, setOpen] = useState<string | null>(null);
  const country = countryOf(TRIP.country);
  const items = country.prep;
  const n = items.filter((c) => done[c.key]).length;
  return (
    <Card>
      <TitleRow title={`${country.ru}: связь, оплата, розетки · ${n} из ${items.length}`} />
      {items.map((c) => {
        const on = !!done[c.key];
        const isOpen = open === c.key;
        return (
          <View key={c.key} style={{ borderTopWidth: 1, borderTopColor: C.line2, paddingVertical: 10, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable onPress={() => toggle(c.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${c.title}: сделано`} hitSlop={8}
                style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: on ? C.green : C.well, boxShadow: on ? '0px 4px 10px rgba(30, 142, 90, 0.3)' : SH.inset, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={14} color="#fff" /> : null}
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => setOpen(isOpen ? null : c.key)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${c.title}, ${isOpen ? 'свернуть' : 'подробнее'}`}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.ink }}>{c.title}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{isOpen ? c.sub : `${c.sub} · подробнее`}</Text>
              </Pressable>
            </View>
            {isOpen ? c.how.map((h) => <T key={h} style={{ paddingLeft: 34 }}>{`• ${h}`}</T>) : null}
          </View>
        );
      })}
      <T muted>Самые частые вопросы первого дня. Не нашли ответ — напишите координатору.</T>
    </Card>
  );
}

/** «В поездке»: прогресс поездки, культурная программа и инструменты дня. */
function During() {
  const i = TRIP.today;
  const past = VISITS.filter((v) => VISIT_DAY[v.id] < i).length;
  const today = VISITS.filter((v) => VISIT_DAY[v.id] === i).map((v) => v.name);
  const culture = Object.entries(CULTURE);
  return (
    <>
      <Card>
        <TitleRow title={`День ${i + 1} из ${DAYS.length}`} right={<Chip tone="info">{CITY[i]}</Chip>} />
        <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line2, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(((i + 1) / DAYS.length) * 100)}%`, height: '100%', backgroundColor: C.blue }} />
        </View>
        <T muted>{`Пройдено визитов: ${past} из ${VISITS.length}${today.length ? ` · сегодня ${today.slice(0, -1).join(', ')}${today.length > 1 ? ' и ' : ''}${today[today.length - 1]}` : ''}`}</T>
      </Card>
      {culture.length ? (
        <Card>
          <H3>Культурная программа</H3>
          {culture.map(([key, c]) => (
            <Row key={key} title={c.title} sub={c.when} right={<Chip tone="dark">культура</Chip>} onPress={() => router.push(`/culture/${key}`)} label={c.title} />
          ))}
        </Card>
      ) : null}
      <Card>
        <H3>В дороге пригодится</H3>
        <Row title="Переводчик" sub={TRIP.country === 'cn' ? 'Говорите по-русски — собеседник слышит по-китайски' : `Говорите по-русски — собеседник слышит перевод на ${countryOf(TRIP.country).lang.ru.split(' ')[0]}`} left={<Icon name="translate" size={22} color={C.blueInk} />} onPress={() => router.push('/translator')} label="Переводчик" />
        <Row title="Слушать гида" sub="Радиогид в наушниках, субтитры на русском" left={<Icon name="headphones" size={22} color={C.blueInk} />} onPress={() => router.push('/guide')} label="Слушать гида" />
        <Row title="Помощь" sub="Карточка на местном языке, звонок координатору, «где я»" left={<Icon name="help" size={22} color={C.warn} />} onPress={() => router.push('/help')} label="Помощь" />
        <Row title="Мои документы" sub="Паспорт, билеты, страховка — крупно, без интернета" left={<Icon name="passport" size={22} color={C.blueInk} />} onPress={() => router.push('/docs')} label="Мои документы" />
        <Row title="Расходы" sub="Фото чека → сумма в рублях → отчёт для бухгалтерии" left={<Icon name="receipt" size={22} color={C.blueInk} />} onPress={() => router.push('/expenses')} label="Расходы" />
        <Row title="Поиск по поездке" sub="Компании, адреса, телефоны, заметки, визитки" left={<Icon name="search" size={22} color={C.blueInk} />} onPress={() => router.push('/search')} label="Поиск по поездке" />
        <Row title="Город" sub={`Шопинг, вечер, магазины 24/7 и туалеты рядом с отелем, ${countryOf(TRIP.country).currency.ru} в рубли`} left={<Icon name="map" size={22} color={C.blueInk} />} onPress={() => router.push('/city')} label="Город" />
        <Row title="Майндмэп дня" sub="Темы встреч, договорённости и контакты — картой из ваших заметок" left={<Icon name="mindmap" size={22} color={C.blueInk} />} onPress={() => router.push('/mindmap')} label="Майндмэп дня" />
        <Row title="Итоги поездки — PDF" sub="Компании, заметки, фото и визитки одним файлом" left={<Icon name="doc" size={22} color={C.blueInk} />} onPress={() => router.push('/report')} label="Итоги поездки" />
      </Card>
    </>
  );
}

/** «После»: отзыв текстом или видео, оценка визита, «Хочу продолжить» с компаниями. */
function After() {
  const k = useCoord();
  const toast = useToast();
  const [mode, setMode] = useState<'text' | 'video'>('text');
  const [text, setText] = useState('');
  const [video, setVideo] = useState(false);
  const [consent, setConsent] = useState(true);
  const sent = k.reviews[0];
  const send = () => {
    if (mode === 'text' && !text.trim()) return toast('Напишите пару слов о поездке');
    if (mode === 'video' && !video) return toast('Сначала запишите видео');
    k.addReview({ text: mode === 'text' ? text.trim() : '', video: mode === 'video', consent });
    toast('Спасибо! Отзыв у координатора');
  };
  return (
    <>
      <Card onPress={() => router.push('/expenses')} label="Отчёт о расходах">
        <Row left={<Icon name="receipt" size={22} color={C.blueInk} />} title="Отчёт о расходах для бухгалтерии" sub="Excel или PDF с чеками, суммы в рублях по курсу ЦБ" />
      </Card>
      <Card tone="accent">
        <H3>Итоги поездки одним PDF</H3>
        <T>Майндмэп поездки с главными темами и вехами, по дням — компании, заметки, фото и контакты с визиток.</T>
        <Button title="Собрать итоги" icon="doc" onPress={() => router.push('/report')} />
        <Button title="Майндмэп поездки" icon="mindmap" kind="light" onPress={() => router.push({ pathname: '/mindmap', params: { day: 'trip' } })} />
      </Card>
      <Card>
        <H3>Отзыв о поездке</H3>
        {sent ? <Card tone="info"><T>{`Спасибо! Отзыв${sent.video ? ' (видео)' : ''} у координатора.`}</T></Card> : (
          <>
            <Seg options={[['text', 'Текстом'], ['video', 'Видео']] as const} value={mode} onChange={setMode} />
            {mode === 'text'
              ? <Field label="Ваш отзыв" value={text} onChangeText={setText} placeholder="Что было самым полезным? Что улучшить?" multiline />
              : video
                ? <Row left={<Icon name="video" size={24} color={C.ink} />} title="Видео 0:48 записано" sub="Можно переснять" right={<Button title="Переснять" kind="ghost" small onPress={() => toast('Камера откроется в приложении')} />} />
                : <Button title="Записать видео до 2 минут" icon="video" kind="ghost" onPress={() => { setVideo(true); toast('Видео 0:48 записано (в демо — без камеры)'); }} />}
            <Check on={consent} onPress={() => setConsent(!consent)}>{`Разрешаю ${TENANT.name} опубликовать отзыв на сайте и в соцсетях`}</Check>
            <Button title="Отправить отзыв" onPress={send} />
          </>
        )}
      </Card>
      <Card>
        <H3>{`Оцените визит в ${VISITS[0]?.name || 'компанию'}`}</H3>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => k.setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} из 5`} hitSlop={6}>
              <Text style={{ fontSize: 32, color: n <= k.rating ? '#f5a623' : C.line }}>★</Text>
            </Pressable>
          ))}
        </View>
        <T muted>{k.rating ? 'Спасибо! Компания увидит общую оценку группы, без имён.' : 'Компания видит только общую оценку группы.'}</T>
      </Card>
      <Card>
        <H3>Хочу продолжить</H3>
        <T muted>Образцы, переговоры, повторная встреча — координатор передаст компании.</T>
        <Button title="Оставить запрос" onPress={() => router.push('/followup')} />
        {k.followups.map((f) => <Row key={f.id} title={`${f.company} · ${f.typeRu}`} sub={f.status === 'new' ? 'у координатора' : 'передано компании'} right={<Chip tone={f.status === 'new' ? 'info' : 'ok'}>{f.status === 'new' ? 'отправлено' : 'передано'}</Chip>} />)}
      </Card>
      <Card>
        <H3>Фото, видео и отчёт</H3>
        <T muted>{`Откроются ${DAYS[DAYS.length - 1].n} ${monthOf(DAYS.length - 1)}, после возвращения группы.`}</T>
      </Card>
    </>
  );
}

export default function Prep() {
  const { done, toggle, profile, pStep, docs } = useTrip();
  const [stage, setStage] = useState<'before' | 'during' | 'after'>('before');
  // паспорт и билеты отмечаются сами, когда документ есть в «Моих документах»
  const docsOf = (key: string) => docs.filter((d) => CHECK_DOCS[key]?.includes(d.kind)).length;
  const isDone = (key: string) => !!done[key] || docsOf(key) > 0;
  const count = CHECKLIST.filter((c) => isDone(c.key)).length;
  return (
    <Screen eyebrow={`${ME.ru} · делегат`} title="Моя поездка">
      <Card onPress={() => router.push('/profile')} label="Мой профиль">
        <Row
          left={<Avatar text={initials(ME.lat)} />}
          title="Мой профиль"
          sub={profile.saved ? foodLine(profile) : pStep ? `Анкета: шаг ${pStep + 1} из 4 — продолжите` : 'Анкета из 4 шагов, около 3 минут — заполните до 26 октября'}
          right={<Chip tone={profile.saved ? 'ok' : 'warn'}>{profile.saved ? 'заполнен' : 'заполнить'}</Chip>}
        />
      </Card>
      <View style={{ flexDirection: 'row', backgroundColor: C.line2, borderRadius: 10, padding: 3 }}>
        {([['before', 'До'], ['during', 'В поездке'], ['after', 'После']] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setStage(k)} accessibilityRole="button" accessibilityState={{ selected: stage === k }}
            style={{ flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: stage === k ? C.card : 'transparent' }}>
            <Text style={{ fontFamily: stage === k ? F.bold : F.medium, fontSize: 13, color: C.ink }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {stage === 'before' ? (
        <>
          <Card onPress={() => router.push('/route')} label="Маршрут поездки">
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 96, height: 115, borderRadius: 10, overflow: 'hidden' }}>
                <RouteMap compact cc={TRIP.country} stops={MAP_STOPS} legs={MAP_LEGS} shown={99} width={96} height={115} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <H3>Как мы поедем</H3>
                <T>{routeText()}</T>
                <T muted>{`${ROUTE_STATS.cities} ${plural(ROUTE_STATS.cities, 'город', 'города', 'городов')} · ${ROUTE_STATS.days} ${plural(ROUTE_STATS.days, 'день', 'дня', 'дней')} · ${ROUTE_STATS.visits} ${plural(ROUTE_STATS.visits, 'компания', 'компании', 'компаний')} — смотреть маршрут`}</T>
              </View>
            </View>
          </Card>
          <Card>
            <TitleRow title={`Подготовка · ${count} из ${CHECKLIST.length}`} />
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line2, overflow: 'hidden' }}>
              <View style={{ width: `${(count / CHECKLIST.length) * 100}%`, height: '100%', backgroundColor: C.green }} />
            </View>
            {CHECKLIST.map((c) => {
              const on = isDone(c.key);
              const sub = c.key === 'profile' && profile.saved ? foodLine(profile) : docsOf(c.key) ? `В «Моих документах»: ${docsOf(c.key)}` : CHECK_DOCS[c.key] && !on ? 'Добавьте в «Мои документы» — откроется без интернета' : c.sub;
              return (
                <Pressable key={c.key} onPress={() => (c.key === 'profile' ? router.push('/profile') : CHECK_DOCS[c.key] ? router.push('/docs') : toggle(c.key))} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: on ? C.green : C.well, boxShadow: on ? '0px 4px 10px rgba(30, 142, 90, 0.3)' : SH.inset, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Icon name="check" size={14} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.ink }}>{c.title}</Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted }}>{sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
          <RemindersCard />
          <Card onPress={() => router.push('/docs')} label="Мои документы">
            <Row left={<Icon name="passport" size={22} color={C.blueInk} />} title={`Мои документы${docs.length ? ` · ${docs.length}` : ''}`} sub="Паспорт, виза, билеты, страховка, бронь — только на телефоне, открываются без интернета" />
          </Card>
          <Card onPress={() => router.push({ pathname: '/country/[code]', params: { code: TRIP.country } })} label="Памятка по стране">
            <Row left={<Icon name="globe" size={22} color={C.blueInk} />} title={`Памятка: ${countryOf(TRIP.country).ru}`} sub="Валюта, оплата, связь, розетки, приложения, фразы, карта регионов" />
          </Card>
          <CountryPrep />
          <EsimOffers />
          <CountryApps />
          <Card onPress={() => router.push('/settings')} label={__('Язык и тема')}>
            <Row left={<Icon name="globe" size={22} color={C.blueInk} />} title={__('Язык и тема')} sub={__('6 языков интерфейса, светлая и тёмная тема')} />
          </Card>
        </>
      ) : stage === 'during' ? (
<During />
      ) : (
<After />
      )}
    </Screen>
  );
}

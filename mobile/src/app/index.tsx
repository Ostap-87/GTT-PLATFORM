// Стартовый экран (вариант B, решение 17.10.2026): 3D-заставка — светлый глобус, маршруты из Москвы и счётчик стран,
// затем точки слетаются в объёмные буквы GTT. Касание пропускает анимацию; при повторном входе и при «Уменьшить движение»
// сразу готовые буквы. Кнопки входа делегата, координатора, агента и каталог видны всё время; «Выбрать страну и программу»
// открывает любую программу сайта глазами делегата (решение 21.10.2026).
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import catalog from '@/data/catalog.json';
import { addSample, liveTrip, orgOf, saveOrg } from '@/data/org';
import { TENANT } from '@/data/tenant';
import { TRIP } from '@/data/trip';
import { GLOBE_Y, LETTER_H, LETTER_Y, unitPx, type SplashConfig, type SplashEvent } from '@/splash/config';
import { useResetAll, useSwitchTenant } from '@/state/reset';
import { useToast } from '@/state/toast';
import { Button } from '@/ui/kit';
import { Monogram } from '@/ui/Monogram';
import { Splash3D } from '@/ui/Splash3D';
import { C, F } from '@/ui/theme';

const plural = (n: number, a: string, b: string, c: string) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
const native = Platform.OS !== 'web';
/** Заставку целиком показываем один раз за запуск, дальше — сразу готовый кадр. */
let seenSplash = false;

export default function Welcome() {
  // у других организаторов (white label) — свой стартовый экран без заставки GTT
  if (TENANT.id !== 'gtt') return <TenantWelcome />;
  return <GttWelcome />;
}

function GttWelcome() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [cfg, setCfg] = useState<SplashConfig | null>(null);
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState<'globe' | 'gtt'>('globe');
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const top = useRef(new Animated.Value(1)).current;
  const tag = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive) return;
      const final = reduce || seenSplash;
      seenSplash = true;
      if (final) { setStage('gtt'); setCount(9); top.setValue(0); tag.setValue(1); }
      setCfg({ final, globeY: GLOBE_Y, letterY: LETTER_Y });
    });
    return () => { alive = false; };
  }, [top, tag]);

  // Пока сверху открыт каталог, заставка не рисуется
  useFocusEffect(useCallback(() => { setPaused(false); return () => setPaused(true); }, []));

  const onEvent = useCallback((e: SplashEvent) => {
    if (e.type === 'count' && typeof e.n === 'number') setCount(e.n);
    if (e.type === 'error') { setFailed(true); setStage('gtt'); }
    if (e.type === 'stage' && e.stage === 'gtt') setStage('gtt');
    if (e.type === 'skip') setCount(9);
  }, []);

  useEffect(() => {
    if (stage !== 'gtt' || !cfg || cfg.final) return;
    Animated.timing(top, { toValue: 0, duration: 600, useNativeDriver: native }).start();
    // подпись появляется, когда буквы собрались (сборка идёт 2,6 с)
    Animated.timing(tag, { toValue: 1, duration: 600, delay: 2300, useNativeDriver: native }).start();
  }, [stage, cfg, top, tag]);

  const u = unitPx(height);
  const lettersTop = height / 2 - (LETTER_Y + LETTER_H / 2) * u;
  const tagTop = height / 2 - (LETTER_Y - LETTER_H / 2) * u + 16;

  return (
    <View style={st.wrap}>
      {cfg && !failed ? <Splash3D config={cfg} paused={paused} onEvent={onEvent} /> : null}

      <Animated.View pointerEvents="none" style={[st.topBlock, { paddingTop: insets.top + 24, opacity: top }]}>
        <Text style={[st.brand, { color: C.blue }]}>GLOBAL TECH TOUR</Text>
        <Text style={st.big} accessibilityLiveRegion="polite">
          <Text style={st.num}>{count}</Text> {plural(count, 'страна', 'страны', 'стран')}
        </Text>
        <Text style={st.sub}>Экспедиции к лидерам технологий — с выездом из Москвы.</Text>
      </Animated.View>

      {failed ? (
        <View pointerEvents="none" style={[st.center, { top: lettersTop, height: LETTER_H * u }]}>
          <Text style={[st.fallback, { color: C.blue, fontSize: LETTER_H * u * 1.15, lineHeight: LETTER_H * u * 1.15 }]}>GTT</Text>
        </View>
      ) : null}

      <Animated.View pointerEvents="none" style={[st.center, { top: tagTop, opacity: tag }]}>
        <Text style={[st.brand, { color: C.blue }]}>GLOBAL TECH TOUR</Text>
        <Text style={st.tagline}>{`Экспедиции в будущее\n9 стран · ${catalog.length} программ`}</Text>
      </Animated.View>

      <Entry bottom={insets.bottom} />
    </View>
  );
}

/** Стартовый экран организатора (white label): монограмма и название его бренда, те же входы. */
function TenantWelcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { backgroundColor: C.bg }]}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 64, alignItems: 'center', gap: 14, paddingHorizontal: 24 }}>
        <Monogram t={TENANT} size={112} />
        <Text style={[st.big, { textAlign: 'center' }]}>{TENANT.name}</Text>
        <Text style={[st.tagline, { fontSize: 15 }]}>{TENANT.tagline}</Text>
      </View>
      <Entry bottom={insets.bottom} />
    </View>
  );
}

/** Входы в роли — общие для стартового экрана GTT и организаторов. */
function Entry({ bottom }: { bottom: number }) {
  const resetAll = useResetAll();
  const switchTenant = useSwitchTenant();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  // сброс демо — двойным нажатием: первое предупреждает, второе (в течение 4 с) стирает сохранённое
  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false);
    resetAll().then(() => toast('Демо начато заново — сохранённое стёрто'));
  };
  const links = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 6 }}>
      <Pressable onPress={() => router.push('/join')} accessibilityRole="button" accessibilityLabel="Ввести код приглашения от организатора" hitSlop={8}>
        <Text style={[st.note, { color: C.blue, fontFamily: F.semibold }]}>{`Код приглашения · ${TENANT.short}`}</Text>
      </Pressable>
      <Pressable onPress={() => router.push(TENANT.custom ? `/org?id=${TENANT.id}` : '/org')} accessibilityRole="button" hitSlop={8}>
        <Text style={[st.note, { color: C.blue, fontFamily: F.semibold }]}>Кабинет организатора</Text>
      </Pressable>
      <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Начать демо заново" hitSlop={8}>
        <Text style={[st.note, { color: armed ? C.warn : C.blue, fontFamily: F.semibold }]}>{armed ? 'Нажмите ещё раз — всё сотрётся' : 'Начать демо заново'}</Text>
      </Pressable>
    </View>
  );
  // у других организаторов — их поездка или кабинет; программ и поездок GTT у них нет (решение 21.10.2026)
  if (TENANT.id !== 'gtt') {
    const org = orgOf(TENANT.id);
    const live = liveTrip(org);
    const sample = () => { saveOrg(TENANT.id, addSample(org)); switchTenant(TENANT.id); setTimeout(() => router.replace('/trip'), 60); };
    return (
      <View style={[st.bottom, { paddingBottom: bottom + 16 }]}>
        {live ? <Button title="Войти в поездку" onPress={() => router.replace('/trip')} label={`Войти в поездку: ${TRIP.title}`} />
          : TENANT.custom ? <Button title="Кабинет организатора" icon="grid" onPress={() => router.push(`/org?id=${TENANT.id}`)} />
            : <Button title="Войти в пример поездки" onPress={() => router.replace('/trip')} />}
        {live && TENANT.custom ? <Button title="Кабинет организатора" kind="light" icon="grid" onPress={() => router.push(`/org?id=${TENANT.id}`)} /> : null}
        {!live && TENANT.custom ? <Button title="Пример поездки" kind="light" icon="star" onPress={sample} /> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="Координатор" kind="light" icon="grid" label="Войти как координатор" onPress={() => router.replace('/coord')} /></View>
        </View>
        <Text style={st.note}>{live ? `Открыто: ${TRIP.title}, ${TRIP.dates}.` : TENANT.custom ? 'Поездок пока нет — создайте первую в кабинете организатора или откройте пример.' : 'Пример поездки — компании и участники вымышленные.'}</Text>
        {links}
      </View>
    );
  }
  return (
      <View style={[st.bottom, { paddingBottom: bottom + 16 }]}>
        <Button title="Войти в поездку" onPress={() => router.replace('/trip')} label={`Войти в поездку: ${TRIP.title}, демо`} />
        <Button title={`Выбрать страну и программу · ${catalog.length}`} kind="light" icon="route" label="Выбрать поездку: сначала страна, потом программа" onPress={() => router.push('/demo')} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="Координатор" kind="light" icon="grid" label="Войти как координатор" onPress={() => router.replace('/coord')} /></View>
          <View style={{ flex: 1 }}><Button title="Агент" kind="light" icon="send" label="Войти как агент" onPress={() => router.replace('/agent')} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="Администратор" kind="light" icon="lock" label="Войти как администратор" onPress={() => router.replace('/admin')} /></View>
          <View style={{ flex: 1 }}><Button title={`Программы · ${catalog.length}`} kind="ghost" icon="globe" label={`Программы ${TENANT.short} · ${catalog.length}`} onPress={() => router.push('/catalog')} /></View>
        </View>
        <Text style={st.note}>{`Открыто: ${TRIP.title}, ${TRIP.dates}. Участники вымышленные. Всё, что вы отметите, сохраняется на телефоне.`}</Text>
        {links}
      </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f1f6ff' },
  topBlock: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 22, gap: 6 },
  brand: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.6 },
  big: { fontFamily: F.display, fontSize: 40, lineHeight: 52, color: C.ink, textTransform: 'uppercase' },
  num: { fontFamily: F.display, fontSize: 64, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.muted, maxWidth: 260 },
  center: { position: 'absolute', left: 20, right: 20, alignItems: 'center', gap: 8 },
  tagline: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.muted, textAlign: 'center' },
  fallback: { fontFamily: F.display },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, gap: 10 },
  note: { fontFamily: F.regular, fontSize: 12, color: C.muted, textAlign: 'center' },
});

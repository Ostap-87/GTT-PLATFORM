// Шрифты подключаем по одному начертанию: так в сборку попадают только нужные файлы
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SofiaSansExtraCondensed_800ExtraBold } from '@expo-google-fonts/sofia-sans-extra-condensed/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyOrg, applyTrip } from '@/data/active';
import { TENANT, applyTenant, setCustomTenants, type Tenant } from '@/data/tenant';
import { AdminProvider } from '@/state/admin';
import { AgentProvider } from '@/state/agent';
import { DemoContext, ResetContext, TenantContext } from '@/state/reset';
import { CoordProvider } from '@/state/coord';
import { clearStore, loadStore, peekStored, putStored } from '@/state/store';
import { TripProvider } from '@/state/trip';
import { VisitsProvider } from '@/state/visits';
import { ToastProvider } from '@/state/toast';
import { LANG_CHOSEN, __ } from '@/i18n';
import { LanguageGate } from '@/ui/LanguageGate';
import { NotificationBridge } from '@/ui/NotificationBridge';
import { C, DARK, F } from '@/ui/theme';

/** Содержимое поездки: у GTT — программы сайта, у других организаторов — их кабинет (data/org.ts), не программы GTT. */
const applyContent = () => (TENANT.id === 'gtt' ? applyTrip(peekStored<string>('demo.program')) : applyOrg(TENANT));

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, SofiaSansExtraCondensed_800ExtraBold });
  // Сохранённое на телефоне читается до первого экрана; «Начать демо заново» меняет gen — состояние собирается с нуля
  const [stored, setStored] = useState(false);
  const [gen, setGen] = useState(0);
  // какая программа открыта в демо делегата — тоже сохраняется; её данные подставляются до первого экрана
  // организатор (white label) — тоже до первого экрана: от него цвета и бренд
  useEffect(() => { loadStore().finally(() => { setCustomTenants(peekStored<Tenant[]>('tenants.custom')); applyTenant(peekStored<string>('tenant.id')); applyContent(); setStored(true); }); }, []);
  const resetAll = useCallback(async () => { await clearStore(); setCustomTenants([]); applyTenant(null); applyTrip(null); setGen((g) => g + 1); }, []);
  const switchTenant = useCallback((id: string) => { putStored('tenant.id', applyTenant(id)); applyContent(); setGen((g) => g + 1); }, []);
  const openDemo = useCallback((programId: string) => { putStored('demo.program', applyTrip(programId)); setGen((g) => g + 1); }, []);
  // первый запуск — сначала язык (решение 21.10.2026)
  const [langOk, setLangOk] = useState(LANG_CHOSEN);
  if (!loaded || !stored) return null;
  if (!langOk) return <SafeAreaProvider><LanguageGate onDone={() => setLangOk(true)} /></SafeAreaProvider>;
  return (
    <SafeAreaProvider>
      <ResetContext.Provider value={resetAll}>
      <DemoContext.Provider value={openDemo}>
      <TenantContext.Provider value={switchTenant}>
      <TripProvider key={gen}>
        <CoordProvider>
        <AgentProvider>
        <AdminProvider>
        <VisitsProvider>
        <ToastProvider>
          <StatusBar style={DARK ? 'light' : 'dark'} />
          <NotificationBridge />
          <Stack
            screenOptions={{
              headerTintColor: C.blue,
              headerTitleStyle: { fontFamily: F.bold, color: C.ink },
              headerStyle: { backgroundColor: C.bg },
              headerShadowVisible: false,
              headerBackTitle: __('Назад'),
              contentStyle: { backgroundColor: C.bg },
              // плавный сдвиг экранов, одинаковый на iOS и Android
              animation: 'ios_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="trip" options={{ headerShown: false }} />
            <Stack.Screen name="catalog/index" options={{ title: __('Программы GTT') }} />
            <Stack.Screen name="catalog/[id]" options={{ title: __('Программа') }} />
            <Stack.Screen name="hotel/[id]" options={{ title: __('Отель') }} />
            <Stack.Screen name="meal/[id]" options={{ title: __('Ресторан') }} />
            <Stack.Screen name="culture/[id]" options={{ title: __('Культурная программа') }} />
            <Stack.Screen name="contacts" options={{ title: __('Контакты поездки'), presentation: 'modal' }} />
            <Stack.Screen name="driver" options={{ title: __('Показать водителю'), presentation: 'modal' }} />
            <Stack.Screen name="profile" options={{ title: __('Мой профиль') }} />
            <Stack.Screen name="waiter" options={{ title: __('Карточка для официанта'), presentation: 'modal' }} />
            <Stack.Screen name="coord" options={{ headerShown: false }} />
            <Stack.Screen name="person/[id]" options={{ title: __('Профиль участника') }} />
            <Stack.Screen name="leg" options={{ title: __('Переезд'), presentation: 'modal' }} />
            <Stack.Screen name="legs" options={{ title: __('Журнал переездов'), presentation: 'modal' }} />
            <Stack.Screen name="food-summary" options={{ title: __('Сводка для ресторана'), presentation: 'modal' }} />
            <Stack.Screen name="rooming" options={{ title: __('Список для отеля'), presentation: 'modal' }} />
            <Stack.Screen name="view-as" options={{ title: __('Смотреть как…'), presentation: 'modal' }} />
            <Stack.Screen name="agent" options={{ headerShown: false }} />
            <Stack.Screen name="agent-tour/[id]" options={{ title: __('Программа') }} />
            <Stack.Screen name="agent-apply" options={{ title: __('Заявка в GTT'), presentation: 'modal' }} />
            <Stack.Screen name="calc/[id]" options={{ title: __('ТЗ на расчёт') }} />
            <Stack.Screen name="translator" options={{ title: __('Переводчик'), presentation: 'modal' }} />
            <Stack.Screen name="guide" options={{ title: __('Слушать гида'), presentation: 'modal' }} />
            <Stack.Screen name="city" options={{ title: __('Город') }} />
            <Stack.Screen name="demo" options={{ title: __('Выбрать поездку') }} />
            <Stack.Screen name="search" options={{ title: __('Поиск по поездке') }} />
            <Stack.Screen name="docs" options={{ title: __('Мои документы') }} />
            <Stack.Screen name="doc/[id]" options={{ title: __('Документ'), presentation: 'fullScreenModal' }} />
            <Stack.Screen name="help" options={{ title: __('Помощь') }} />
            <Stack.Screen name="expenses" options={{ title: __('Расходы') }} />
            <Stack.Screen name="place/[id]" options={{ title: __('Место'), presentation: 'modal' }} />
            <Stack.Screen name="followup" options={{ title: __('Хочу продолжить'), presentation: 'modal' }} />
            <Stack.Screen name="visit/[id]" options={{ title: __('Визит компании') }} />
            <Stack.Screen name="company/[id]" options={{ title: __('Визит') }} />
            <Stack.Screen name="card-scan" options={{ title: __('Визитка') }} />
            <Stack.Screen name="report" options={{ title: __('Итоги поездки') }} />
            <Stack.Screen name="mindmap" options={{ title: __('Майндмэп') }} />
            <Stack.Screen name="transcript" options={{ title: __('Расшифровка') }} />
            <Stack.Screen name="route" options={{ title: __('Маршрут') }} />
            <Stack.Screen name="cards" options={{ title: __('Визитница') }} />
            <Stack.Screen name="chat" options={{ title: __('Чат с координатором') }} />
            <Stack.Screen name="join" options={{ title: __('Код приглашения') }} />
            <Stack.Screen name="builder" options={{ title: __('Конструктор организатора') }} />
            <Stack.Screen name="org" options={{ title: __('Кабинет организатора') }} />
            <Stack.Screen name="settings" options={{ title: __('Язык и тема') }} />
            <Stack.Screen name="country/[code]" options={{ title: __('Памятка по стране') }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="admin-trip/[id]" options={{ title: __('Поездка') }} />
          </Stack>
        </ToastProvider>
        </VisitsProvider>
        </AdminProvider>
        </AgentProvider>
        </CoordProvider>
      </TripProvider>
      </TenantContext.Provider>
      </DemoContext.Provider>
      </ResetContext.Provider>
    </SafeAreaProvider>
  );
}

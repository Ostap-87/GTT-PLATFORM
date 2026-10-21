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
import { NotificationBridge } from '@/ui/NotificationBridge';
import { C, F } from '@/ui/theme';

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
  if (!loaded || !stored) return null;
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
          <StatusBar style="dark" />
          <NotificationBridge />
          <Stack
            screenOptions={{
              headerTintColor: C.blue,
              headerTitleStyle: { fontFamily: F.bold, color: C.ink },
              headerStyle: { backgroundColor: C.bg },
              headerShadowVisible: false,
              headerBackTitle: 'Назад',
              contentStyle: { backgroundColor: C.bg },
              // плавный сдвиг экранов, одинаковый на iOS и Android
              animation: 'ios_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="trip" options={{ headerShown: false }} />
            <Stack.Screen name="catalog/index" options={{ title: 'Программы GTT' }} />
            <Stack.Screen name="catalog/[id]" options={{ title: 'Программа' }} />
            <Stack.Screen name="hotel/[id]" options={{ title: 'Отель' }} />
            <Stack.Screen name="meal/[id]" options={{ title: 'Ресторан' }} />
            <Stack.Screen name="culture/[id]" options={{ title: 'Культурная программа' }} />
            <Stack.Screen name="contacts" options={{ title: 'Контакты поездки', presentation: 'modal' }} />
            <Stack.Screen name="driver" options={{ title: 'Показать водителю', presentation: 'modal' }} />
            <Stack.Screen name="profile" options={{ title: 'Мой профиль' }} />
            <Stack.Screen name="waiter" options={{ title: 'Карточка для официанта', presentation: 'modal' }} />
            <Stack.Screen name="coord" options={{ headerShown: false }} />
            <Stack.Screen name="person/[id]" options={{ title: 'Профиль участника' }} />
            <Stack.Screen name="leg" options={{ title: 'Переезд', presentation: 'modal' }} />
            <Stack.Screen name="legs" options={{ title: 'Журнал переездов', presentation: 'modal' }} />
            <Stack.Screen name="food-summary" options={{ title: 'Сводка для ресторана', presentation: 'modal' }} />
            <Stack.Screen name="rooming" options={{ title: 'Список для отеля', presentation: 'modal' }} />
            <Stack.Screen name="view-as" options={{ title: 'Смотреть как…', presentation: 'modal' }} />
            <Stack.Screen name="agent" options={{ headerShown: false }} />
            <Stack.Screen name="agent-tour/[id]" options={{ title: 'Программа' }} />
            <Stack.Screen name="agent-apply" options={{ title: 'Заявка в GTT', presentation: 'modal' }} />
            <Stack.Screen name="calc/[id]" options={{ title: 'ТЗ на расчёт' }} />
            <Stack.Screen name="translator" options={{ title: 'Переводчик', presentation: 'modal' }} />
            <Stack.Screen name="guide" options={{ title: 'Слушать гида', presentation: 'modal' }} />
            <Stack.Screen name="city" options={{ title: 'Город' }} />
            <Stack.Screen name="demo" options={{ title: 'Выбрать поездку' }} />
            <Stack.Screen name="search" options={{ title: 'Поиск по поездке' }} />
            <Stack.Screen name="docs" options={{ title: 'Мои документы' }} />
            <Stack.Screen name="doc/[id]" options={{ title: 'Документ', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="help" options={{ title: 'Помощь' }} />
            <Stack.Screen name="expenses" options={{ title: 'Расходы' }} />
            <Stack.Screen name="place/[id]" options={{ title: 'Место', presentation: 'modal' }} />
            <Stack.Screen name="followup" options={{ title: 'Хочу продолжить', presentation: 'modal' }} />
            <Stack.Screen name="visit/[id]" options={{ title: 'Визит компании' }} />
            <Stack.Screen name="company/[id]" options={{ title: 'Визит' }} />
            <Stack.Screen name="card-scan" options={{ title: 'Визитка' }} />
            <Stack.Screen name="report" options={{ title: 'Итоги поездки' }} />
            <Stack.Screen name="mindmap" options={{ title: 'Майндмэп' }} />
            <Stack.Screen name="transcript" options={{ title: 'Расшифровка' }} />
            <Stack.Screen name="route" options={{ title: 'Маршрут' }} />
            <Stack.Screen name="cards" options={{ title: 'Визитница' }} />
            <Stack.Screen name="chat" options={{ title: 'Чат с координатором' }} />
            <Stack.Screen name="join" options={{ title: 'Код приглашения' }} />
            <Stack.Screen name="builder" options={{ title: 'Конструктор организатора' }} />
            <Stack.Screen name="org" options={{ title: 'Кабинет организатора' }} />
            <Stack.Screen name="country/[code]" options={{ title: 'Памятка по стране' }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="admin-trip/[id]" options={{ title: 'Поездка' }} />
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

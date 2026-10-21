import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { TENANT } from '@/data/tenant';
import { BackToCoord } from '@/ui/coord-ui';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icon-paths';
import { TabBar3D } from '@/ui/TabBar3D';
import { C } from '@/ui/theme';
import { __ } from '@/i18n';

const TABS: [string, string, IconName][] = [
  ['index', __('Сегодня'), 'sun'],
  ['plan', __('План'), 'cal'],
  ['library', __('Материалы'), 'book'],
  ['people', __('Люди'), 'people'],
  ['prep', __('Поездка'), 'suitcase'],
];

export default function TripTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* плавающая панель: у GTT объёмные значки, у других организаторов (white label) — контурные в цвете их бренда */}
      <Tabs tabBar={(p) => <TabBar3D {...p} three={TENANT.icons3d} hide={[TENANT.tabs.library ? '' : 'library', TENANT.tabs.people ? '' : 'people']} />} screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: C.bg } }}>
        {TABS.map(([name, title, icon]) => (
          <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color }) => <Icon name={icon} size={24} color={String(color)} /> }} />
        ))}
      </Tabs>
      {/* Координатор смотрит глазами делегата — кнопка возврата к пульту */}
      <BackToCoord />
    </View>
  );
}

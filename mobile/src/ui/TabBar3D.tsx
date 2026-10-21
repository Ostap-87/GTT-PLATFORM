// Нижняя панель вкладок (решение 21.10.2026, вариант 1 «Глянец»): белая плавающая «таблетка» с объёмными значками.
// Выбранный значок подпрыгивает с пружинкой и увеличивается, как в видео-макете; при нажатии — лёгкая отдача (вибро).
// У вкладок координатора, агента и администратора объёмных значков нет — та же панель с их контурными значками.
import type { Tabs } from 'expo-router';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { selectFeel } from './haptics';
import { ND, reduceMotion } from './motion';
import { C, F, SH } from './theme';

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, [ImageSourcePropType, ImageSourcePropType]> = {
  index: [require('../../assets/tabs/today-on.png'), require('../../assets/tabs/today-off.png')],
  plan: [require('../../assets/tabs/plan-on.png'), require('../../assets/tabs/plan-off.png')],
  library: [require('../../assets/tabs/library-on.png'), require('../../assets/tabs/library-off.png')],
  people: [require('../../assets/tabs/people-on.png'), require('../../assets/tabs/people-off.png')],
  prep: [require('../../assets/tabs/trip-on.png'), require('../../assets/tabs/trip-off.png')],
};

/** Высота панели вместе с отступом от края — столько места оставляют снизу кнопки поверх вкладок. */
export const TAB_BAR_SPACE = 92;
const OFF = 0.85; // невыбранный значок меньше: 44 из 52

function Tab({ name, title, on, onPress, onLongPress, flat }: { name: string; title: string; on: boolean; onPress: () => void; onLongPress: () => void; flat?: (on: boolean) => ReactNode }) {
  const scale = useRef(new Animated.Value(on ? 1 : OFF)).current;
  const lift = useRef(new Animated.Value(on ? -6 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduceMotion()) { scale.setValue(on ? 1 : OFF); lift.setValue(on ? -6 : 0); return; }
    if (on) {
      // «поп»: из маленького — выше и больше обычного — на место (как keyframes pop в макете)
      scale.setValue(0.8);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 3.2, tension: 150, useNativeDriver: ND }),
        Animated.spring(lift, { toValue: -6, friction: 4, tension: 140, useNativeDriver: ND }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: OFF, friction: 7, tension: 120, useNativeDriver: ND }),
        Animated.spring(lift, { toValue: 0, friction: 7, tension: 120, useNativeDriver: ND }),
      ]).start();
    }
  }, [on, scale, lift]);
  const img = ICONS[name];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { if (!reduceMotion()) Animated.spring(press, { toValue: 0.88, speed: 40, bounciness: 0, useNativeDriver: ND }).start(); }}
      onPressOut={() => Animated.spring(press, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: ND }).start()}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={title}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 9 }}
    >
      <Animated.View style={{ transform: [{ translateY: lift }, { scale: Animated.multiply(scale, press) }], filter: on ? 'drop-shadow(0px 8px 8px rgba(26, 115, 232, 0.28))' : undefined }}>
        {img || !flat ? <Image source={on ? (img || ICONS.index)[0] : (img || ICONS.index)[1]} style={{ width: 52, height: 52 }} /> : (
          <View style={{ width: 46, height: 46, marginBottom: 4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.blueSoft : 'transparent', boxShadow: on ? SH.small : undefined }}>
            {flat(on)}
          </View>
        )}
      </Animated.View>
      <Text numberOfLines={1} style={{ marginTop: -4, fontFamily: F.semibold, fontSize: 11, color: on ? C.blue : '#8a94a6' }}>{title}</Text>
      <View style={{ position: 'absolute', bottom: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: on ? C.blue : 'transparent' }} />
    </Pressable>
  );
}

/** three — объёмные значки делегата (вкладки поездки); без него — контурные значки экранов. */
/** hide — вкладки, которые организатор выключил в конструкторе. */
export function TabBar3D({ state, descriptors, navigation, insets, three, hide = [] }: BarProps & { three?: boolean; hide?: string[] }) {
  return (
    <View
      accessibilityRole="tablist"
      style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom, 10) + 4, height: 76, flexDirection: 'row', paddingHorizontal: 4, borderRadius: 28, backgroundColor: C.surface, boxShadow: SH.float }}
    >
      {state.routes.map((route, i) => {
        if (hide.includes(route.name)) return null;
        const on = state.index === i;
        const title = descriptors[route.key].options.title ?? route.name;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on) selectFeel();
          if (!on && !e.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
        const icon = descriptors[route.key].options.tabBarIcon;
        const flat = three || !icon ? undefined : (f: boolean) => icon({ focused: f, color: f ? C.blue : '#8a94a6', size: 24 });
        return <Tab key={route.key} name={three ? route.name : ''} title={String(title)} on={on} onPress={onPress} onLongPress={onLongPress} flat={flat} />;
      })}
    </View>
  );
}

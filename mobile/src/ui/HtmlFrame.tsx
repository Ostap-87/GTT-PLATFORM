// На телефоне (Expo Go) предпросмотра страницы нет: страница тура и баннеры собираются в браузере.
import { Text, View } from 'react-native';

import { __ } from '@/i18n';
import { C, F } from './theme';

export function HtmlFrame({ width, height, scale = 1, radius = 0 }: { html: string; width: number; height: number; scale?: number; radius?: number; post?: unknown }) {
  return (
    <View style={{ width: width * scale, height: Math.min(height * scale, 220), borderRadius: radius, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.muted, textAlign: 'center' }}>{__('Предпросмотр страницы — в браузере: откройте кабинет на компьютере или в браузере телефона.')}</Text>
    </View>
  );
}

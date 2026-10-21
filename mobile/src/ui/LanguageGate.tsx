// Первый запуск: выбор языка до всего остального (решение пользователя 21.10.2026). Язык устройства подсвечен.
import { Text, View } from 'react-native';

import { LANG, LANGS, setLang } from '@/i18n';
import { Pick } from './kit';
import { C, F } from './theme';

export function LanguageGate({ onDone }: { onDone: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
      <Text style={{ fontFamily: F.display, fontSize: 34, color: C.ink, textAlign: 'center' }}>Язык · Language · 语言</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 15, color: C.muted, textAlign: 'center' }}>Тіл · اللغة · भाषा</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 420 }}>
        {LANGS.map(([code, self]) => (
          <Pick key={code} title={self} on={code === LANG} onPress={() => {
            // тот же язык (угадали по устройству) — просто запоминаем; другой — перезапуск на нём
            if (code === LANG) { setLang(code, false); onDone(); } else setLang(code);
          }} />
        ))}
      </View>
    </View>
  );
}

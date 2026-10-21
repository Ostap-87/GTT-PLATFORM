// «Язык и тема» (решение пользователя 21.10.2026): шесть языков интерфейса и светлая/тёмная тема — в приложении участника
// и в кабинете организатора. Смена перезапускает приложение: стили и направление письма задаются при запуске.
import { View } from 'react-native';

import { LANG, LANGS, __, setLang, type Lang } from '@/i18n';
import { Card, Chips, H3, Pick, Plain, Seg, T } from '@/ui/kit';
import { reloadApp, writePref } from '@/ui/prefs';
import { THEME_PREF, type ThemePref } from '@/ui/theme';

export default function Settings() {
  const pickLang = (l: Lang) => { if (l !== LANG) setLang(l); };
  const pickTheme = (p: ThemePref) => { if (p === THEME_PREF) return; writePref('theme', p); reloadApp(); };
  return (
    <Plain>
      <Card>
        <H3>{__('Язык')}</H3>
        <Chips>{LANGS.map(([code, self]) => <Pick key={code} title={self} on={code === LANG} onPress={() => pickLang(code)} />)}</Chips>
        <T muted>{__('Приложение перезапустится на выбранном языке. Программу поездки организатор пишет на своём языке — её текст не переводится.')}</T>
      </Card>
      <Card>
        <H3>{__('Тема')}</H3>
        <View>
          <Seg options={[['system', __('Как в системе')], ['light', __('Светлая')], ['dark', __('Тёмная')]] as const} value={THEME_PREF} onChange={pickTheme} />
        </View>
        <T muted>{__('Тёмная тема меньше слепит вечером и бережёт заряд на телефонах с OLED-экраном.')}</T>
      </Card>
    </Plain>
  );
}

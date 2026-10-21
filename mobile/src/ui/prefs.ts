// Настройки, которые нужны до первого экрана (тема и язык): читаются синхронно при запуске — в браузере из localStorage,
// на телефоне из файла в папке приложения. Смена темы или языка перезапускает приложение: стили экранов и направление
// письма (арабский — справа налево) задаются при запуске.
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { DevSettings, Platform } from 'react-native';

const web = Platform.OS === 'web';
const fileOf = (key: string) => new File(Paths.document, `pref-${key}.txt`);

export function readPref(key: string): string | null {
  try {
    if (web) return typeof localStorage === 'undefined' ? null : localStorage.getItem(`gtt:pref:${key}`);
    const f = fileOf(key);
    return f.exists ? f.textSync() : null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string) {
  try {
    if (web) { localStorage.setItem(`gtt:pref:${key}`, value); return; }
    const f = fileOf(key);
    if (!f.exists) f.create();
    f.write(value);
  } catch { /* нет доступа к хранилищу — настройка продержится до перезапуска */ }
}

/** Перезапуск с новыми настройками. */
export function reloadApp() {
  if (web) { location.reload(); return; }
  Updates.reloadAsync().catch(() => DevSettings.reload());
}

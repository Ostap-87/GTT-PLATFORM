// Цвета и шрифты — как у сайта, презентаций и прототипа GTT (синий #1a73e8, Inter, Sofia Sans Extra Condensed).
// Стиль «пластилин» (решение 21.10.2026): мягкий серо-голубой фон, выпуклые карточки без рамок, вдавленные поля ввода.
// Акцентные цвета (blue, blueInk, blueSoft, heroFrom, heroTo) и тени SH.blue/SH.hero — бренд организатора: их меняет
// applyTenant до показа экранов, поэтому в StyleSheet.create и константах модулей их не используем — только при рендере.
// Светлая и тёмная палитры выбираются при запуске (prefs.ts); смена темы перезапускает приложение.
import { Appearance } from 'react-native';

import { readPref } from './prefs';

/** Тема: «как в системе», светлая или тёмная (решение пользователя 21.10.2026: «некоторые любят работать в тёмном»). */
export type ThemePref = 'system' | 'light' | 'dark';
const pref = readPref('theme');
export const THEME_PREF: ThemePref = pref === 'light' || pref === 'dark' ? pref : 'system';
export const DARK = THEME_PREF === 'dark' || (THEME_PREF === 'system' && Appearance.getColorScheme() === 'dark');

const LIGHT_C = {
  bg: '#e8edf4',
  card: '#eef2f8',
  /** Белые плашки: панель вкладок, поля поверх карточек. */
  surface: '#ffffff',
  ink: '#0f1b2d',
  muted: '#5b6576',
  line: '#d6dde8',
  line2: '#dfe5ee',
  blue: '#1a73e8',
  blueInk: '#1558b8',
  blueSoft: '#dde8fb',
  ok: '#1e6b45',
  okSoft: '#dcf1e4',
  warn: '#a2470a',
  warnSoft: '#fdeadb',
  warnLine: '#ffd2b0',
  /** Фон карточки-предупреждения и объявления. */
  warnCard: '#fdf0e6',
  orange: '#ffb27a',
  green: '#1e8e5a',
  violet: '#7048e8',
  dark: '#0f1b2d',
  dark2: '#233350',
  onDark: '#c9d4e8',
  red: '#c5321b',
  redSoft: '#fdecea',
  redLine: '#f5c2bb',
  well: '#e3e9f2',
  // градиент карточки «Сейчас»; вместе с blue* меняется под бренд организатора (data/tenant.ts → applyTenant)
  heroFrom: '#2b80f2',
  heroTo: '#0f4fc0',
};
const DARK_C: typeof LIGHT_C = {
  bg: '#141a23',
  card: '#1b2330',
  surface: '#222c3b',
  ink: '#e9eef6',
  muted: '#9aa5b6',
  line: '#2b3546',
  line2: '#263041',
  blue: '#4c94f5',
  blueInk: '#8fbaf8',
  blueSoft: '#1d3352',
  ok: '#6fd59f',
  okSoft: '#16372a',
  warn: '#ffb27a',
  warnSoft: '#3a2617',
  warnLine: '#5c3b20',
  warnCard: '#2e2219',
  orange: '#ffb27a',
  green: '#4cc38a',
  violet: '#9b84ff',
  dark: '#0b1017',
  dark2: '#1d2838',
  onDark: '#c9d4e8',
  red: '#ff7a66',
  redSoft: '#3a1d1a',
  redLine: '#6b2e27',
  well: '#121822',
  heroFrom: '#2b80f2',
  heroTo: '#0f4fc0',
};
export const C = { ...(DARK ? DARK_C : LIGHT_C) };

/** Цвет свечения сверху слева: в светлой теме — белый, в тёмной — чуть светлее фона. */
export const GLOW = DARK ? '#232d3c' : '#ffffff';
const SHADE = DARK ? '#0a0e14' : '#cdd5e1';
/** Тени «пластилина»: свет сверху слева, тень снизу справа; inset — вдавленное поле. */
export const SH = {
  clay: `8px 8px 18px ${SHADE}, -8px -8px 18px ${GLOW}`,
  small: `4px 4px 10px ${SHADE}, -4px -4px 10px ${GLOW}`,
  inset: `inset 3px 3px 6px ${SHADE}, inset -3px -3px 6px ${GLOW}`,
  blue: '0px 8px 16px rgba(26, 115, 232, 0.32), inset -2px -3px 6px rgba(0, 0, 0, 0.12), inset 2px 2px 5px rgba(255, 255, 255, 0.25)',
  dark: DARK ? '6px 8px 18px rgba(0, 0, 0, 0.5), -4px -4px 12px #232d3c' : '6px 8px 18px rgba(15, 27, 45, 0.28), -6px -6px 14px #ffffff',
  hero: `0px 14px 30px rgba(26, 115, 232, 0.32), -6px -6px 16px ${GLOW}`,
  float: DARK ? '0px 12px 34px rgba(0, 0, 0, 0.55)' : '0px 12px 34px rgba(15, 27, 45, 0.16)',
};

export const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'SofiaSansExtraCondensed_800ExtraBold',
} as const;

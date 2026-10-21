// Общие элементы экранов: шапка, карточка, строка списка, кнопка, метка. Стиль «пластилин» (решение 21.10.2026): выпуклые
// карточки без рамок, вдавленные поля, кнопки пружинят при нажатии, блоки экрана появляются по очереди.
import { LinearGradient } from 'expo-linear-gradient';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { selectFeel } from './haptics';
import { Icon } from './Icon';
import type { IconName } from './icon-paths';
import { Appear, Press } from './motion';
import { C, F, SH } from './theme';

/** Дети экрана — каждый блок со своей задержкой появления. Блоки, которые могут ничего не рисовать (плашка «Нет
 *  интернета»), помечены noAppear и идут без обёртки — иначе пустая обёртка добавила бы лишний отступ. */
function Cascade({ children }: { children: ReactNode }) {
  let i = 0;
  return Children.map(children, (c) => {
    if (c == null || typeof c === 'boolean') return null;
    if (isValidElement(c) && (c.type as { noAppear?: boolean }).noAppear) return c;
    return <Appear i={i++}>{c}</Appear>;
  });
}

export function Screen({ eyebrow, title, dark, children, right }: { eyebrow?: string; title: string; dark?: boolean; children: ReactNode; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.head, dark && s.headDark, { paddingTop: insets.top + 12 }]}>
        <View style={s.rowBetween}>
          {eyebrow ? <Text style={[s.eyebrow, dark && s.eyebrowDark]}>{eyebrow}</Text> : <View />}
          {right}
        </View>
        <Text style={[s.title, dark && { color: '#fff' }]} accessibilityRole="header">{title}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body}><Cascade>{children}</Cascade></ScrollView>
        {/* карточки мягко уходят под шапку, а не обрезаются по линии */}
        <LinearGradient pointerEvents="none" colors={[dark ? `${C.bg}00` : C.bg, `${C.bg}00`]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 18 }} />
      </View>
    </View>
  );
}

/** Экран без большой шапки — для деталей, открытых из стека (заголовок даёт навигация). */
export function Plain({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.body}>
      <Cascade>{children}</Cascade>
    </ScrollView>
  );
}

export function Card({ children, tone, style, onPress, label }: { children: ReactNode; tone?: 'dark' | 'info' | 'warn' | 'accent'; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  // цвета бренда — при рендере (их меняет applyTenant), остальное — из StyleSheet
  const st = [s.card, tone === 'dark' && s.cardDark, tone === 'info' && { backgroundColor: C.blueSoft }, tone === 'warn' && s.cardWarn, tone === 'accent' && { borderWidth: 1.5, borderColor: C.blue }, style];
  // у первой строки карточки нет разделителя сверху — линия нужна только между строками
  const kids = Children.toArray(children);
  if (isValidElement(kids[0]) && kids[0].type === Row) kids[0] = cloneElement(kids[0] as ReactElement<{ first?: boolean }>, { first: true });
  children = kids;
  if (onPress) {
    return (
      <Press onPress={onPress} label={label} scaleTo={0.97} style={st}>
        {children}
      </Press>
    );
  }
  return <View style={st}>{children}</View>;
}

export function H3({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h3, style]}>{children}</Text>;
}

export function T({ children, style, muted, bold, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; bold?: boolean; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[s.t, muted && s.muted, bold && { fontFamily: F.semibold }, style]}>{children}</Text>;
}

export function TitleRow({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.rowBetween}>
      {typeof title === 'string' ? <H3>{title}</H3> : title}
      {right}
    </View>
  );
}

type ChipTone = 'ok' | 'warn' | 'info' | 'dark' | 'new' | 'plain';
export function Chip({ children, tone = 'info' }: { children: ReactNode; tone?: ChipTone }) {
  const map: Record<ChipTone, [string, string]> = {
    ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], info: [C.blueSoft, C.blueInk], dark: [C.dark, '#fff'], new: [C.red, '#fff'], plain: [C.line2, C.muted],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', icon, small, full, label }: { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'light' | 'dark'; icon?: IconName; small?: boolean; full?: boolean; label?: string }) {
  const bg = kind === 'primary' ? C.blue : kind === 'dark' ? C.dark : kind === 'light' ? C.blueSoft : C.card;
  const fg = kind === 'primary' || kind === 'dark' ? '#fff' : kind === 'light' ? C.blueInk : C.ink;
  const sh = kind === 'primary' ? SH.blue : kind === 'dark' ? 'inset -2px -3px 6px rgba(0, 0, 0, 0.3), inset 2px 2px 5px rgba(255, 255, 255, 0.12)' : SH.small;
  return (
    <Press onPress={onPress} label={label || title} scaleTo={0.95}
      style={[s.btn, small && s.btnSmall, full && { alignSelf: 'stretch' }, { backgroundColor: bg, boxShadow: sh }]}>
      {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Press>
  );
}

export function Row({ title, sub, left, right, onPress, label, first }: { title: ReactNode; sub?: ReactNode; left?: ReactNode; right?: ReactNode; onPress?: () => void; label?: string; first?: boolean }) {
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Text style={s.rowTitle}>{title}</Text> : title}
        {sub ? (typeof sub === 'string' ? <Text style={s.rowSub}>{sub}</Text> : sub) : null}
      </View>
      {right}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.row, first && s.rowFirst, pressed && { opacity: 0.7 }]}>
        {body}
      </Pressable>
    );
  }
  return <View style={[s.row, first && s.rowFirst]}>{body}</View>;
}

export function Avatar({ text, size = 36 }: { text: string; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.blueSoft }]}>
      <Text style={[s.avatarText, { color: C.blueInk }]}>{text}</Text>
    </View>
  );
}

export function Pick({ title, on, onPress }: { title: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { selectFeel(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.pick, on && { backgroundColor: C.blue, boxShadow: SH.blue }]}>
      <Text style={[s.pickText, on && { color: '#fff', fontFamily: F.bold }]}>{title}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={s.chips}>{children}</View>;
}

/** Переключатель из 2–3 вариантов (как «До / В поездке / После»). */
export function Seg<K extends string>({ options, value, onChange }: { options: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={s.seg}>
      {options.map(([k, l]) => (
        <Pressable key={k} onPress={() => { selectFeel(); onChange(k); }} accessibilityRole="button" accessibilityState={{ selected: value === k }}
          style={[s.segBtn, value === k && s.segOn]}>
          <Text style={{ fontFamily: value === k ? F.bold : F.medium, fontSize: 13, color: C.ink, textAlign: 'center' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Галочка: согласие, «сохранить», «кому отправить». */
export function Check({ on, onPress, children }: { on: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 2 }}>
      <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: on ? C.blue : C.well, boxShadow: on ? SH.blue : SH.inset, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {on ? <Icon name="check" size={14} color="#fff" /> : null}
      </View>
      <Text style={{ flex: 1, fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink }}>{children}</Text>
    </Pressable>
  );
}

export const inputStyle = { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46, fontFamily: F.regular, fontSize: 14, color: C.ink, backgroundColor: C.well, boxShadow: SH.inset } as const;

/** Поле ввода с подписью сверху. */
export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: KeyboardTypeOptions }) {
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.muted }}>{label}</Text> : null}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} keyboardType={keyboardType}
        accessibilityLabel={label || placeholder} style={[inputStyle, multiline && { minHeight: 64, textAlignVertical: 'top' }]} />
    </View>
  );
}

/** Подпись над группой вариантов («Страна поездки», «Кто едет»). */
export const Label = ({ children }: { children: string }) => <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.muted }}>{children}</Text>;

export const initials = (lat: string) => lat.split(' ').map((w) => w[0]).join('');

/** Подпись раздела над блоками («Сейчас», «Дальше сегодня», «Под рукой»), справа — необязательная ссылка. */
export function Section({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <View style={[s.rowBetween, { paddingHorizontal: 4, marginTop: 4, marginBottom: -2 }]}>
      <Text style={s.section} accessibilityRole="header">{title}</Text>
      {link && onLink ? <Pressable onPress={onLink} accessibilityRole="link" hitSlop={8}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blue }}>{link}</Text></Pressable> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  head: { backgroundColor: C.bg, paddingHorizontal: 18, paddingBottom: 10, gap: 4 },
  headDark: { backgroundColor: C.dark, paddingBottom: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, boxShadow: SH.dark },
  eyebrow: { fontFamily: F.semibold, fontSize: 12, color: C.muted },
  eyebrowDark: { color: C.orange, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontFamily: F.display, fontSize: 40, lineHeight: 40, color: C.ink, textTransform: 'uppercase' },
  section: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: C.muted },
  // снизу запас под плавающую панель вкладок
  body: { padding: 16, gap: 14, paddingBottom: 124 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  card: { backgroundColor: C.card, borderRadius: 24, paddingVertical: 15, paddingHorizontal: 17, gap: 8, boxShadow: SH.clay },
  cardDark: { backgroundColor: C.dark, boxShadow: SH.dark },
  cardWarn: { backgroundColor: C.warnCard },
  h3: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  t: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.ink },
  muted: { color: C.muted, fontSize: 12.5, lineHeight: 18 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  chipText: { fontFamily: F.bold, fontSize: 11.5 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 16, minHeight: 48 },
  btnSmall: { minHeight: 36, paddingHorizontal: 13, borderRadius: 12 },
  btnText: { fontFamily: F.bold, fontSize: 14.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line2 },
  rowFirst: { borderTopWidth: 0, paddingTop: 2 },
  rowTitle: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  rowSub: { fontFamily: F.regular, fontSize: 12.5, color: C.muted, marginTop: 2 },
  avatar: { alignItems: 'center', justifyContent: 'center', boxShadow: SH.small },
  avatarText: { fontFamily: F.bold, fontSize: 12 },
  pick: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, maxWidth: '100%', boxShadow: SH.small },
  pickText: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: { flexDirection: 'row', backgroundColor: C.well, borderRadius: 14, padding: 4, boxShadow: SH.inset },
  segBtn: { flex: 1, minHeight: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segOn: { backgroundColor: C.card, boxShadow: '2px 2px 6px #c9d2df, -2px -2px 6px #ffffff' },
});

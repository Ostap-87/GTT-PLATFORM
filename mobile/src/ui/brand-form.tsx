// Бренд организатора: логотип, цвет, координатор, блоки «Сегодня», плитки и вкладки. Одна форма для конструктора
// на телефоне (/builder) и кабинета организатора (/org, шаг «Бренд»).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Pressable, Text, View } from 'react-native';

import { PALETTE, TODAY_BLOCKS, TOOLS, deriveBrand, isHex, type Tenant, type ToolKey } from '@/data/tenant';
import { useToast } from '@/state/toast';
import { Icon } from './Icon';
import { Button, Card, Check, Chips, Field, H3, Label, Pick, T } from './kit';
import { Monogram } from './Monogram';
import { pickPhoto } from './notes-ui';
import { C, F, SH } from './theme';
import { __ } from '@/i18n';

export const initialsOf = (name: string, words = 2) => name.trim().split(/\s+/).slice(0, words).map((w) => w[0] || '').join('').toUpperCase();

/** hex — то, что сейчас набрано в поле цвета (может быть недописанным). */
export function BrandForm({ t, patch, hex, setHex }: { t: Tenant; patch: (p: Partial<Tenant>) => void; hex: string; setHex: (h: string) => void }) {
  const toast = useToast();
  const setColor = (h: string) => { setHex(h); if (isHex(h)) patch(deriveBrand(h)); };
  const uploadLogo = async () => {
    const p = await pickPhoto('library');
    if (!p) return;
    try {
      const img = await (await ImageManipulator.manipulate(p.uri).resize({ width: 256 }).renderAsync()).saveAsync({ format: SaveFormat.PNG, base64: true });
      patch({ logo: `data:image/png;base64,${img.base64}` });
    } catch {
      toast(__('Не получилось открыть картинку — попробуйте PNG или JPG'));
    }
  };
  const moveBlock = (i: number, d: -1 | 1) => {
    const b = [...t.blocks];
    const j = i + d;
    if (j < 0 || j >= b.length) return;
    const cur = b.at(i)!;
    b.splice(i, 1);
    b.splice(j, 0, cur);
    patch({ blocks: b });
  };
  const toggleTool = (k: ToolKey) => patch({ tools: t.tools.includes(k) ? t.tools.filter((x) => x !== k) : TOOLS.map(([key]) => key).filter((key) => key === k || t.tools.includes(key)) });

  return (
    <>
      <Card>
        <H3>{__('Логотип')}</H3>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Monogram t={t} size={64} />
          <View style={{ flex: 1, gap: 8 }}>
            <Button title={t.logo ? __('Заменить логотип') : __('Загрузить логотип')} icon="camera" kind="light" small onPress={uploadLogo} />
            {t.logo ? <Button title={__("Убрать — показывать монограмму")} kind="ghost" small onPress={() => patch({ logo: undefined })} /> : null}
          </View>
        </View>
        <Field label={__("Монограмма (до 3 букв, если нет логотипа)")} value={t.short} onChangeText={(v) => patch({ short: v.toUpperCase().slice(0, 3) })} placeholder={__("АБ")} />
        <T muted>{__('PNG или JPG, лучше на прозрачном фоне. В приложении — на белой плашке.')}</T>
      </Card>

      <Card>
        <H3>{__('Цвет бренда')}</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {PALETTE.map((p) => (
            <Pressable key={p} onPress={() => setColor(p)} accessibilityRole="button" accessibilityLabel={__('Цвет {a}', { a: p })} accessibilityState={{ selected: t.accent === p }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p, alignItems: 'center', justifyContent: 'center', boxShadow: t.accent === p ? `0px 0px 0px 3px ${C.card}, 0px 0px 0px 5px ${p}` : SH.small }}>
              {t.accent === p ? <Icon name="check" size={18} color="#fff" /> : null}
            </Pressable>
          ))}
        </View>
        <Field label={__("Свой цвет (HEX)")} value={hex} onChangeText={setColor} placeholder="#1a73e8" />
        {!isHex(hex) ? <T muted>{__('Формат: # и шесть знаков, например #1a73e8.')}</T> : null}
      </Card>

      <Card>
        <H3>{__('Координатор')}</H3>
        <Field label={__("Имя и фамилия")} value={t.coordinator.name} onChangeText={(name) => patch({ coordinator: { name, initials: initialsOf(name) } })} placeholder={__("Кто на связи с группой")} />
        <Field label={__("Телефон для кнопки «Позвонить»")} value={t.phone || ''} onChangeText={(phone) => patch({ phone })} placeholder="+7 900 000-00-00" keyboardType="phone-pad" />
      </Card>

      <Card>
        <H3>{__('Экран «Сегодня»')}</H3>
        <T muted>{__('Включите нужные блоки и расставьте их стрелками.')}</T>
        {t.blocks.map((b, i) => {
          const meta = TODAY_BLOCKS.find(([k]) => k === b.key);
          return (
            <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Check on={b.on} onPress={() => patch({ blocks: t.blocks.map((x) => (x.key === b.key ? { ...x, on: !x.on } : x)) })}>{`${meta?.[1] ?? b.key} — ${meta?.[2] ?? ''}`}</Check>
              </View>
              <Arrow label={__('Выше: {a}', { a: meta?.[1] })} up disabled={i === 0} onPress={() => moveBlock(i, -1)} />
              <Arrow label={__('Ниже: {a}', { a: meta?.[1] })} disabled={i === t.blocks.length - 1} onPress={() => moveBlock(i, 1)} />
            </View>
          );
        })}
      </Card>

      <Card>
        <H3>{__('Плитки «Под рукой»')}</H3>
        <Chips>{TOOLS.map(([k, title]) => <Pick key={k} title={title} on={t.tools.includes(k)} onPress={() => toggleTool(k)} />)}</Chips>
        <Label>{__('Вкладки внизу')}</Label>
        <Check on={t.tabs.library} onPress={() => patch({ tabs: { ...t.tabs, library: !t.tabs.library } })}>{__('Материалы — презентации и памятки')}</Check>
        <Check on={t.tabs.people} onPress={() => patch({ tabs: { ...t.tabs, people: !t.tabs.people } })}>{__('Люди — группа и знакомства')}</Check>
        <T muted>{__('«Сегодня», «План» и «Поездка» есть всегда.')}</T>
      </Card>
    </>
  );
}

export function Arrow({ up, disabled, onPress, label }: { up?: boolean; disabled: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, boxShadow: disabled ? undefined : SH.small, opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.ink }}>{up ? '↑' : '↓'}</Text>
    </Pressable>
  );
}

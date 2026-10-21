// Конструктор организатора (white label, решение 21.10.2026: «чтобы можно было блоками составлять под требования клиента,
// чтобы он сам мог подгрузить логотип и прописать название организации»). Организатор, купивший подписку, сам задаёт
// название, логотип, цвет, координатора, собирает «Сегодня» из блоков, выбирает плитки «Под рукой» и вкладки, получает код
// приглашения. Пока сервера нет, организатор сохраняется на этом телефоне (tenants.custom); с сервером — для всех участников.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { REGION_RU, TENANT, allTenants, blankTenant, setCustomTenants, suggestCode, type DataRegion, type Tenant } from '@/data/tenant';
import { useSwitchTenant } from '@/state/reset';
import { peekStored, putStored } from '@/state/store';
import { useToast } from '@/state/toast';
import { BrandForm, initialsOf } from '@/ui/brand-form';
import { Button, Card, Chips, Field, H3, Label, Pick, Plain, T } from '@/ui/kit';
import { PhonePreview } from '@/ui/org-ui';
import { C } from '@/ui/theme';
import { __ } from '@/i18n';

const REGIONS = Object.entries(REGION_RU) as [DataRegion, string][];

export default function Builder() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const switchTenant = useSwitchTenant();
  const toast = useToast();
  const existing = id ? allTenants().find((t) => t.id === id && t.custom) : undefined;
  const [t, setT] = useState<Tenant>(() => (existing ? { ...existing, blocks: existing.blocks.map((b) => ({ ...b })) } : blankTenant()));
  const [hex, setHex] = useState(t.accent);
  // монограмму и код подставляем из названия, пока организатор не поправил их сам
  const [ownShort, setOwnShort] = useState(!!existing);
  const [ownCode, setOwnCode] = useState(!!existing);
  const [armed, setArmed] = useState(false);
  const patch = (p: Partial<Tenant>) => { if ('short' in p) setOwnShort(true); setT((x) => ({ ...x, ...p })); };
  const setName = (name: string) => setT((x) => ({ ...x, name, ...(ownShort ? {} : { short: initialsOf(name, 3) }), ...(ownCode ? {} : { code: suggestCode(name) }) }));

  const codeTaken = allTenants().some((x) => x.id !== t.id && x.code.toLowerCase() === t.code.toLowerCase());
  const problem = !t.name.trim() ? __('Впишите название организации')
    : !/^[A-Z0-9]{3,12}$/.test(t.code) ? __('Код приглашения: 3–12 латинских букв или цифр')
      : codeTaken ? __('Такой код уже занят — придумайте другой')
        : !t.coordinator.name.trim() ? __('Впишите имя координатора') : '';

  const save = () => {
    if (problem) { toast(problem); return; }
    const ready: Tenant = { ...t, name: t.name.trim(), short: (t.short || initialsOf(t.name, 3)).slice(0, 3), coordinator: { name: t.coordinator.name.trim(), initials: initialsOf(t.coordinator.name) } };
    const list = (peekStored<Tenant[]>('tenants.custom') || []).filter((x) => x.id !== ready.id).concat(ready);
    putStored('tenants.custom', list);
    setCustomTenants(list);
    switchTenant(ready.id);
    toast(__('Сохранено: {a} · код {b}', { a: ready.name, b: ready.code }));
    setTimeout(() => router.replace('/'), 50);
  };
  const remove = () => {
    if (!armed) { setArmed(true); return; }
    const list = (peekStored<Tenant[]>('tenants.custom') || []).filter((x) => x.id !== t.id);
    putStored('tenants.custom', list);
    setCustomTenants(list);
    if (TENANT.id === t.id) switchTenant('gtt');
    toast(__('Удалено: {a}', { a: t.name }));
    setTimeout(() => router.replace('/join'), 50);
  };

  return (
    <Plain>
      <Card tone="info">
        <T>{__('Быстрая настройка бренда с телефона. Программы, поездки, участники и приглашения — в кабинете организатора.')}</T>
        <View style={{ flexDirection: 'row' }}><Button title={__("Открыть кабинет организатора")} icon="grid" kind="light" small onPress={() => router.push(existing ? `/org?id=${existing.id}` : '/org?new=1')} /></View>
      </Card>

      <View style={{ alignItems: 'center' }}><PhonePreview t={t} trip={null} width={270} /></View>

      <Card>
        <H3>{__('Организация')}</H3>
        <Field label={__("Название")} value={t.name} onChangeText={setName} placeholder={__("Например, Деловые поездки в Азию")} />
        <Field label={__("Слоган под названием")} value={t.tagline} onChangeText={(tagline) => patch({ tagline })} placeholder={__("Чем вы занимаетесь")} />
      </Card>

      <BrandForm t={t} patch={patch} hex={hex} setHex={setHex} />

      <Card>
        <H3>{__('Код приглашения и данные')}</H3>
        <Field label={__("Код (латиница и цифры)")} value={t.code} onChangeText={(v) => { setOwnCode(true); patch({ code: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) }); }} placeholder="ASIATRIP" />
        {t.code ? <T muted>{__('Ссылка для участников: /join?code={a}', { a: t.code })}</T> : null}
        <Label>{__('Где хранить данные участников')}</Label>
        <Chips>{REGIONS.map(([k, ru]) => <Pick key={k} title={ru} on={t.region === k} onPress={() => patch({ region: k })} />)}</Chips>
        <T muted>{__('Выбирайте страну, где работает ваша компания: например, для России закон требует хранить данные граждан в России.')}</T>
      </Card>

      {problem ? <T muted style={{ paddingHorizontal: 4, color: C.warn }}>{problem}</T> : null}
      <Button title={existing ? __('Сохранить изменения') : __('Сохранить и открыть')} icon="check" onPress={save} />
      {existing ? <Button title={armed ? __('Нажмите ещё раз — удалить организатора') : __('Удалить организатора')} kind="ghost" onPress={remove} /> : null}
      <T muted style={{ paddingHorizontal: 4 }}>{__('Пока сервер не подключён, организатор сохраняется на этом устройстве. После запуска сервера участники откроют его по коду на своих телефонах.')}</T>
    </Plain>
  );
}

// «Код приглашения» (white label, решение 21.10.2026): участник вводит код организатора — приложение открывается под его
// брендом (название, цвета, координатор). В демо два кода: GTT — Global Tech Tour, DEMO — пример чужого бренда.
// Ссылка-приглашение /join?code=DEMO открывает поездку организатора сразу, без ввода кода.
// Здесь же вход в конструктор (/builder): свой организатор — название, логотип, цвет, блоки экрана.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { REGION_RU, TENANT, allTenants, tenantByCode, type Tenant } from '@/data/tenant';
import { useSwitchTenant } from '@/state/reset';
import { useToast } from '@/state/toast';
import { Button, Card, Chip, H3, Plain, Row, T, inputStyle } from '@/ui/kit';
import { Monogram } from '@/ui/Monogram';
import { Press } from '@/ui/motion';
import { C, F } from '@/ui/theme';

export default function Join() {
  const switchTenant = useSwitchTenant();
  const toast = useToast();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code || '');
  // код руками — на стартовый экран организатора; по ссылке-приглашению — сразу в поездку
  // смена бренда пересобирает все экраны (и этот тоже), поэтому применяем её только раз — иначе ссылка зациклится
  const open = (t: Tenant, to: '/' | '/trip' = '/') => {
    if (TENANT.id !== t.id) { switchTenant(t.id); toast(`Открыто: ${t.name}`); }
    setTimeout(() => router.replace(to), 50);
  };
  useEffect(() => {
    const t = params.code ? tenantByCode(params.code) : undefined;
    if (t) open(t, '/trip');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);
  const submit = () => {
    const t = tenantByCode(code);
    if (!t) { toast('Такого кода нет — проверьте его у организатора'); return; }
    open(t);
  };
  return (
    <Plain>
      <Card>
        <H3>Код от организатора поездки</H3>
        <T muted>Его присылают вместе с приглашением. По коду приложение открывает поездки вашего организатора — с его названием, цветами и координатором.</T>
        <TextInput value={code} onChangeText={setCode} placeholder="Например, GTT" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false}
          onSubmitEditing={submit} accessibilityLabel="Код приглашения" style={[inputStyle, { fontSize: 20, fontFamily: F.bold, letterSpacing: 2, textAlign: 'center' }]} />
        <Button title="Открыть" onPress={submit} />
      </Card>
      <Card>
        <H3>Организаторы</H3>
        {allTenants().map((t, i) => (
          <Press key={t.id} onPress={() => open(t)} label={`Открыть: ${t.name}, код ${t.code}`} scaleTo={0.98}>
            <Row first={i === 0} left={<Monogram t={t} />} title={t.name}
              sub={`код ${t.code} · данные хранятся: ${REGION_RU[t.region]}${t.demo ? ' · пример бренда' : t.custom ? ' · из конструктора' : ''}`}
              right={t.custom
                ? <Button title="Изменить" kind="light" small label={`Изменить организатора ${t.name}`} onPress={() => router.push(`/org?id=${t.id}&step=brand`)} />
                : TENANT.id === t.id ? <Chip tone="ok">открыто</Chip> : undefined} />
          </Press>
        ))}
      </Card>
      <Card tone="info">
        <H3>Свой организатор</H3>
        <T>Компания и бренд, программы из Excel, Word, PDF или вручную, поездка, участники и приглашение с QR-кодом — в кабинете организатора: с компьютера, планшета или телефона.</T>
        <Button title="Открыть кабинет организатора" icon="plus" onPress={() => router.push('/org?new=1')} />
      </Card>
      <View style={{ paddingHorizontal: 4 }}>
        <T muted>Одно приложение для всех организаторов: у каждого свой бренд, а данные участников хранятся там, где требует закон страны организатора.</T>
      </View>
    </Plain>
  );
}

// «Продажа тура» (решение пользователя 21.10.2026): страница тура для своего сайта и баннеры для соцсетей — мастер
// из шести шагов, «чтобы каждый смог, даже тот, кто никогда этого не делал». Справа — предпросмотр: страница на компьютере
// и телефоне, баннер в ленте соцсети. Бесплатно — 2 страницы, дальше — по подписке.
// /sale?id=<организатор> — список страниц; &page=<id>&step=1…6 — мастер; &program=<id> — сразу страница этой программы.
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { strToU8, zipSync } from 'fflate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pngBytes, renderBanner, type BannerInput } from '@/data/banner';
import { webBase } from '@/data/import';
import { WEB_URL, daysRu, normDate, orgOf, ruDate, saveOrg, tripDates, type OProgram, type Org } from '@/data/org';
import { MAX_VIDEO_MB, dropPhoto, preparePhoto, prepareVideo, putPhoto, usePhotos, useVideoBlob } from '@/data/photos';
import {
  BLOCKS, FORMATS, FREE_PAGES, MESSENGERS, NETS, STYLES, canCreatePage, channelsOf, dayDetailsOf, defaultText, factsOf, formatOf, heroOf, isPro, linkFor, netOf, newPage, pageCtx, pagesMade,
  pagesOf, parseRequisites, postFor, requestOf, slugOf, type Channel, type FormatKey, type Messenger, type NetKey, type OPage, type PageText, type PhotoRef,
} from '@/data/sale';
import { allTenants, type Tenant } from '@/data/tenant';
import { tourHtml } from '@/data/tour-html';
import { LANGS, __, type Lang } from '@/i18n';
import { useToast } from '@/state/toast';
import { Arrow } from '@/ui/brand-form';
import { shareFile } from '@/ui/files';
import { HtmlFrame } from '@/ui/HtmlFrame';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icon-paths';
import { Button, Card, Check, Chips, Field, H3, Label, Pick, Row, Seg, T, inputStyle } from '@/ui/kit';
import { Monogram } from '@/ui/Monogram';
import { Press } from '@/ui/motion';
import { pickPhoto } from '@/ui/notes-ui';
import { Crop, DropZone, PhotoEditor, SocialMock, VideoPreview, useBannerImages, useNatural, type Device } from '@/ui/sale-ui';
import { C, F, SH } from '@/ui/theme';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: [Step, string, IconName, string][] = [
  [1, __('Программа'), 'route', __('Выберите программу, даты и языки страницы.')],
  [2, __('Фото и видео'), 'camera', __('Загрузите фото и выберите обложку: одно фото, слайд-шоу или видео.')],
  [3, __('Тексты'), 'doc', __('Проверьте заголовок и программу — каждый день можно расписать подробно.')],
  [4, __('Страница'), 'grid', __('Блоки страницы, мессенджеры для заявок, рассказ о вас и реквизиты.')],
  [5, __('Баннеры'), 'star', __('Выберите стиль — баннеры под каждую соцсеть готовы.')],
  [6, __('Публикация'), 'send', __('Скачайте страницу и баннеры, скопируйте тексты постов.')],
];
const FMT_NET: Record<FormatKey, NetKey> = { ig_post: 'instagram', ig_story: 'stories', vk: 'vk', tg: 'telegram', fb: 'facebook', sq: 'square' };
const LANG_NAME = Object.fromEntries(LANGS.map(([c, self]) => [c, self])) as Record<Lang, string>;
const MAX_PHOTOS = 30;

export default function Sale() {
  const params = useLocalSearchParams<{ id?: string; page?: string; step?: string; program?: string }>();
  const t = allTenants().find((x) => x.id === params.id && x.custom);
  if (!t) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Text style={{ fontFamily: F.display, fontSize: 36, color: C.ink, textTransform: 'uppercase' }}>{__('Продажа тура')}</Text>
        <T muted>{__('Сначала откройте свой кабинет организатора — страница тура собирается из ваших программ и бренда.')}</T>
        <Button title={__('Кабинет организатора')} icon="building" onPress={() => router.replace('/org')} />
      </ScrollView>
    );
  }
  return <SaleFor key={t.id} t={t} pageId={params.page} step={Math.min(6, Math.max(1, Number(params.step) || 1)) as Step} programId={params.program} />;
}

function SaleFor({ t, pageId, step, programId }: { t: Tenant; pageId?: string; step: Step; programId?: string }) {
  const toast = useToast();
  const [org, setOrg] = useState<Org>(() => orgOf(t.id));
  const upd = useCallback((fn: (o: Org) => Org) => setOrg((o) => { const n = fn(o); saveOrg(t.id, n); return n; }), [t.id]);
  const [paywall, setPaywall] = useState(false);

  const create = (p: OProgram) => {
    if (!canCreatePage(org)) { setPaywall(true); return; }
    const pg = newPage(org, p, t);
    upd((o) => ({ ...o, pages: [...pagesOf(o), pg], pagesMade: pagesMade(o) + 1 }));
    router.setParams({ page: pg.id, step: '1', program: '' });
    toast(__('Страница создана — пройдите 6 шагов, это займёт минут десять'));
  };
  // /sale?program=… — страница этой программы: открыть свою или создать новую
  useEffect(() => {
    if (!programId || pageId) return;
    const mine = pagesOf(org).find((x) => x.programId === programId);
    const p = org.programs.find((x) => x.id === programId);
    if (mine) router.setParams({ page: mine.id, step: '1', program: '' });
    else if (p) create(p);
  }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pg = pagesOf(org).find((x) => x.id === pageId);
  if (!pg) return <PageList t={t} org={org} upd={upd} create={create} paywall={paywall} setPaywall={setPaywall} />;
  return <Wizard key={pg.id} t={t} org={org} upd={upd} pg={pg} step={step} />;
}

// ——— список страниц и бесплатный лимит ———
function PageList({ t, org, upd, create, paywall, setPaywall }: { t: Tenant; org: Org; upd: (fn: (o: Org) => Org) => void; create: (p: OProgram) => void; paywall: boolean; setPaywall: (v: boolean) => void }) {
  const pages = pagesOf(org);
  const free = !isPro(org);
  const made = pagesMade(org);
  const [choose, setChoose] = useState(false);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 820, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Monogram t={t} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 42, color: C.ink, textTransform: 'uppercase' }}>{__('Продажа тура')}</Text>
          <T muted>{t.name}</T>
        </View>
      </View>
      <T muted>{__('Продающая страница тура для вашего сайта и баннеры для соцсетей — из программы, которая уже есть в кабинете. Ничего не нужно уметь: мастер проведёт по шагам.')}</T>
      <Card>
        <H3>{__('Как это работает')}</H3>
        {STEPS.map(([n, name, icon, sub]) => (
          <View key={n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: 13, color: C.blueInk }}>{n}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name={icon} size={15} color={C.blueInk} /><Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{name}</Text></View>
              <T muted>{sub}</T>
            </View>
          </View>
        ))}
      </Card>
      {pages.length ? (
        <Card>
          <H3>{__('Ваши страницы · {a}', { a: pages.length })}</H3>
          {pages.map((x, i) => {
            const p = org.programs.find((q) => q.id === x.programId);
            const tx = x.texts[x.langs[0]];
            return (
              <Row key={x.id} first={i === 0} onPress={() => router.setParams({ page: x.id, step: '1' })} label={__('Открыть: {a}', { a: tx?.title || '' })}
                left={<Icon name="doc" size={20} color={C.blueInk} />} title={tx?.title || p?.title || __('Страница тура')}
                sub={`${x.langs.map((l) => l.toUpperCase()).join(' · ')} · ${x.photos.length ? __('фото: {a}', { a: x.photos.length }) : __('без фото')}`}
                right={<Icon name="route" size={18} color={C.muted} />} />
            );
          })}
        </Card>
      ) : null}
      {free ? <T muted>{__('Бесплатно: создано {a} из {b} страниц тура.', { a: Math.min(made, FREE_PAGES), b: FREE_PAGES })}</T> : <T muted>{__('Подписка: страницы тура без ограничений.')}</T>}
      {!org.programs.length ? (
        <Card tone="warn">
          <H3>{__('Сначала добавьте программу')}</H3>
          <T>{__('Страница собирается из программы поездки. Загрузите её из Excel, Word или PDF — или возьмите пример.')}</T>
          <View style={{ flexDirection: 'row' }}><Button title={__('Загрузить программу')} icon="plus" onPress={() => router.push(`/org?id=${t.id}&step=programs`)} /></View>
        </Card>
      ) : paywall || !canCreatePage(org) ? (
        <Card tone="accent">
          <H3>{__('Бесплатные страницы закончились')}</H3>
          <T>{__('Бесплатно можно сделать {a} страницы тура. Чтобы делать больше — без ограничений, с баннерами и текстами для всех соцсетей, — подключите подписку.', { a: FREE_PAGES })}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button title={__('Тарифы')} icon="star" onPress={() => Linking.openURL(Platform.OS === 'web' ? `${location.origin}${webBase()}/landing/#pricing` : `${WEB_URL}/landing/#pricing`)} />
          </View>
          <Pressable onPress={() => { upd((o) => ({ ...o, plan: 'pro' })); setPaywall(false); }} accessibilityRole="button" hitSlop={6}>
            <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{__('Демо: включить подписку на этом устройстве (до подключения оплаты)')}</Text>
          </Pressable>
        </Card>
      ) : choose ? (
        <Card>
          <H3>{__('Какую программу продаём?')}</H3>
          {org.programs.map((p, i) => {
            const f = factsOf(p);
            return <Row key={p.id} first={i === 0} onPress={() => create(p)} title={p.title} sub={`${daysRu(f.nDays)} · ${f.cities.join(' → ')}`} right={<Icon name="plus" size={18} color={C.blueInk} />} />;
          })}
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button title={__('Новая страница тура')} icon="plus" onPress={() => (org.programs.length === 1 ? create(org.programs[0]) : setChoose(true))} />
          <Button title={__('Кабинет организатора')} kind="ghost" onPress={() => router.push(`/org?id=${t.id}&step=programs`)} />
        </View>
      )}
    </ScrollView>
  );
}

// ——— мастер ———
function Wizard({ t, org, upd, pg, step }: { t: Tenant; org: Org; upd: (fn: (o: Org) => Org) => void; pg: OPage; step: Step }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const wide = width >= 1100;
  const side = width >= 860;
  const set = useCallback((fn: (p: OPage) => OPage) => upd((o) => ({ ...o, pages: pagesOf(o).map((x) => (x.id === pg.id ? fn(x) : x)) })), [upd, pg.id]);
  // программу могли удалить в кабинете — тогда пустая заглушка, а экран просит вернуться к списку (хуки идут всегда)
  const found = org.programs.find((p) => p.id === pg.programId) || org.programs[0];
  const program: OProgram = found || { id: '', title: '', country: 'cn', summary: '', days: [], source: 'manual' };
  const base = pg.langs[0];
  const [lang, setLang] = useState<Lang>(base);
  const L = pg.langs.includes(lang) ? lang : base;
  const hero = heroOf(pg);
  const photos = usePhotos([...pg.photos.map((p) => p.id), ...(org.orgPhotos || []), hero.video].filter(Boolean));
  const video = useVideoBlob(hero.video ? photos[hero.video] : undefined);
  const videoUrl = video.url;
  const post = useMemo(() => (video.blob ? { heroVideo: video.blob } : undefined), [video.blob]);
  const [fmt, setFmt] = useState<FormatKey>('ig_post');
  const [net, setNet] = useState<NetKey>('instagram');
  const [device, setDevice] = useState<Device>('phone');
  const [seen, setSeen] = useState(step);
  useEffect(() => setSeen((s) => (step > s ? step : s)), [step]);
  const go = (s: Step) => router.setParams({ step: String(s) });

  const ctxOf = (l: Lang) => pageCtx(pg, l, program, org, t);
  const cx = ctxOf(L);

  // ——— баннеры ———
  const bannerFor = (fk: FormatKey, l: Lang, style = pg.style): BannerInput => {
    const c = ctxOf(l);
    const pid = pg.bannerPhoto[fk] || pg.cover || pg.photos[0]?.id;
    const ref = pg.photos.find((p) => p.id === pid);
    return {
      fmt: formatOf(fk), style, lang: l, photo: ref && photos[ref.id] ? { src: photos[ref.id], ref } : undefined, logo: t.logo, short: t.short, orgName: t.name, accent: t.accent,
      title: c.text.title, sub: [c.dates, c.route].filter(Boolean).join(' · '), badge: c.text.badge, cta: c.text.cta.trim() || c.L.ctaDefault, price: c.text.price,
    };
  };
  const bKey = JSON.stringify([pg.style, L, pg.texts[L], pg.photos, pg.cover, pg.bannerPhoto, pg.start, t.accent, t.name, t.short, (t.logo || '').length, Object.keys(photos).join()]);
  const thumbs = useBannerImages(step === 5 || step === 6 ? Object.fromEntries(FORMATS.map((f) => [f.key, bannerFor(f.key, L)])) : {}, `${bKey}:${step >= 5}`, 360);
  const styleThumbs = useBannerImages(step === 5 ? Object.fromEntries(STYLES.map(([s], i) => [FORMATS[i === 0 ? 0 : i === 1 ? 5 : 3].key, bannerFor(i === 0 ? 'ig_post' : i === 1 ? 'sq' : 'tg', L, s)])) : {}, `${bKey}:styles:${step}`, 220);
  const styleImg = (i: number) => styleThumbs[FORMATS[i === 0 ? 0 : i === 1 ? 5 : 3].key];
  const downloadBanner = async (fk: FormatKey, l = L) => {
    if (Platform.OS !== 'web') { toast(__('Баннеры скачиваются в браузере — откройте кабинет на компьютере')); return; }
    const f = formatOf(fk);
    const bytes = await pngBytes(await renderBanner(bannerFor(fk, l)));
    await shareFile(`${pg.slug}-${l}-${fk}-${f.w}x${f.h}.png`, bytes, 'png');
  };
  const htmlFile = (show?: Lang) => tourHtml({ pg, program, org, t, photos, show });
  // в предпросмотре ролик не вставляется в страницу, а передаётся ей после загрузки (post)
  const htmlPreview = (show: Lang) => tourHtml({ pg, program, org, t, photos, show, preview: true });
  const downloadPage = async () => { await shareFile(`${pg.slug}.html`, htmlFile(), 'html'); toast(__('Страница скачана — один файл, фото уже внутри')); };
  const downloadAll = async () => {
    if (Platform.OS !== 'web') { toast(__('Архив скачивается в браузере — откройте кабинет на компьютере')); return; }
    toast(__('Собираю архив — несколько секунд'));
    const files: Record<string, Uint8Array> = {};
    for (const l of pg.langs) {
      const c = ctxOf(l);
      for (const f of FORMATS) files[`${l}/${pg.slug}-${f.key}-${f.w}x${f.h}.png`] = await pngBytes(await renderBanner(bannerFor(f.key, l)));
      files[`${l}/posts.txt`] = strToU8(NETS.map((n) => `=== ${n.name} ===\n${postFor(n, c, pg)}`).join('\n\n'));
    }
    files[`${pg.slug}.html`] = strToU8(htmlFile());
    await shareFile(`${pg.slug}-banners.zip`, zipSync(files, { level: 1 }), 'zip');
  };

  // ——— шаги ———
  const done: Record<Step, boolean> = { 1: true, 2: pg.photos.length > 0 || !!hero.video, 3: !!cx.text.title.trim(), 4: seen > 4, 5: seen > 5, 6: !!pg.url };
  const [, title, , sub] = STEPS[step - 1];
  const langTabs = pg.langs.length > 1 ? (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: C.muted }}>{__('Язык')}</Text>
      <Seg options={pg.langs.map((l) => [l, LANG_NAME[l]] as const)} value={L} onChange={setLang} />
    </View>
  ) : null;

  const content =
    step === 1 ? <StepProgram t={t} org={org} pg={pg} set={set} program={program} />
      : step === 2 ? <StepPhotos pg={pg} set={set} photos={photos} maxW={wide ? 560 : Math.min(560, width - 64)} videoUrl={videoUrl} />
        : step === 3 ? <StepTexts t={t} org={org} pg={pg} set={set} program={program} lang={L} langTabs={langTabs} photos={photos} />
          : step === 4 ? <StepPage t={t} org={org} upd={upd} pg={pg} set={set} lang={L} langTabs={langTabs} photos={photos} />
            : step === 5 ? (
              <>
                {langTabs}
                <Card>
                  <H3>{__('1. Выберите стиль баннеров')}</H3>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {STYLES.map(([s, name, d], i) => (
                      <Press key={s} onPress={() => set((p) => ({ ...p, style: s }))} label={name} state={{ selected: pg.style === s }} scaleTo={0.98}
                        style={{ width: 168, padding: 8, gap: 6, borderRadius: 18, backgroundColor: C.card, boxShadow: pg.style === s ? `0px 0px 0px 3px ${C.blue}` : SH.small }}>
                        {styleImg(i) ? <Image source={{ uri: styleImg(i) }} style={{ width: 152, height: 152 / (i === 0 ? 0.8 : i === 1 ? 1 : 16 / 9), borderRadius: 10 }} /> : <View style={{ width: 152, height: 120, borderRadius: 10, backgroundColor: C.well }} />}
                        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>{name}</Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>{d}</Text>
                      </Press>
                    ))}
                  </View>
                </Card>
                <Card>
                  <H3>{__('2. Баннеры под каждую соцсеть')}</H3>
                  <T muted>{__('Нажмите на баннер — справа он появится в ленте соцсети. Тексты меняются на шаге «Тексты».')}</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {FORMATS.map((f) => {
                      const h = 120, w = Math.round((h * f.w) / f.h);
                      return (
                        <Press key={f.key} onPress={() => { setFmt(f.key); setNet(FMT_NET[f.key]); }} label={f.name} state={{ selected: fmt === f.key }} scaleTo={0.98}
                          style={{ padding: 6, gap: 4, borderRadius: 14, backgroundColor: C.card, boxShadow: fmt === f.key ? `0px 0px 0px 3px ${C.blue}` : SH.small }}>
                          {thumbs[f.key] ? <Image source={{ uri: thumbs[f.key] }} style={{ width: w, height: h, borderRadius: 8 }} /> : <View style={{ width: w, height: h, borderRadius: 8, backgroundColor: C.well }} />}
                          <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.ink, maxWidth: Math.max(w, 90) }}>{f.name}</Text>
                          <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.muted }}>{`${f.w}×${f.h}`}</Text>
                        </Press>
                      );
                    })}
                  </View>
                </Card>
                {pg.photos.length > 1 ? (
                  <Card>
                    <H3>{__('3. Фото для баннера «{a}»', { a: formatOf(fmt).name })}</H3>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {pg.photos.map((p) => {
                        const on = (pg.bannerPhoto[fmt] || pg.cover || pg.photos[0]?.id) === p.id;
                        return photos[p.id] ? (
                          <Pressable key={p.id} onPress={() => set((x) => ({ ...x, bannerPhoto: { ...x.bannerPhoto, [fmt]: p.id } }))} accessibilityRole="button" accessibilityState={{ selected: on }}
                            style={{ borderRadius: 10, borderWidth: 3, borderColor: on ? C.blue : 'transparent' }}>
                            <Image source={{ uri: photos[p.id] }} style={{ width: 72, height: 54, borderRadius: 7 }} />
                          </Pressable>
                        ) : null;
                      })}
                    </View>
                  </Card>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Button title={__('Скачать этот баннер (PNG)')} icon="down" kind="light" onPress={() => downloadBanner(fmt)} />
                  <Button title={__('Скачать все баннеры архивом')} icon="down" kind="light" onPress={downloadAll} />
                </View>
                {Platform.OS !== 'web' ? <T muted>{__('Баннеры рисуются и скачиваются в браузере — откройте кабинет на компьютере или в браузере телефона.')}</T> : null}
              </>
            )
              : <StepPublish pg={pg} set={set} cx={cx} net={net} setNet={setNet} langTabs={langTabs} downloadPage={downloadPage} downloadBanner={downloadBanner} downloadAll={downloadAll} bannerOf={(fk) => bannerFor(fk, L)} />;

  // ——— предпросмотр справа: страница пересобирается через 0,4 с после последней правки, чтобы не мигала на каждой букве ———
  const htmlNow = step <= 4 ? htmlPreview(L) : '';
  const [html, setHtml] = useState(htmlNow);
  useEffect(() => { const id = setTimeout(() => setHtml(htmlNow), 400); return () => clearTimeout(id); }, [htmlNow]);
  const panelW = wide ? Math.max(380, width - 250 - 680) : side ? Math.max(340, width - 560) : width - 32;
  const showNet = step === 5 ? FMT_NET[fmt] : net;
  const showFmt = step === 5 ? fmt : netOf(net).fmt;
  const preview = (
    <View style={{ gap: 12, alignItems: 'center', width: '100%' }}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>{step <= 4 ? __('ТАК ВЫГЛЯДИТ СТРАНИЦА') : __('ТАК ВЫГЛЯДИТ В СОЦСЕТИ')}</Text>
      <View style={{ width: Math.min(panelW, 420) }}>
        <Seg options={[['phone', __('Телефон')], ['desktop', __('Компьютер')]] as const} value={device} onChange={setDevice} />
      </View>
      {step <= 4 ? (
        device === 'desktop'
          ? <View style={{ borderRadius: 12, overflow: 'hidden', boxShadow: SH.float }}><HtmlFrame html={html} width={1280} height={1800} scale={(panelW - 8) / 1280} post={post} /></View>
          : (
            <View style={{ borderRadius: 40, padding: 10, backgroundColor: '#101826', boxShadow: SH.float }}>
              <HtmlFrame html={html} width={390} height={800} scale={Math.min(0.82, (panelW - 40) / 390)} radius={30} post={post} />
            </View>
          )
      ) : (
        <SocialMock net={showNet} device={device} maxW={panelW} image={thumbs[showFmt]} aspect={formatOf(showFmt).w / formatOf(showFmt).h}
          text={showNet === 'stories' ? '' : postFor(netOf(showNet), cx, pg)} t={t} title={cx.text.title} domain={pg.url.replace(/^https?:\/\//, '').split('/')[0]} />
      )}
      {step >= 5 ? <T muted>{`${formatOf(showFmt).name} · ${formatOf(showFmt).w}×${formatOf(showFmt).h}`}</T> : <T muted>{__('Страницу можно прокручивать прямо здесь — это тот же файл, что вы скачаете.')}</T>}
    </View>
  );

  const stepList = (
    <View style={{ gap: 4 }}>
      {STEPS.map(([k, name, icon]) => {
        const on = k === step;
        return (
          <Press key={k} onPress={() => go(k)} label={__('Шаг {a}: {b}', { a: k, b: name })} scaleTo={0.98} state={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: on ? C.card : 'transparent', boxShadow: on ? SH.small : undefined }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: done[k] && !on ? C.blue : on ? C.blueSoft : C.well }}>
              {done[k] && !on ? <Icon name="check" size={15} color="#fff" /> : <Text style={{ fontFamily: F.bold, fontSize: 12, color: on ? C.blueInk : C.muted }}>{k}</Text>}
            </View>
            <Icon name={icon} size={17} color={on ? C.blueInk : C.muted} />
            <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 14, color: C.ink }}>{name}</Text>
          </Press>
        );
      })}
    </View>
  );

  const header = (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>{__('ПРОДАЖА ТУРА · ШАГ {a} ИЗ {b}', { a: step, b: STEPS.length })}</Text>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: wide ? 44 : 34, lineHeight: wide ? 48 : 38, color: C.ink, textTransform: 'uppercase' }}>{title}</Text>
      <T muted>{sub}</T>
    </View>
  );
  const nav = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
      {step > 1 ? <Button title={`← ${STEPS[step - 2][1]}`} kind="ghost" onPress={() => go((step - 1) as Step)} /> : null}
      {step < 6 ? <Button title={__('Дальше: {a} →', { a: STEPS[step][1] })} onPress={() => go((step + 1) as Step)} />
        : <Button title={__('Готово — к списку страниц')} onPress={() => router.setParams({ page: '', step: '' })} />}
    </View>
  );

  if (!found) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 20, gap: 12 }}>
        <T>{__('Программы этой страницы больше нет в кабинете.')}</T>
        <View style={{ flexDirection: 'row' }}><Button title={__('Все страницы тура')} onPress={() => router.setParams({ page: '', step: '' })} /></View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: wide ? 'row' : 'column' }}>
      {wide ? (
        <View style={{ width: 250, padding: 18, gap: 18, borderRightWidth: 1, borderColor: C.line2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Monogram t={t} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{cx.text.title}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>{__('продажа тура')}</Text>
            </View>
          </View>
          {stepList}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.setParams({ page: '', step: '' })} accessibilityRole="button" hitSlop={6}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{__('Все страницы тура')}</Text></Pressable>
          <Pressable onPress={() => router.push(`/org?id=${t.id}&step=programs`)} accessibilityRole="button" hitSlop={6}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{__('Кабинет организатора')}</Text></Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
          {STEPS.map(([k, name]) => (
            <Press key={k} onPress={() => go(k)} label={__('Шаг {a}: {b}', { a: k, b: name })} state={{ selected: k === step }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: k === step ? C.blue : C.card, boxShadow: k === step ? SH.blue : SH.small }}>
              {done[k] && k !== step ? <Icon name="check" size={14} color={C.blueInk} /> : <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: k === step ? '#fff' : C.muted }}>{k}</Text>}
              <Text style={{ fontFamily: F.semibold, fontSize: 13, color: k === step ? '#fff' : C.ink }}>{name}</Text>
            </Press>
          ))}
        </ScrollView>
      )}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: wide ? 32 : 16, paddingTop: wide ? 26 : 8, paddingBottom: insets.bottom + 60, gap: 14, maxWidth: 720, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          {header}
          {content}
          {nav}
          {!side ? <View style={{ marginTop: 18 }}>{preview}</View> : null}
        </ScrollView>
        {side ? (
          <ScrollView style={{ width: panelW + 24, flexGrow: 0, borderLeftWidth: 1, borderColor: C.line2 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 12 }}>
            {preview}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

// ——— 1. Программа, даты, языки ———
function StepProgram({ t, org, pg, set, program }: { t: Tenant; org: Org; pg: OPage; set: (fn: (p: OPage) => OPage) => void; program: OProgram }) {
  const toast = useToast();
  const trips = org.trips.filter((x) => x.programId === program.id);
  const [own, setOwn] = useState(pg.start && !trips.some((x) => x.start === pg.start) ? ruDate(pg.start) : '');
  const pickProgram = (p: OProgram) => {
    if (p.id === pg.programId) return;
    const trip = org.trips.find((x) => x.programId === p.id);
    set((x) => ({ ...x, programId: p.id, tripId: trip?.id || '', start: trip?.start || '', slug: slugOf(p.title), bannerPhoto: {}, texts: Object.fromEntries(x.langs.map((l) => [l, defaultText(l, p, trip, t)])) }));
    toast(__('Тексты собраны заново из программы «{a}»', { a: p.title }));
  };
  const toggleLang = (l: Lang) => set((x) => {
    if (x.langs.includes(l)) return x.langs.length === 1 ? x : { ...x, langs: x.langs.filter((y) => y !== l) };
    const trip = org.trips.find((y) => y.id === x.tripId);
    return { ...x, langs: [...x.langs, l], texts: { ...x.texts, [l]: x.texts[l] || defaultText(l, program, trip, t) } };
  });
  return (
    <>
      <Card>
        <H3>{__('1. Какую программу продаём?')}</H3>
        {org.programs.map((p) => {
          const f = factsOf(p);
          return <Pick key={p.id} title={`${p.title} · ${f.cities.join(' → ') || '—'}`} on={p.id === pg.programId} onPress={() => pickProgram(p)} />;
        })}
      </Card>
      <Card>
        <H3>{__('2. Когда поездка?')}</H3>
        <Chips>
          {trips.map((x) => <Pick key={x.id} title={tripDates(x.start, Math.max(1, program.days.length))} on={pg.start === x.start && pg.tripId === x.id} onPress={() => { setOwn(''); set((p) => ({ ...p, tripId: x.id, start: x.start })); }} />)}
          <Pick title={__('Даты уточняются')} on={!pg.start} onPress={() => { setOwn(''); set((p) => ({ ...p, tripId: '', start: '' })); }} />
        </Chips>
        <Field label={__('Или свои даты: первый день (ДД.ММ.ГГГГ)')} value={own} onChangeText={(v) => { setOwn(v); const iso = normDate(v); if (iso) set((p) => ({ ...p, tripId: '', start: iso })); }} placeholder="16.11.2026" />
      </Card>
      <Card>
        <H3>{__('3. На каких языках страница?')}</H3>
        <Chips>{LANGS.map(([c, self]) => <Pick key={c} title={self} on={pg.langs.includes(c)} onPress={() => toggleLang(c)} />)}</Chips>
        <T muted>{__('Первый выбранный — основной. Кнопки и разделы страницы переводятся сами, ваш текст вы проверите и переведёте на шаге «Тексты». На странице будет переключатель языков.')}</T>
      </Card>
    </>
  );
}

// ——— выбор нескольких фото сразу ———
async function pickMany(): Promise<string[]> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: Platform.OS === 'web' ? 0.6 : 0.8 });
  return r.canceled ? [] : (r.assets || []).map((a) => a.uri);
}
const Thumb = ({ src, on, n, onPress, label, w = 96 }: { src: string; on?: boolean; n?: number; onPress: () => void; label: string; w?: number }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} style={{ borderRadius: 12, borderWidth: 3, borderColor: on ? C.blue : 'transparent' }}>
    <Image source={{ uri: src }} style={{ width: w, height: Math.round(w * 0.75), borderRadius: 9 }} />
    {n ? <View style={{ position: 'absolute', right: 4, top: 4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{n}</Text></View> : null}
  </Pressable>
);

// ——— 2. Фото и видео ———
function StepPhotos({ pg, set, photos, maxW, videoUrl }: { pg: OPage; set: (fn: (p: OPage) => OPage) => void; photos: Record<string, string>; maxW: number; videoUrl: string }) {
  const toast = useToast();
  const [sel, setSel] = useState(pg.cover || pg.photos[0]?.id || '');
  const cur = pg.photos.find((p) => p.id === sel) || pg.photos[0];
  const nat = useNatural(cur ? photos[cur.id] : undefined);
  const hero = heroOf(pg);
  const setHero = (h: Partial<ReturnType<typeof heroOf>>) => set((p) => ({ ...p, hero: { ...heroOf(p), ...h } }));
  const addVideo = async (uri: string) => {
    try {
      const v = await prepareVideo(uri);
      if (!v) { toast(__('Видео больше {a} МБ — укоротите его до 10–20 секунд', { a: MAX_VIDEO_MB })); return; }
      const id = await putPhoto(v);
      if (hero.video) dropPhoto(hero.video);
      setHero({ mode: 'video', video: id });
      toast(__('Видео на обложке — без звука, по кругу'));
    } catch { toast(__('Не получилось открыть видео — попробуйте MP4')); }
  };
  const add = async (uris: string[]) => {
    const vid = uris.find((u) => u.startsWith('data:video'));
    if (vid) await addVideo(vid);
    const imgs = uris.filter((u) => !u.startsWith('data:video'));
    if (!imgs.length) return;
    const room = MAX_PHOTOS - pg.photos.length;
    if (room <= 0) { toast(__('Можно до {a} фото — удалите лишнее', { a: MAX_PHOTOS })); return; }
    const refs: PhotoRef[] = [];
    for (const u of imgs.slice(0, room)) {
      try { refs.push({ id: await putPhoto(await preparePhoto(u)), fx: 0.5, fy: 0.45, zoom: 1, dim: 0 }); } catch { toast(__('Не получилось открыть фото — попробуйте JPG или PNG')); }
    }
    if (!refs.length) return;
    set((p) => ({ ...p, photos: [...p.photos, ...refs], cover: p.cover || refs[0].id }));
    setSel(refs[0].id);
    toast(refs.length > 1 ? __('Добавлено фото: {a}', { a: refs.length }) : __('Фото добавлено — нажмите на главное на нём'));
  };
  const pickVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (!r.canceled && r.assets?.length) addVideo(r.assets[0].uri);
  };
  const patch = (r: PhotoRef) => set((p) => ({ ...p, photos: p.photos.map((x) => (x.id === r.id ? r : x)) }));
  const remove = (id: string) => {
    dropPhoto(id);
    set((p) => {
      const rest = p.photos.filter((x) => x.id !== id);
      const h = heroOf(p);
      return {
        ...p, photos: rest, cover: p.cover === id ? rest[0]?.id || '' : p.cover,
        bannerPhoto: Object.fromEntries(Object.entries(p.bannerPhoto).filter(([, v]) => v !== id)),
        hero: p.hero ? { ...h, slides: h.slides.filter((x) => x !== id) } : p.hero,
        dayPhotos: p.dayPhotos ? Object.fromEntries(Object.entries(p.dayPhotos).filter(([, v]) => v !== id)) : p.dayPhotos,
      };
    });
    setSel('');
  };
  const toggleSlide = (id: string) => setHero({ slides: hero.slides.includes(id) ? hero.slides.filter((x) => x !== id) : [...hero.slides, id] });
  const vw = Math.min(maxW, 360);
  return (
    <>
      <DropZone onFiles={add} video>
        <Icon name="camera" size={30} color={C.blueInk} />
        <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.ink, textAlign: 'center' }}>{Platform.OS === 'web' ? __('Перетащите фото или видео сюда') : __('Добавьте фото поездки')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <Button title={__('Выбрать фото')} icon="plus" onPress={async () => add(await pickMany())} />
          {Platform.OS !== 'web' ? <Button title={__('Сделать снимок')} icon="camera" kind="light" onPress={async () => { const r = await pickPhoto('camera'); if (r) add([r.uri]); }} /> : null}
        </View>
        <T muted>{__('JPG или PNG, до {a} фото. Лучше всего — живые фото с поездок: заводы, город, группа. Без надписей и чужих логотипов.', { a: MAX_PHOTOS })}</T>
      </DropZone>
      <Card>
        <H3>{__('Обложка страницы')}</H3>
        <T muted>{__('Первый экран — то, что человек увидит сразу. Несколько фото или видео смотрятся живее одной картинки.')}</T>
        <Seg options={[['photo', __('Одно фото')], ['slides', __('Слайд-шоу')], ['video', __('Видео')]] as const} value={hero.mode}
          onChange={(m) => setHero(m === 'slides' && !hero.slides.length ? { mode: m, slides: pg.photos.slice(0, 5).map((p) => p.id) } : { mode: m })} />
        {hero.mode === 'photo' ? <T muted>{__('На обложке — фото с отметкой «Обложка». Чтобы поставить другое, выберите его ниже и нажмите «Сделать обложкой».')}</T> : null}
        {hero.mode === 'slides' ? (
          <>
            <T muted>{__('Отметьте фото — они будут сменять друг друга каждые 5 секунд в том порядке, в каком вы их отметили.')}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pg.photos.map((p) => (photos[p.id] ? <Thumb key={p.id} src={photos[p.id]} w={84} on={hero.slides.includes(p.id)} n={hero.slides.indexOf(p.id) + 1} onPress={() => toggleSlide(p.id)} label={__('Слайд-шоу: фото {a}', { a: pg.photos.indexOf(p) + 1 })} /> : null))}
            </View>
            {hero.slides.filter((id) => photos[id]).length < 2 ? <T style={{ color: C.warn }}>{__('Отметьте хотя бы 2 фото — пока на обложке будет одно.')}</T> : null}
          </>
        ) : null}
        {hero.mode === 'video' ? (
          <>
            {hero.video && photos[hero.video] ? <VideoPreview src={videoUrl} w={vw} h={Math.round((vw * 9) / 16)} /> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Button title={hero.video ? __('Заменить видео') : __('Загрузить видео')} icon="video" kind={hero.video ? 'light' : 'primary'} small onPress={pickVideo} />
              {hero.video ? <Button title={__('Удалить видео')} icon="trash" kind="ghost" small onPress={() => { dropPhoto(hero.video); setHero({ video: '', mode: 'photo' }); }} /> : null}
            </View>
            <T muted>{__('MP4, 10–20 секунд, до {a} МБ. Видео идёт без звука по кругу, а пока грузится — видна обложка-фото.', { a: MAX_VIDEO_MB })}</T>
          </>
        ) : null}
      </Card>
      {pg.photos.length ? (
        <Card>
          <H3>{__('Ваши фото · {a}', { a: pg.photos.length })}</H3>
          <T muted>{__('Все фото попадут в галерею страницы — её листают как карусель и открывают на весь экран.')}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {pg.photos.map((p) => photos[p.id] ? (
              <Pressable key={p.id} onPress={() => setSel(p.id)} accessibilityRole="button" accessibilityState={{ selected: cur?.id === p.id }} style={{ borderRadius: 12, borderWidth: 3, borderColor: cur?.id === p.id ? C.blue : 'transparent' }}>
                <Image source={{ uri: photos[p.id] }} style={{ width: 96, height: 72, borderRadius: 9 }} />
                {pg.cover === p.id ? <View style={{ position: 'absolute', left: 4, top: 4, backgroundColor: C.blue, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontFamily: F.bold, fontSize: 10, color: '#fff' }}>{__('Обложка')}</Text></View> : null}
              </Pressable>
            ) : null)}
          </View>
        </Card>
      ) : (
        <Card tone="info"><T>{__('Без фото баннеры будут в цвете вашего бренда — это тоже красиво, но с живыми фото продаёт лучше.')}</T></Card>
      )}
      {cur && photos[cur.id] ? (
        <Card>
          <H3>{__('Настройте фото')}</H3>
          <T muted>{__('Нажмите на фото там, где самое главное (люди, завод, вывеска) — эта часть останется в кадре на всех баннерах. Если на фото слишком светло, добавьте затемнение — текст будет читаться лучше.')}</T>
          <PhotoEditor src={photos[cur.id]} value={cur} onChange={patch} maxW={maxW} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {pg.cover !== cur.id ? <Button title={__('Сделать обложкой')} icon="star" kind="light" small onPress={() => set((p) => ({ ...p, cover: cur.id }))} /> : null}
            <Button title={__('Удалить фото')} icon="trash" kind="ghost" small onPress={() => remove(cur.id)} />
          </View>
          {nat ? (
            <>
              <H3>{__('Так фото ляжет в баннеры')}</H3>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {FORMATS.map((f) => {
                  const h = 96, w = Math.round((h * f.w) / f.h);
                  return (
                    <View key={f.key} style={{ gap: 4 }}>
                      <Crop src={photos[cur.id]} ref={cur} w={w} h={h} nat={nat} />
                      <Text style={{ fontFamily: F.semibold, fontSize: 11, color: C.muted, maxWidth: Math.max(w, 80) }}>{f.name}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

// ——— 3. Тексты ———
function StepTexts({ t, org, pg, set, program, lang, langTabs, photos }: { t: Tenant; org: Org; pg: OPage; set: (fn: (p: OPage) => OPage) => void; program: OProgram; lang: Lang; langTabs: React.ReactNode; photos: Record<string, string> }) {
  const toast = useToast();
  const base = pg.langs[0];
  const tx = pg.texts[lang] || pg.texts[base]!;
  const patch = (p: Partial<PageText>) => set((x) => ({ ...x, texts: { ...x.texts, [lang]: { ...(x.texts[lang] || tx), ...p } } }));
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState<number[]>([0]);
  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    const trip = org.trips.find((y) => y.id === pg.tripId);
    patch(defaultText(lang, program, trip, t));
    setArmed(false);
    toast(__('Тексты собраны заново из программы'));
  };
  const f = factsOf(program);
  const details = tx.dayDetails ?? dayDetailsOf(program);
  const len = tx.title.trim().length;
  const dayPhoto = (i: number, id: string) => set((p) => {
    const d = { ...(p.dayPhotos || {}) };
    if (d[String(i)] === id) delete d[String(i)]; else d[String(i)] = id;
    return { ...p, dayPhotos: d };
  });
  return (
    <>
      {langTabs}
      {lang !== base ? (
        <Card tone="warn">
          <T>{__('Автоматического перевода пока нет. Кнопки и разделы страницы уже на языке «{a}» — переведите ваш текст ниже.', { a: LANG_NAME[lang] })}</T>
          <View style={{ flexDirection: 'row' }}><Button title={__('Скопировать мой текст с языка «{a}»', { a: LANG_NAME[base] })} kind="light" small onPress={() => { const b = pg.texts[base]!; patch({ title: b.title, subtitle: b.subtitle, days: [...b.days], dayDetails: [...(b.dayDetails ?? dayDetailsOf(program))], about: b.about, price: b.price }); }} /></View>
        </Card>
      ) : null}
      <Card>
        <H3>{__('Главное — заголовок')}</H3>
        <Field label={__('Заголовок')} value={tx.title} onChangeText={(v) => patch({ title: v })} placeholder={__('Например, Заводы Китая изнутри: 6 визитов за 4 дня')} />
        <T muted>{len > 60 ? __('{a} знаков — длинновато: на баннере заголовок станет мельче. Лучше до 60.', { a: len }) : __('{a} знаков. Хороший заголовок обещает пользу: что человек увидит и узнает.', { a: len })}</T>
        <Field label={__('Подзаголовок')} value={tx.subtitle} onChangeText={(v) => patch({ subtitle: v })} multiline placeholder={__('Одно-два предложения: для кого поездка и что даст')} />
        <Field label={__('Акцент на баннере')} value={tx.badge} onChangeText={(v) => patch({ badge: v })} placeholder={__('Например, Осталось 6 мест')} />
        <Field label={__('Текст кнопки')} value={tx.cta} onChangeText={(v) => patch({ cta: v })} />
        <Field label={__('Стоимость (необязательно)')} value={tx.price} onChangeText={(v) => patch({ price: v })} placeholder={__('Например, от 350 000 ₽ — пусто: «по запросу»')} />
      </Card>
      <Card>
        <H3>{__('Что входит')}</H3>
        <T muted>{__('Каждый пункт — с новой строки.')}</T>
        <Field value={tx.included} onChangeText={(v) => patch({ included: v })} multiline />
      </Card>
      <Card>
        <H3>{__('Программа по дням')}</H3>
        <T muted>{__('Сверху — коротко, что главное в этот день. В «Подробно» — весь день по пунктам: на странице он раскрывается по нажатию.')}</T>
        {program.days.map((d, i) => {
          const on = open.includes(i);
          const ph = pg.dayPhotos?.[String(i)];
          return (
            <View key={i} style={{ gap: 8, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <Field label={`${i + 1} · ${d.city || '—'}`} value={tx.days[i] ?? f.dayLines[i] ?? ''} onChangeText={(v) => { const days = [...tx.days]; days[i] = v; patch({ days }); }} />
              <Pressable onPress={() => setOpen((o) => (on ? o.filter((x) => x !== i) : [...o, i]))} accessibilityRole="button" accessibilityState={{ expanded: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{on ? __('Свернуть день {a}', { a: i + 1 }) : __('Подробно о дне {a} и фото', { a: i + 1 })}</Text>
                <Text style={{ color: C.blueInk, fontSize: 12 }}>{on ? '▲' : '▼'}</Text>
                {!on && (details[i]?.trim() || ph) ? <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>{`· ${details[i]?.trim() ? __('пунктов: {a}', { a: details[i].trim().split('\n').length }) : ''}${ph ? ' 📷' : ''}`}</Text> : null}
              </Pressable>
              {on ? (
                <>
                  <Field label={__('Подробно о дне {a}', { a: i + 1 })} value={details[i] ?? ''} multiline rows={Math.min(10, Math.max(4, (details[i] ?? '').split('\n').length + 1))} placeholder={__('Каждый пункт с новой строки, время в начале: «10:00 Завод BYD — экскурсия по цеху»')}
                    onChangeText={(v) => { const dd = [...details]; dd[i] = v; patch({ dayDetails: dd }); }} />
                  {pg.photos.length ? (
                    <>
                      <Label>{__('Фото дня — нажмите, чтобы поставить или убрать')}</Label>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {pg.photos.map((p, k) => (photos[p.id] ? <Thumb key={p.id} src={photos[p.id]} w={64} on={ph === p.id} onPress={() => dayPhoto(i, p.id)} label={__('День {a}: фото {b}', { a: i + 1, b: k + 1 })} /> : null))}
                      </View>
                    </>
                  ) : null}
                </>
              ) : null}
            </View>
          );
        })}
      </Card>
      <View style={{ flexDirection: 'row' }}><Button title={armed ? __('Нажмите ещё раз — текст заменится') : __('Собрать тексты заново из программы')} kind="ghost" small onPress={reset} /></View>
    </>
  );
}

// ——— 4. Страница: блоки, организатор, реквизиты, мессенджеры ———
const MAX_ORG_PHOTOS = 12;
function StepPage({ t, org, upd, pg, set, lang, langTabs, photos }: { t: Tenant; org: Org; upd: (fn: (o: Org) => Org) => void; pg: OPage; set: (fn: (p: OPage) => OPage) => void; lang: Lang; langTabs: React.ReactNode; photos: Record<string, string> }) {
  const toast = useToast();
  const move = (i: number, d: -1 | 1) => set((p) => {
    const b = [...p.blocks];
    const j = i + d;
    if (j < 1 || j >= b.length) return p;
    const cur = b[i];
    b.splice(i, 1);
    b.splice(j, 0, cur);
    return { ...p, blocks: b };
  });
  const tx = pg.texts[lang] || pg.texts[pg.langs[0]]!;
  const patchText = (p: Partial<PageText>) => set((x) => ({ ...x, texts: { ...x.texts, [lang]: { ...(x.texts[lang] || tx), ...p } } }));
  // фото организатора
  const orgPhotos = org.orgPhotos || [];
  const addOrg = async (uris: string[]) => {
    const room = MAX_ORG_PHOTOS - orgPhotos.length;
    if (room <= 0) { toast(__('Можно до {a} фото — удалите лишнее', { a: MAX_ORG_PHOTOS })); return; }
    const ids: string[] = [];
    for (const u of uris.filter((x) => !x.startsWith('data:video')).slice(0, room)) {
      try { ids.push(await putPhoto(await preparePhoto(u))); } catch { toast(__('Не получилось открыть фото — попробуйте JPG или PNG')); }
    }
    if (ids.length) upd((o) => ({ ...o, orgPhotos: [...(o.orgPhotos || []), ...ids] }));
  };
  const dropOrg = (id: string) => { dropPhoto(id); upd((o) => ({ ...o, orgPhotos: (o.orgPhotos || []).filter((x) => x !== id) })); };
  // реквизиты
  const req = parseRequisites(org.requisites || '');
  const paste = async () => {
    try {
      const s = (await Clipboard.getStringAsync()).trim();
      if (!s) { toast(__('В буфере пусто — сначала скопируйте реквизиты')); return; }
      upd((o) => ({ ...o, requisites: s }));
      toast(__('Реквизиты вставлены — строк: {a}', { a: parseRequisites(s).length }));
    } catch { toast(__('Браузер не дал прочитать буфер — нажмите в поле и вставьте: Ctrl+V или «Вставить»')); }
  };
  // мессенджеры
  const chans = channelsOf(org);
  const on = chans.filter((c) => c.on && c.value.trim());
  const setCh = (kind: Messenger, p: Partial<Channel>) => upd((o) => ({ ...o, channels: channelsOf(o).map((c) => (c.kind === kind ? { ...c, ...p } : c)) }));
  const r = requestOf(pg);
  const setReq = (p: Partial<ReturnType<typeof requestOf>>) => set((x) => ({ ...x, request: { ...requestOf(x), ...p } }));
  const primary = on.find((c) => c.kind === r.primary) || on[0];
  return (
    <>
      {langTabs}
      <Card>
        <H3>{__('Блоки страницы')}</H3>
        <T muted>{__('Включите нужные и расставьте стрелками. Обложка всегда первая.')}</T>
        {pg.blocks.map((b, i) => {
          const meta = BLOCKS.find(([k]) => k === b.key)!;
          return (
            <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <View style={{ flex: 1 }}>
                <Check on={b.on || b.key === 'cover'} onPress={() => b.key !== 'cover' && set((p) => ({ ...p, blocks: p.blocks.map((x) => (x.key === b.key ? { ...x, on: !x.on } : x)) }))}>{`${meta[1]} — ${meta[2]}`}</Check>
              </View>
              {b.key !== 'cover' ? (
                <>
                  <Arrow label={__('Выше: {a}', { a: meta[1] })} up disabled={i <= 1} onPress={() => move(i, -1)} />
                  <Arrow label={__('Ниже: {a}', { a: meta[1] })} disabled={i === pg.blocks.length - 1} onPress={() => move(i, 1)} />
                </>
              ) : null}
            </View>
          );
        })}
      </Card>
      <Card>
        <H3>{__('Куда придут заявки')}</H3>
        <T muted>{__('Отметьте мессенджеры, в которых удобно получать заявки, и впишите номер или ник.')}</T>
        {chans.map((c) => {
          const [, name, hint, color] = MESSENGERS.find(([k]) => k === c.kind)!;
          return (
            <View key={c.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable onPress={() => setCh(c.kind, { on: !c.on })} accessibilityRole="checkbox" accessibilityState={{ checked: c.on }} accessibilityLabel={name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: 136 }}>
                <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: c.on ? C.blue : C.well, boxShadow: c.on ? SH.blue : SH.inset, alignItems: 'center', justifyContent: 'center' }}>
                  {c.on ? <Icon name="check" size={14} color="#fff" /> : null}
                </View>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 14, color: C.ink }} numberOfLines={1}>{name}</Text>
              </Pressable>
              <TextInput value={c.value} onChangeText={(v) => setCh(c.kind, { value: v, on: c.on || !!v.trim() })} placeholder={hint} placeholderTextColor={C.muted}
                accessibilityLabel={__('{a}: номер, ник или адрес', { a: name })} keyboardType={c.kind === 'email' ? 'email-address' : c.kind === 'whatsapp' || c.kind === 'viber' || c.kind === 'phone' ? 'phone-pad' : 'default'}
                style={[inputStyle, { flex: 1, minWidth: 0, opacity: c.on ? 1 : 0.6 }]} />
            </View>
          );
        })}
        {!on.length ? <T style={{ color: C.warn }}>{__('Отметьте хотя бы один мессенджер или почту — иначе заявки некуда отправить.')}</T> : null}
        <Label>{__('Как показать на странице')}</Label>
        <Seg options={[['buttons', __('Кнопка на каждый мессенджер')], ['single', __('Одна кнопка')]] as const} value={r.mode} onChange={(m) => setReq({ mode: m })} />
        {r.mode === 'single' && on.length ? (
          <>
            <Label>{__('Куда ведёт кнопка «Отправить заявку»')}</Label>
            <Chips>{on.map((c) => <Pick key={c.kind} title={MESSENGERS.find(([k]) => k === c.kind)![1]} on={primary?.kind === c.kind} onPress={() => setReq({ primary: c.kind })} />)}</Chips>
          </>
        ) : null}
        <T muted>{__('В WhatsApp и на почту заявка приходит готовым текстом. В Telegram, MAX, ВКонтакте и Viber текст копируется сам — человеку останется вставить его в открывшийся чат.')}</T>
      </Card>
      <Card>
        <H3>{__('Об организаторе')}</H3>
        <T muted>{__('Расскажите подробно: кто вы, сколько лет возите группы, что берёте на себя. Пустая строка — новый абзац.')}</T>
        <Field value={tx.about} onChangeText={(v) => patchText({ about: v })} multiline rows={7} placeholder={__('Кто вы и почему с вами надёжно: сколько лет возите группы, сколько поездок провели')} />
        <Label>{__('Фото: команда, группы, офис · {a}', { a: orgPhotos.length })}</Label>
        <DropZone onFiles={addOrg}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {orgPhotos.map((id, i) => (photos[id] ? (
              <View key={id}>
                <Image source={{ uri: photos[id] }} style={{ width: 84, height: 63, borderRadius: 9 }} />
                <Pressable onPress={() => dropOrg(id)} accessibilityRole="button" accessibilityLabel={__('Удалить фото {a}', { a: i + 1 })}
                  style={{ position: 'absolute', right: 3, top: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,27,45,.75)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 13, lineHeight: 15 }}>×</Text>
                </Pressable>
              </View>
            ) : null))}
          </View>
          <Button title={__('Добавить фото организатора')} icon="plus" kind="light" small onPress={async () => addOrg(await pickMany())} />
          <T muted>{__('До {a} фото. На странице открываются на весь экран.', { a: MAX_ORG_PHOTOS })}</T>
        </DropZone>
      </Card>
      <Card>
        <H3>{__('Реквизиты')}</H3>
        <T muted>{__('Скопируйте карточку компании из письма, 1С или банка и вставьте целиком — ИНН, банк и счёт разложатся по строкам сами. На странице реквизиты открываются по кнопке и копируются одним нажатием.')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button title={__('Вставить из буфера')} icon="copy" kind="light" small onPress={paste} />
          {org.requisites ? <Button title={__('Очистить')} icon="trash" kind="ghost" small onPress={() => upd((o) => ({ ...o, requisites: '' }))} /> : null}
        </View>
        <Field label={__('Реквизиты компании')} value={org.requisites || ''} onChangeText={(v) => upd((o) => ({ ...o, requisites: v }))} multiline rows={6} placeholder={__('Например: ООО «Ромашка», ИНН, КПП, ОГРН, банк, БИК, расчётный счёт')} />
        {req.length ? (
          <View style={{ borderRadius: 14, backgroundColor: C.well, padding: 12, gap: 6 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 1, color: C.muted }}>{__('ТАК БУДЕТ НА СТРАНИЦЕ')}</Text>
            {req.map(([k, v], i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                {k ? <Text style={{ width: 130, fontFamily: F.regular, fontSize: 13, color: C.muted }}>{k}</Text> : null}
                <Text style={{ flex: 1, fontFamily: F.semibold, fontSize: 13, color: C.ink }}>{v}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      <Card>
        <H3>{__('Цвет и логотип')}</H3>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Monogram t={t} size={48} />
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.accent }} />
          <T muted>{__('Берутся из бренда организатора.')}</T>
        </View>
        <View style={{ flexDirection: 'row' }}><Button title={__('Изменить бренд')} kind="light" small onPress={() => router.push(`/org?id=${t.id}&step=brand`)} /></View>
      </Card>
    </>
  );
}

// ——— 6. Публикация ———
const HOWTO: Record<NetKey, string[]> = {
  instagram: [__('Скачайте баннер «Instagram · пост 4:5».'), __('В Instagram нажмите «+» → «Публикация» и выберите баннер.'), __('Вставьте текст и опубликуйте. Ссылку поставьте в шапку профиля: в постах Instagram ссылки не нажимаются.')],
  stories: [__('Скачайте баннер «Stories и Reels» на телефон.'), __('В Instagram или ВКонтакте создайте историю и выберите баннер.'), __('Добавьте стикер «Ссылка» с адресом страницы.')],
  vk: [__('Скачайте баннер «ВКонтакте».'), __('В сообществе нажмите «Создать пост», вставьте текст и прикрепите баннер.'), __('Опубликуйте — ссылка в тексте нажимается.')],
  telegram: [__('Скачайте баннер «Telegram».'), __('В канале нажмите скрепку → «Фото» и выберите баннер.'), __('Вставьте текст в подпись и отправьте.')],
  facebook: [__('Скачайте баннер «Facebook и LinkedIn».'), __('Создайте публикацию, прикрепите баннер и вставьте текст.'), __('Опубликуйте.')],
  linkedin: [__('Скачайте баннер «Facebook и LinkedIn».'), __('Нажмите «Начать публикацию», прикрепите баннер и вставьте текст.'), __('Опубликуйте.')],
  square: [__('Скачайте баннер «Квадрат 1:1».'), __('Отправьте его в WhatsApp, Одноклассники или любой чат вместе с текстом.')],
};
const enc = encodeURIComponent;
function shareUrl(net: NetKey, link: string, text: string, title: string): string {
  if (net === 'telegram') return `https://t.me/share/url?url=${enc(link)}&text=${enc(title)}`;
  if (net === 'vk') return `https://vk.com/share.php?url=${enc(link)}&title=${enc(title)}`;
  if (net === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`;
  if (net === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`;
  if (net === 'square') return `https://wa.me/?text=${enc(text)}`;
  return '';
}
function StepPublish({ pg, set, cx, net, setNet, langTabs, downloadPage, downloadBanner, downloadAll, bannerOf }: {
  pg: OPage; set: (fn: (p: OPage) => OPage) => void; cx: ReturnType<typeof pageCtx>; net: NetKey; setNet: (n: NetKey) => void; langTabs: React.ReactNode;
  downloadPage: () => void; downloadBanner: (f: FormatKey) => void; downloadAll: () => void; bannerOf: (f: FormatKey) => BannerInput;
}) {
  const toast = useToast();
  const n = netOf(net);
  const text = postFor(n, cx, pg);
  const edited = cx.text.posts[net] !== undefined;
  const link = linkFor(pg, n.src);
  const setPost = (v: string | undefined) => set((p) => {
    const cur = p.texts[cx.lang]!;
    const posts = { ...cur.posts };
    if (v === undefined) delete posts[net]; else posts[net] = v;
    return { ...p, texts: { ...p.texts, [cx.lang]: { ...cur, posts } } };
  });
  const copy = async (s: string) => { try { await Clipboard.setStringAsync(s); toast(__('Текст скопирован')); } catch { toast(__('Не получилось скопировать')); } };
  const canShareFiles = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.canShare && (() => { try { return navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] }); } catch { return false; } })();
  const shareNative = async () => {
    try {
      const bytes = await pngBytes(await renderBanner(bannerOf(n.fmt)));
      await navigator.share({ files: [new File([bytes as BlobPart], `${pg.slug}-${n.fmt}.png`, { type: 'image/png' })], text });
    } catch { /* человек закрыл окно «Поделиться» */ }
  };
  const url = shareUrl(net, link, text, cx.text.title);
  const over = n.limit > 0 && text.length > n.limit;
  return (
    <>
      <Card>
        <H3>{__('1. Страница на вашем сайте')}</H3>
        <T>{__('1) Скачайте страницу — это один файл, фото уже внутри.')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button title={__('Скачать страницу (HTML)')} icon="down" onPress={downloadPage} />
          <Button title={__('Скачать всё: страницу и баннеры')} icon="down" kind="light" onPress={downloadAll} />
        </View>
        <T>{__('2) Загрузите файл на свой сайт: в Тильде — блок «HTML-код», в WordPress — блок «Пользовательский HTML», или отдайте файл тому, кто ведёт ваш сайт.')}</T>
        <T>{__('3) Вставьте сюда адрес страницы — ссылки в постах станут рабочими и с меткой соцсети: в статистике сайта будет видно, откуда пришла заявка.')}</T>
        <Field label={__('Адрес страницы на вашем сайте')} value={pg.url} onChangeText={(v) => set((p) => ({ ...p, url: v.trim() }))} placeholder="https://example.com/tour-china" keyboardType="url" />
        <T muted>{__('Публикация по адресу платформы и автопостинг в соцсети появятся вместе с сервером.')}</T>
      </Card>
      {langTabs}
      <Card>
        <H3>{__('2. Посты в соцсети')}</H3>
        <Chips>{NETS.map((x) => <Pick key={x.key} title={x.name} on={x.key === net} onPress={() => setNet(x.key)} />)}</Chips>
        {HOWTO[net].map((s, i) => <T key={i}>{`${i + 1}. ${s}`}</T>)}
        {net === 'stories' ? (
          <View style={{ gap: 6 }}>
            <T muted>{__('В Stories текст не пишут — он уже на баннере. Адрес для стикера «Ссылка»:')}</T>
            <T bold>{link || cx.L.noLink}</T>
          </View>
        ) : (
          <>
            <Field label={__('Текст поста')} value={text} onChangeText={(v) => setPost(v)} multiline />
            <Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: over ? C.red : C.muted }}>{__('{a} из {b} знаков', { a: text.length, b: n.limit })}{over ? ` · ${__('длинновато — сократите')}` : ''}</Text>
            {edited ? <Pressable onPress={() => setPost(undefined)} accessibilityRole="button" hitSlop={6}><Text style={{ fontFamily: F.semibold, fontSize: 13, color: C.blueInk }}>{__('Вернуть автотекст')}</Text></Pressable> : null}
          </>
        )}
        {!pg.url ? <T style={{ color: C.warn }}>{__('Нет адреса страницы — в тексте стоит «{a}». Впишите адрес выше.', { a: cx.L.noLink })}</T> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button title={net === 'stories' ? __('Скопировать адрес') : __('Скопировать текст')} icon="copy" onPress={() => copy(net === 'stories' ? link || cx.L.noLink : text)} />
          <Button title={__('Скачать баннер')} icon="down" kind="light" onPress={() => downloadBanner(n.fmt)} />
          {canShareFiles ? <Button title={__('Поделиться')} icon="share" kind="light" onPress={shareNative} /> : null}
          {url && pg.url ? <Button title={__('Открыть {a}', { a: n.name })} icon="send" kind="light" onPress={() => Linking.openURL(url)} /> : null}
        </View>
      </Card>
      <Card tone="info">
        <H3>{__('Продвижение')}</H3>
        <T>{__('Платное продвижение (VK Реклама, Яндекс Директ) и публикация в соцсети одной кнопкой появятся следующим шагом, вместе с сервером. В России интернет-рекламу нужно маркировать — это мы сделаем автоматически.')}</T>
      </Card>
    </>
  );
}

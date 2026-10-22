// «Продажа тура»: редактор фото (точка интереса, приближение, затемнение), кадры под форматы, загрузка перетаскиванием
// и макеты соцсетей — как баннер с текстом будет выглядеть в ленте на телефоне и на компьютере.
// Цвета макетов соцсетей — их собственные (белая лента, серый фон), а не токены приложения: это картинка чужого экрана.
import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { renderBanner, type BannerInput } from '@/data/banner';
import type { FormatKey, NetKey, PhotoRef } from '@/data/sale';
import type { Tenant } from '@/data/tenant';
import { __ } from '@/i18n';
import { Icon } from './Icon';
import { C, F, SH } from './theme';

// ——— размеры фото ———
export function useNatural(src?: string): [number, number] | null {
  const [s, setS] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!src) { setS(null); return; }
    let live = true;
    Image.getSize(src, (w, h) => live && setS([w, h]), () => live && setS(null));
    return () => { live = false; };
  }, [src]);
  return s;
}

/** Фото, обрезанное как на баннере: та же математика, что в renderBanner. */
export function Crop({ src, ref, w, h, nat, radius = 10 }: { src: string; ref: PhotoRef; w: number; h: number; nat: [number, number]; radius?: number }) {
  const [iw, ih] = nat;
  const k = Math.max(w / iw, h / ih) * Math.max(1, ref.zoom || 1);
  const sw = w / k, sh = h / k;
  const sx = Math.min(Math.max(0, ref.fx * iw - sw / 2), iw - sw);
  const sy = Math.min(Math.max(0, ref.fy * ih - sh / 2), ih - sh);
  return (
    <View style={{ width: w, height: h, overflow: 'hidden', borderRadius: radius, backgroundColor: C.well }}>
      <Image source={{ uri: src }} style={{ position: 'absolute', left: -sx * k, top: -sy * k, width: iw * k, height: ih * k }} />
      {ref.dim > 0 ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: `rgba(0,0,0,${ref.dim})` }} /> : null}
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const btn = (t: string, on: () => void, a: string) => (
    <Pressable onPress={on} accessibilityRole="button" accessibilityLabel={a} hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, boxShadow: SH.small }}>
      <Text style={{ fontFamily: F.bold, fontSize: 20, color: C.ink }}>{t}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.ink, minWidth: 120 }}>{label}</Text>
      {btn('−', onMinus, __('{a}: меньше', { a: label }))}
      <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.ink, minWidth: 52, textAlign: 'center' }}>{value}</Text>
      {btn('+', onPlus, __('{a}: больше', { a: label }))}
    </View>
  );
}

/** Нажать на главное на фото — оно останется в кадре на всех баннерах. */
export function PhotoEditor({ src, value, onChange, maxW }: { src: string; value: PhotoRef; onChange: (r: PhotoRef) => void; maxW: number }) {
  const nat = useNatural(src);
  if (!nat) return <View style={{ height: 200, borderRadius: 18, backgroundColor: C.well }} />;
  const [iw, ih] = nat;
  let w = Math.min(maxW, 620);
  let h = (w * ih) / iw;
  if (h > 420) { h = 420; w = (h * iw) / ih; }
  const tap = (e: GestureResponderEvent) => {
    const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; clientX?: number; clientY?: number };
    let x = ne.locationX ?? 0, y = ne.locationY ?? 0;
    if (Platform.OS === 'web') {
      const r = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect();
      x = (ne.clientX ?? 0) - r.left; y = (ne.clientY ?? 0) - r.top;
    }
    onChange({ ...value, fx: Math.min(1, Math.max(0, x / w)), fy: Math.min(1, Math.max(0, y / h)) });
  };
  const clamp = (v: number, a: number, b: number) => Math.round(Math.min(b, Math.max(a, v)) * 10) / 10;
  return (
    <View style={{ gap: 14 }}>
      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={__('Нажмите на главное на фото')}
        style={{ width: w, height: h, borderRadius: 18, overflow: 'hidden', alignSelf: 'flex-start', boxShadow: SH.clay }}>
        <View pointerEvents="none"><Image source={{ uri: src }} style={{ width: w, height: h }} /></View>
        <View pointerEvents="none" style={{ position: 'absolute', left: value.fx * w - 22, top: value.fy * h - 22, width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 10px rgba(0,0,0,0.45)' }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.blue }} />
        </View>
      </Pressable>
      <Stepper label={__('Приближение')} value={`${Math.round((value.zoom || 1) * 100)}%`} onMinus={() => onChange({ ...value, zoom: clamp((value.zoom || 1) - 0.1, 1, 2) })} onPlus={() => onChange({ ...value, zoom: clamp((value.zoom || 1) + 0.1, 1, 2) })} />
      <Stepper label={__('Затемнение')} value={`${Math.round(value.dim * 100)}%`} onMinus={() => onChange({ ...value, dim: clamp(value.dim - 0.1, 0, 0.6) })} onPlus={() => onChange({ ...value, dim: clamp(value.dim + 0.1, 0, 0.6) })} />
    </View>
  );
}

/** Место для перетаскивания фото (в браузере на компьютере). */
/** Перетаскивание файлов в браузере: фото и (если video) ролики — data:URL. */
export function DropZone({ onFiles, video, children }: { onFiles: (dataUrls: string[]) => void; video?: boolean; children: ReactNode }) {
  const ref = useRef<View>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); setOver(e.type === 'dragover'); };
    const drop = (e: DragEvent) => {
      e.preventDefault(); setOver(false);
      const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/') || (video && f.type.startsWith('video/')));
      Promise.all(files.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }))).then(onFiles);
    };
    el.addEventListener('dragover', prevent);
    el.addEventListener('dragleave', prevent);
    el.addEventListener('drop', drop);
    return () => { el.removeEventListener('dragover', prevent); el.removeEventListener('dragleave', prevent); el.removeEventListener('drop', drop); };
  }, [onFiles, video]);
  return (
    <View ref={ref} style={{ borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: over ? C.blue : C.line, backgroundColor: over ? C.blueSoft : 'transparent', padding: 18, gap: 12, alignItems: 'center' }}>
      {children}
    </View>
  );
}

/** Ролик обложки без звука по кругу; на телефоне — заглушка (видео добавляется в браузере). */
export function VideoPreview({ src, w, h }: { src: string; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0f1b2d', alignItems: 'center', justifyContent: 'center' }}>
      {Platform.OS === 'web' && src
        ? createElement('video', { src, muted: true, autoPlay: true, loop: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
        : <Icon name="video" size={28} color="#fff" />}
    </View>
  );
}

// ——— предпросмотр баннеров ———
/** Картинки баннеров для предпросмотра: перерисовываются через 250 мс после последней правки. */
export function useBannerImages(inputs: Partial<Record<FormatKey, BannerInput>>, key: string, width: number): Partial<Record<FormatKey, string>> {
  const [out, setOut] = useState<Partial<Record<FormatKey, string>>>({});
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let live = true;
    const timer = setTimeout(async () => {
      const next: Partial<Record<FormatKey, string>> = {};
      for (const [k, b] of Object.entries(inputs) as [FormatKey, BannerInput][]) {
        try {
          const cv = await renderBanner(b, Math.min(1, width / b.fmt.w));
          next[k] = cv.toDataURL('image/jpeg', 0.86);
        } catch { /* картинка не загрузилась — покажем без неё в следующий раз */ }
        if (!live) return;
      }
      if (live) setOut(next);
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [key, width]); // eslint-disable-line react-hooks/exhaustive-deps
  return out;
}

// ——— макеты соцсетей ———
export type Device = 'phone' | 'desktop';
type MockProps = { net: NetKey; image?: string; aspect: number; text: string; t: Tenant; title: string; domain: string };

const Ava = ({ t, size = 32 }: { t: Tenant; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
    {t.logo ? <Image source={{ uri: t.logo }} style={{ width: size * 0.8, height: size * 0.8 }} resizeMode="contain" />
      : <View style={{ width: size, height: size, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.bold, fontSize: size * 0.36, color: '#fff' }}>{t.short.slice(0, 2)}</Text></View>}
  </View>
);
const Pic = ({ image, w, aspect, radius = 0 }: { image?: string; w: number; aspect: number; radius?: number }) => (
  image ? <Image source={{ uri: image }} style={{ width: w, height: w / aspect, borderRadius: radius }} /> : <View style={{ width: w, height: w / aspect, borderRadius: radius, backgroundColor: '#e5e7eb' }} />
);

function PostCard({ net, image, aspect, text, t, title, domain, w }: MockProps & { w: number }) {
  const name = t.name || __('Новый организатор');
  if (net === 'instagram' || net === 'stories') {
    if (net === 'stories') {
      const h = w / aspect;
      return (
        <View style={{ width: w, height: h, backgroundColor: '#000', overflow: 'hidden', borderRadius: 10 }}>
          <Pic image={image} w={w} aspect={aspect} />
          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>{[1, 0.4, 0.4].map((o, i) => <View key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, backgroundColor: `rgba(255,255,255,${o})` }} />)}</View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ava t={t} size={28} /><Text style={{ fontFamily: F.semibold, fontSize: 12.5, color: '#fff' }}>{name}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{__('2 ч')}</Text></View>
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 58, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Icon name="share" size={14} color="#3797f0" />
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#3797f0' }}>{domain.toUpperCase().slice(0, 24) || __('ССЫЛКА')}</Text>
            </View>
          </View>
          <View style={{ position: 'absolute', left: 10, right: 10, bottom: 12, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: '#fff' }}>{__('Отправить сообщение')}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={{ width: w, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}><Ava t={t} /><Text style={{ fontFamily: F.semibold, fontSize: 13, color: '#000', flex: 1 }}>{name}</Text><Text style={{ color: '#000' }}>•••</Text></View>
        <Pic image={image} w={w} aspect={aspect} />
        <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 10, paddingTop: 10 }}>
          <Text style={{ fontSize: 22, color: '#000' }}>♡</Text><Icon name="chat" size={22} color="#000" /><Icon name="send" size={22} color="#000" />
        </View>
        <Text style={{ fontFamily: F.semibold, fontSize: 13, color: '#000', paddingHorizontal: 10, paddingTop: 6 }}>{__('Нравится: {a}', { a: 128 })}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.regular, fontSize: 13, color: '#000', paddingHorizontal: 10, paddingTop: 4, paddingBottom: 2 }}>
          <Text style={{ fontFamily: F.semibold }}>{name} </Text>{text.replace(/\n+/g, ' ')}
        </Text>
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: '#737373', paddingHorizontal: 10, paddingBottom: 12 }}>{__('ещё')}</Text>
      </View>
    );
  }
  if (net === 'vk') {
    return (
      <View style={{ width: w, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}><Ava t={t} size={40} /><View style={{ flex: 1 }}><Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: '#2c2d2e' }}>{name}</Text><Text style={{ fontFamily: F.regular, fontSize: 12.5, color: '#818c99' }}>{__('сегодня в 10:00')}</Text></View></View>
        <Text numberOfLines={4} style={{ fontFamily: F.regular, fontSize: 13.5, lineHeight: 19, color: '#000', paddingHorizontal: 12 }}>{text.replace(/\n{2,}/g, '\n')}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: '#2a5885', paddingHorizontal: 12, paddingTop: 2, paddingBottom: 10 }}>{__('Показать ещё')}</Text>
        <Pic image={image} w={w} aspect={aspect} />
        <View style={{ flexDirection: 'row', gap: 18, padding: 12 }}>{['♡ 24', '💬 3', '↪ 5'].map((x) => <Text key={x} style={{ fontFamily: F.medium, fontSize: 13, color: '#818c99' }}>{x}</Text>)}</View>
      </View>
    );
  }
  if (net === 'telegram') {
    return (
      <View style={{ width: w, backgroundColor: '#d9e4cf', padding: 10, gap: 8 }}>
        <View style={{ alignSelf: 'flex-start', maxWidth: w - 40, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>
          <Pic image={image} w={w - 40} aspect={aspect} />
          <Text style={{ fontFamily: F.semibold, fontSize: 13, color: '#3390ec', paddingHorizontal: 10, paddingTop: 8 }}>{name}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: '#000', paddingHorizontal: 10, paddingTop: 2 }}>{text}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 11, color: '#8a8a8a', alignSelf: 'flex-end', padding: 8 }}>{'👁 1,2K  10:00'}</Text>
        </View>
      </View>
    );
  }
  if (net === 'facebook' || net === 'linkedin') {
    const li = net === 'linkedin';
    return (
      <View style={{ width: w, backgroundColor: '#fff', borderRadius: li ? 10 : 8, overflow: 'hidden', borderWidth: li ? 1 : 0, borderColor: '#e0dfdc' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}><Ava t={t} size={40} /><View style={{ flex: 1 }}><Text style={{ fontFamily: F.semibold, fontSize: 14, color: '#050505' }}>{name}</Text><Text style={{ fontFamily: F.regular, fontSize: 12, color: '#65676b' }}>{li ? __('Подписчики: {a} · 1 ч', { a: 312 }) : __('Только что · 🌐')}</Text></View></View>
        <Text numberOfLines={3} style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 19, color: '#050505', paddingHorizontal: 12, paddingBottom: 4 }}>{text.replace(/\n{2,}/g, '\n')}</Text>
        <Text style={{ fontFamily: F.semibold, fontSize: 13.5, color: '#65676b', paddingHorizontal: 12, paddingBottom: 10 }}>{li ? __('…ещё') : __('Ещё')}</Text>
        <Pic image={image} w={w} aspect={aspect} />
        <View style={{ backgroundColor: li ? '#eef3f8' : '#f0f2f5', padding: 12, gap: 2 }}>
          <Text style={{ fontFamily: F.regular, fontSize: 12, color: '#65676b' }}>{(domain || 'example.com').toUpperCase()}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.semibold, fontSize: 15, color: '#050505' }}>{title}</Text>
        </View>
      </View>
    );
  }
  // квадрат — сообщение в WhatsApp
  return (
    <View style={{ width: w, backgroundColor: '#efeae2', padding: 10 }}>
      <View style={{ alignSelf: 'flex-end', maxWidth: w - 50, backgroundColor: '#d9fdd3', borderRadius: 10, padding: 4 }}>
        <Pic image={image} w={w - 58} aspect={aspect} radius={8} />
        <Text numberOfLines={8} style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: '#111b21', paddingHorizontal: 6, paddingTop: 6 }}>{text}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 11, color: '#667781', alignSelf: 'flex-end', paddingHorizontal: 6, paddingBottom: 2 }}>{'10:00 ✓✓'}</Text>
      </View>
    </View>
  );
}

const DOMAIN: Record<NetKey, string> = { instagram: 'instagram.com', stories: 'instagram.com', vk: 'vk.com', telegram: 'web.telegram.org', facebook: 'facebook.com', linkedin: 'linkedin.com', square: 'web.whatsapp.com' };
/** Ширина макета на телефоне и на компьютере: телефон — 360 px в рамке, компьютер — окно 980 px, уменьшенное под место. */
export function SocialMock(p: MockProps & { device: Device; maxW: number }) {
  const feedBg = p.net === 'vk' ? '#edeef0' : p.net === 'facebook' ? '#f0f2f5' : p.net === 'linkedin' ? '#f4f2ee' : p.net === 'telegram' ? '#d9e4cf' : p.net === 'square' ? '#efeae2' : p.net === 'stories' ? '#1a1a1a' : '#fff';
  if (p.device === 'phone') {
    const w = Math.min(330, p.maxW - 24);
    return (
      <View style={{ width: w + 20, borderRadius: 40, padding: 10, backgroundColor: '#101826', boxShadow: SH.float }}>
        <View style={{ height: Math.round((w * 19.5) / 9), borderRadius: 31, overflow: 'hidden', backgroundColor: feedBg }}>
          <View style={{ height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, backgroundColor: p.net === 'stories' ? '#000' : '#fff' }}>
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: p.net === 'stories' ? '#fff' : '#000' }}>9:41</Text>
            <View style={{ width: 70, height: 18, borderRadius: 10, backgroundColor: '#101826' }} />
            <Text style={{ fontFamily: F.semibold, fontSize: 11, color: p.net === 'stories' ? '#fff' : '#000' }}>5G</Text>
          </View>
          <View style={{ alignItems: 'center', paddingTop: p.net === 'vk' || p.net === 'facebook' || p.net === 'linkedin' ? 8 : 0 }}>
            <PostCard {...p} w={p.net === 'vk' || p.net === 'facebook' || p.net === 'linkedin' ? w - 12 : p.net === 'stories' ? w - 8 : w} />
          </View>
        </View>
      </View>
    );
  }
  const W = 980, H = p.net === 'instagram' || p.net === 'stories' ? 800 : 640;
  const scale = Math.min(1, (p.maxW - 8) / W);
  const colW = p.net === 'stories' ? 300 : p.net === 'telegram' || p.net === 'square' ? 520 : 500;
  const side = (n: number) => <View style={{ gap: 10, paddingTop: 20 }}>{Array.from({ length: n }).map((_, i) => <View key={i} style={{ width: 150 - (i % 3) * 30, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.08)' }} />)}</View>;
  return (
    <View style={{ width: W * scale, height: H * scale, overflow: 'hidden', borderRadius: 12, boxShadow: SH.float }}>
      <View style={{ width: W, height: H, transform: [{ scale }], transformOrigin: 'top left', backgroundColor: feedBg }}>
        <View style={{ height: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, backgroundColor: '#e9ecf1' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <View key={c} style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: c }} />)}
          <View style={{ flex: 1, marginHorizontal: 60, height: 24, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 10 }}><Text style={{ fontFamily: F.regular, fontSize: 12, color: '#5b6576' }}>{DOMAIN[p.net]}</Text></View>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 40, paddingTop: 18 }}>
          {p.net !== 'stories' ? side(7) : null}
          <View style={{ width: colW, alignItems: 'center' }}>
            <PostCard {...p} w={colW} />
          </View>
          {p.net !== 'stories' && p.net !== 'telegram' && p.net !== 'square' ? side(5) : null}
        </View>
      </View>
    </View>
  );
}
export { DOMAIN as MOCK_DOMAIN };

// Карта маршрута любой из 9 стран: регионы (как на сайте), регионы маршрута подсвечены, дуги переездов — самолёт
// пунктиром, поезд сплошной линией. «Камера» плавно подлетает: к переезду, пока он рисуется, потом к городу.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Box, ProvinceShape } from '@/data/geo';
import { mapRoute, type MapLeg, type MapStop } from '@/data/map-route';
import { C, DARK, F } from './theme';

/** Цвета карты под тему: суша, регионы маршрута, выбранный регион, границы. */
const MAP = DARK
  ? { land: '#222c3b', route: '#1d3352', sel: '#2a4a78', routeLine: '#5d8fd6', line: '#3a465a' }
  : { land: '#ffffff', route: '#e4eefd', sel: '#cfe0fc', routeLine: '#7aa7ec', line: '#b9c3d4' };

const CAMERA_MS = 750;
const ARC_MS = 1300;
const PLANE = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z';
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: Box, b: Box, t: number): Box => [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t) as Box;

/** Дуга переезда — изгиб вверх, как на сайте. */
function arc([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.18;
  const at = (t: number) => {
    const m = 1 - t;
    return { x: m * m * x1 + 2 * m * t * cx + t * t * x2, y: m * m * y1 + 2 * m * t * cy + t * t * y2, a: (Math.atan2(2 * m * (cy - y1) + 2 * t * (y2 - cy), 2 * m * (cx - x1) + 2 * t * (x2 - cx)) * 180) / Math.PI };
  };
  const upTo = (t: number) => { const n = Math.max(2, Math.round(28 * t)); return Array.from({ length: n + 1 }, (_, i) => at((t * i) / n)).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''); };
  return { full: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, upTo, at };
}

/** Регионы — отдельным компонентом: при движении камеры меняется только толщина линий. */
const Provinces = memo(function Provinces({ shapes, route, k, selProvince }: { shapes: ProvinceShape[]; route: Set<string>; k: number; selProvince?: string }) {
  return (
    <>
      {shapes.map((p) => {
        const onRoute = route.has(p.en);
        return <Path key={p.en} d={p.d} fill={p.en === selProvince ? MAP.sel : onRoute ? MAP.route : MAP.land} stroke={onRoute ? MAP.routeLine : MAP.line} strokeWidth={(onRoute ? 1.2 : 0.8) * k} />;
      })}
    </>
  );
});

type Props = {
  /** Страна: cn, jp, kr, th, vn, id, in, my, ae. */
  cc: string;
  stops: MapStop[];
  legs: MapLeg[];
  /** Сколько переездов уже показано (для проигрывания); legs.length — весь маршрут. */
  shown: number;
  /** Выбранный город. */
  sel?: string;
  /** Крупно на выбранном городе; иначе — весь маршрут. */
  zoomed?: boolean;
  onPick?: (key: string) => void;
  /** Мини-карта для карточки: без подписей и анимации. */
  compact?: boolean;
  /** Только номера городов, без названий — когда городов много и подписи налезают (названия — списком под картой). */
  numbersOnly?: boolean;
  height: number;
  width: number;
};

export function RouteMap({ cc, stops, legs, shown, sel, zoomed, onPick, compact, numbersOnly, width, height }: Props) {
  const m = useMemo(() => mapRoute(cc, stops, legs), [cc, stops, legs]);
  const arcs = useMemo(() => legs.map((l) => arc(m.xy(l.from), m.xy(l.to))), [legs, m]);

  // дуга последнего показанного переезда рисуется заново при каждом шаге
  const [prog, setProg] = useState(1);
  const lastShown = useRef(shown);
  useEffect(() => {
    if (compact || shown <= lastShown.current) { lastShown.current = shown; setProg(1); return; }
    lastShown.current = shown;
    const t0 = Date.now();
    let raf = 0;
    const step = () => { const t = Math.min(1, (Date.now() - t0) / ARC_MS); setProg(t); if (t < 1) raf = requestAnimationFrame(step); };
    setProg(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shown, compact]);

  const drawing = !compact && prog < 1 && shown > 0 && shown <= legs.length;
  const target: Box = compact ? m.routeBox : drawing ? m.legBox(legs[shown - 1]) : zoomed && sel ? m.cityBox(sel) : m.routeBox;

  // камера: плавный перелёт к новой рамке
  const [box, setBox] = useState<Box>(target);
  const boxRef = useRef(box);
  const key = `${cc}:${target.map((v) => v.toFixed(0)).join(',')}`;
  useEffect(() => {
    const from = boxRef.current;
    if (compact) { boxRef.current = target; setBox(target); return; }
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / CAMERA_MS);
      const b = lerp(from, target, ease(t));
      boxRef.current = b;
      setBox(b);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // единиц карты на пиксель экрана — чтобы подписи и линии были одного размера при любом приближении
  const k = Math.max(box[2] / width, box[3] / height);
  const selProvince = sel ? m.province(sel)?.en : undefined;
  const visible = (x: number, y: number) => x > box[0] && x < box[0] + box[2] && y > box[1] && y < box[1] + box[3];
  const reached = new Set(legs.slice(0, shown).map((l) => l.to));
  const labels = m.geo.shapes.filter((p) => p.box[2] / k > 70);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={box.map((v) => v.toFixed(1)).join(' ')} preserveAspectRatio="xMidYMid meet">
        <Rect x={box[0] - box[2]} y={box[1] - box[3]} width={box[2] * 3} height={box[3] * 3} fill="#f1f6ff" />
        <Provinces shapes={m.geo.shapes} route={m.provinces} k={k} selProvince={selProvince} />
        {compact ? null : labels.filter((p) => visible(p.label[0], p.label[1])).map((p) => (
          <SvgText key={p.en} x={p.label[0]} y={p.label[1]} fontSize={10 * k} fontFamily={m.provinces.has(p.en) ? F.bold : F.regular}
            fill={m.provinces.has(p.en) ? C.blueInk : '#8a94a6'} textAnchor="middle" opacity={0.9}>{p.ru}</SvgText>
        ))}

        {legs.map((l, i) => {
          const a = arcs[i];
          const done = i < shown;
          const current = i === shown - 1 && drawing;
          const color = done ? C.blue : MAP.line;
          const dash = l.how === 'plane' ? [7 * k, 6 * k] : undefined;
          const tip = a.at(current ? prog : 0.5);
          return (
            <G key={i}>
              {current ? <Path d={a.full} fill="none" stroke="#b9c3d4" strokeWidth={2 * k} strokeDasharray={dash} /> : null}
              <Path d={current ? a.upTo(prog) : a.full} fill="none" stroke={color} strokeWidth={(l.how === 'train' ? 3.5 : 2.5) * k} strokeLinecap="round" strokeDasharray={dash} />
              {done && !compact ? (
                l.how === 'plane'
                  ? <G transform={`translate(${tip.x} ${tip.y}) rotate(${tip.a + 90}) scale(${0.75 * k}) translate(-12 -12)`}><Path d={PLANE} fill={color} /></G>
                  : <G transform={`translate(${tip.x} ${tip.y}) scale(${k})`}><Rect x={-8} y={-6} width={16} height={12} rx={3} fill={color} /><Path d="M-4 1h8" stroke="#fff" strokeWidth={1.8} /></G>
              ) : null}
            </G>
          );
        })}

        {compact ? null : (() => {
          const [mx, my] = m.xy('moscow');
          return visible(mx, my) ? (
            <G>
              <Circle cx={mx} cy={my} r={6 * k} fill={C.ink} stroke="#fff" strokeWidth={2 * k} />
              <SvgText x={mx + 10 * k} y={my - 9 * k} fontSize={13 * k} fontFamily={F.bold} fill={C.ink}>↖ Москва</SvgText>
            </G>
          ) : null;
        })()}

        {stops.map((s, i) => {
          const [x, y] = m.xy(s.key);
          const on = s.key === sel;
          const lit = compact || reached.has(s.key) || shown >= legs.length;
          const left = s.side === 'left';
          const tx = x + (left ? -14 : 14) * k;
          const anchor = left ? 'end' : 'start';
          return (
            <G key={s.key} onPress={onPick ? () => onPick(s.key) : undefined}>
              {on ? <Circle cx={x} cy={y} r={20 * k} fill={C.blue} opacity={0.16} /> : null}
              <Circle cx={x} cy={y} r={(compact ? 5 : on ? 11 : 9.5) * k} fill={lit ? C.blue : '#9aa6b8'} stroke="#fff" strokeWidth={2 * k} />
              {compact ? null : (
                <>
                  <SvgText x={x} y={y + 3.6 * k} fontSize={10 * k} fontFamily={F.bold} fill="#fff" textAnchor="middle">{String(i + 1)}</SvgText>
                  {numbersOnly ? null : <SvgText x={tx} y={y - 1 * k} fontSize={14 * k} fontFamily={F.bold} fill="#fff" stroke="#fff" strokeWidth={3 * k} textAnchor={anchor}>{s.ru}</SvgText>}
                  {numbersOnly ? null : <SvgText x={tx} y={y - 1 * k} fontSize={14 * k} fontFamily={F.bold} fill={C.ink} textAnchor={anchor}>{s.ru}</SvgText>}
                  {s.sub && !numbersOnly ? <SvgText x={tx} y={y + 13 * k} fontSize={10.5 * k} fontFamily={F.medium} fill="#fff" stroke="#fff" strokeWidth={3 * k} textAnchor={anchor}>{s.sub}</SvgText> : null}
                  {s.sub && !numbersOnly ? <SvgText x={tx} y={y + 13 * k} fontSize={10.5 * k} fontFamily={F.medium} fill={C.muted} textAnchor={anchor}>{s.sub}</SvgText> : null}
                  {/* большая невидимая зона нажатия */}
                  <Circle cx={x} cy={y} r={24 * k} fill="#000" opacity={0.001} />
                </>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

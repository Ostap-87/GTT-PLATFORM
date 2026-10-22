// Предпросмотр страницы тура в браузере: тот же HTML, что скачивается, в рамке нужной ширины (компьютер 1280 px
// или телефон 390 px), уменьшенный под место на экране.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

/** post — что передать странице после каждой загрузки (ролик обложки как Blob). */
export function HtmlFrame({ html, width, height, scale = 1, radius = 0, post }: { html: string; width: number; height: number; scale?: number; radius?: number; post?: unknown }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const send = () => { if (post) ref.current?.contentWindow?.postMessage(post, '*'); };
  useEffect(send, [post]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: radius, backgroundColor: '#fff' }}>
      <iframe ref={ref} onLoad={send} title="preview" srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-modals"
        style={{ width, height, flexShrink: 0, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0', background: '#fff', display: 'block' }} />
    </View>
  );
}

// Предпросмотр страницы тура в браузере: тот же HTML, что скачивается, в рамке нужной ширины (компьютер 1280 px
// или телефон 390 px), уменьшенный под место на экране.
import { View } from 'react-native';

export function HtmlFrame({ html, width, height, scale = 1, radius = 0 }: { html: string; width: number; height: number; scale?: number; radius?: number }) {
  return (
    <View style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: radius, backgroundColor: '#fff' }}>
      <iframe title="preview" srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-modals"
        style={{ width, height, flexShrink: 0, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0', background: '#fff', display: 'block' }} />
    </View>
  );
}

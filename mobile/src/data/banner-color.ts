// Цвета бренда для баннеров и страницы тура: светлый ли цвет (тогда текст на нём тёмный) и смешивание с чёрным/белым.
export const rgbOf = (hex: string) => { const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** to — 0 (к чёрному) или 255 (к белому), k — доля от 0 до 1. */
export const mix = (hex: string, to: number, k: number) => `rgb(${rgbOf(hex).map((c) => Math.round(c + (to - c) * k)).join(',')})`;
export const isLight = (hex: string) => { const [r, g, b] = rgbOf(hex).map((c) => c / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62; };

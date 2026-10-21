// Настоящий QR-код ссылки-приглашения (qrcode-generator, без сети): SVG для экрана и для печати.
import qrcode from 'qrcode-generator';

export function qrSvg(text: string, dark = '#0f1b2d') {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${n + 8} ${n + 8}" shape-rendering="crispEdges"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#ffffff"/><path d="${d}" fill="${dark}"/></svg>`;
}

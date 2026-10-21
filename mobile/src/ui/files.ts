// Отдать готовый файл (Excel, CSV, календарь, контакты, PDF): на телефоне — «Поделиться» (почта, мессенджер, «Файлы»,
// нужное приложение), в браузере — скачивание.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const MIME = {
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'org.openxmlformats.spreadsheetml.sheet'],
  csv: ['text/csv', 'public.comma-separated-values-text'],
  ics: ['text/calendar', 'com.apple.ical.ics'],
  vcf: ['text/vcard', 'public.vcard'],
  pdf: ['application/pdf', 'com.adobe.pdf'],
  svg: ['image/svg+xml', 'public.svg-image'],
} as const;

export async function shareFile(name: string, data: string | Uint8Array, kind: keyof typeof MIME, title?: string): Promise<boolean> {
  const [mimeType, UTI] = MIME[kind];
  if (Platform.OS === 'web') {
    // ссылка должна быть в документе; имя — латиницей: кириллицу в имени скачиваемого файла браузеры берут не всегда
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mimeType }));
    a.href = url;
    a.download = latin(name);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
    return true;
  }
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(data);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(f.uri, { mimeType, UTI, dialogTitle: title || name });
  return true;
}

/** Готовый файл на телефоне (PDF из печати, снимок) — «Поделиться» или открыть в другом приложении. */
export async function shareUri(uri: string, kind: keyof typeof MIME | 'image', title?: string): Promise<boolean> {
  if (Platform.OS === 'web') { window.open(uri, '_blank'); return true; }
  if (!(await Sharing.isAvailableAsync())) return false;
  const [mimeType, UTI] = kind === 'image' ? ['image/jpeg', 'public.jpeg'] : MIME[kind];
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: title });
  return true;
}

/** Имя файла без запрещённых символов. */
export const safeName = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'file';

const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
/** «Расходы-Новый-ритейл.xlsx» → «Raskhody-Novyy-riteyl.xlsx». */
export const latin = (s: string) => s.replace(/[а-яё]/gi, (ch) => { const t = TR[ch.toLowerCase()] ?? ''; return ch === ch.toLowerCase() ? t : t.charAt(0).toUpperCase() + t.slice(1); }).replace(/[^\x20-\x7e]/g, '');


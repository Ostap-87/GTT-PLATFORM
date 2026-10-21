// Фото для страниц тура и баннеров. Они крупные, поэтому лежат не в общем хранилище (в браузере у него около 5 МБ на всё),
// а отдельно: в браузере — IndexedDB, на телефоне — файлы в папке приложения. Наружу — data:URL (JPEG до 1600 px).
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';
const cache = new Map<string, string>();

const DB = 'gtt-photos';
const STORE = 'photos';
let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const dir = () => {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create();
  return d;
};

export async function putPhoto(dataUrl: string): Promise<string> {
  const id = `ph${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  cache.set(id, dataUrl);
  try {
    if (web) await idb('readwrite', (s) => s.put(dataUrl, id));
    else { const f = new File(dir(), `${id}.txt`); f.create(); f.write(dataUrl); }
  } catch { /* не сохранилось — фото останется до перезапуска */ }
  return id;
}
export async function getPhoto(id: string): Promise<string | undefined> {
  if (cache.has(id)) return cache.get(id);
  try {
    const v = web ? await idb<string | undefined>('readonly', (s) => s.get(id)) : (() => { const f = new File(dir(), `${id}.txt`); return f.exists ? f.textSync() : undefined; })();
    if (v) cache.set(id, v);
    return v;
  } catch {
    return undefined;
  }
}
export async function dropPhoto(id: string) {
  cache.delete(id);
  try {
    if (web) await idb('readwrite', (s) => s.delete(id));
    else { const f = new File(dir(), `${id}.txt`); if (f.exists) f.delete(); }
  } catch { /* нечего удалять */ }
}

/** Фото по id; пока грузится — его нет в ответе. */
export function usePhotos(ids: string[]): Record<string, string> {
  const key = ids.join(',');
  const [map, setMap] = useState<Record<string, string>>(() => Object.fromEntries(ids.flatMap((id) => (cache.has(id) ? [[id, cache.get(id)!]] : []))));
  useEffect(() => {
    let live = true;
    Promise.all(ids.map(async (id) => [id, await getPhoto(id)] as const)).then((all) => {
      if (live) setMap(Object.fromEntries(all.filter(([, v]) => v) as [string, string][]));
    });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}

/** Выбранный файл → JPEG не больше 1600 px по длинной стороне (хватает и для Stories, и для страницы). */
export async function preparePhoto(uri: string): Promise<string> {
  const img = await ImageManipulator.manipulate(uri).renderAsync();
  const big = Math.max(img.width, img.height);
  const ref = big > 1600 ? await ImageManipulator.manipulate(uri).resize(img.width >= img.height ? { width: 1600 } : { height: 1600 }).renderAsync() : img;
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}

import { inject, Injectable } from '@angular/core';
import {
  Bytes,
  collection,
  doc,
  DocumentReference,
  Firestore,
  GeoPoint,
  getDocs,
  Timestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { DocumentData } from '@firebase/firestore';

/**
 * Полный список коллекций Firestore.
 *
 * Клиентский SDK не умеет перечислять коллекции, поэтому список задан явно.
 * Помимо коллекций с обёртками AbstractCollection сюда обязательно входят
 * служебные коллекции контроля уникальности и счётчики — без них
 * восстановление разрешит дубликаты кодов, номеров и лотов.
 */
export const BACKUP_COLLECTIONS: readonly string[] = [
  'positions',
  'positionCodes',
  'supplies',
  'suppliers',
  'users',
  'userNumbers',
  'quarantineInvoices',
  'quarantineInvoiceLots',
  'quarantineQcCounters',
  'quarantineQcUserLots',
  'reserves',
  'manufacturingProduction',
  'manufacturingLots',
];

/** Версия формата файла бэкапа. Повышается при несовместимых изменениях. */
export const BACKUP_FORMAT_VERSION = 1;

/** Максимум операций в одном writeBatch Firestore. */
const BATCH_LIMIT = 500;

export interface BackupDocument {
  id: string;
  data: DocumentData;
}

export interface BackupFile {
  version: number;
  collection: string;
  exportedAt: string;
  count: number;
  documents: BackupDocument[];
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private readonly firestore = inject(Firestore);

  /**
   * Выгружает коллекцию целиком. Читает без конвертеров, чтобы сохранить
   * идентификаторы документов и исходные типы полей.
   */
  public async exportCollection(collectionName: string): Promise<BackupFile> {
    const snapshot = await getDocs(collection(this.firestore, collectionName));
    const documents = snapshot.docs.map((item) => ({
      id: item.id,
      data: encodeValue(item.data()) as DocumentData,
    }));

    return {
      version: BACKUP_FORMAT_VERSION,
      collection: collectionName,
      exportedAt: new Date().toISOString(),
      count: documents.length,
      documents,
    };
  }

  /**
   * Полностью заменяет коллекцию содержимым бэкапа: сначала удаляет все
   * существующие документы, затем записывает документы из файла с их
   * исходными идентификаторами.
   */
  public async restoreCollection(file: BackupFile): Promise<RestoreResult> {
    const collectionName = file.collection;
    const collectionRef = collection(this.firestore, collectionName);

    const existing = await getDocs(collectionRef);
    for (const chunk of splitToChunks(existing.docs, BATCH_LIMIT)) {
      const batch = writeBatch(this.firestore);
      for (const item of chunk) {
        batch.delete(item.ref);
      }
      await batch.commit();
    }

    for (const chunk of splitToChunks(file.documents, BATCH_LIMIT)) {
      const batch = writeBatch(this.firestore);
      for (const item of chunk) {
        batch.set(
          doc(collectionRef, item.id),
          decodeValue(item.data, this.firestore) as DocumentData,
        );
      }
      await batch.commit();
    }

    return {
      collection: collectionName,
      deleted: existing.size,
      written: file.documents.length,
    };
  }

  /** Считает количество документов в коллекции — для показа перед выгрузкой. */
  public async countDocuments(collectionName: string): Promise<number> {
    const snapshot = await getDocs(collection(this.firestore, collectionName));
    return snapshot.size;
  }
}

export interface RestoreResult {
  collection: string;
  deleted: number;
  written: number;
}

/**
 * Разбирает и проверяет содержимое файла бэкапа.
 * Бросает ошибку с понятным текстом, если файл не соответствует формату.
 */
export function parseBackupFile(fileName: string, content: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Файл "${fileName}" не является корректным JSON`);
  }

  const file = parsed as Partial<BackupFile>;

  if (typeof file.collection !== 'string' || !Array.isArray(file.documents)) {
    throw new Error(`Файл "${fileName}" не похож на файл бэкапа`);
  }

  if (!BACKUP_COLLECTIONS.includes(file.collection)) {
    throw new Error(`Файл "${fileName}": неизвестная коллекция "${file.collection}"`);
  }

  if (file.version !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Файл "${fileName}": версия формата ${file.version}, поддерживается ${BACKUP_FORMAT_VERSION}`,
    );
  }

  for (const item of file.documents) {
    if (typeof item?.id !== 'string' || !item.id) {
      throw new Error(`Файл "${fileName}": документ без идентификатора`);
    }
  }

  return file as BackupFile;
}

/** Имя файла для коллекции: одна коллекция — один файл. */
export function getBackupFileName(collectionName: string): string {
  return `${collectionName}.json`;
}

function splitToChunks<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Переводит значения Firestore в JSON-совместимый вид.
 * Специальные типы помечаются полем __type, чтобы их можно было восстановить.
 */
function encodeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof GeoPoint) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof DocumentReference) {
    return { __type: 'reference', path: value.path };
  }
  if (value instanceof Bytes) {
    return { __type: 'bytes', base64: value.toBase64() };
  }
  if (value instanceof Date) {
    return { __type: 'timestamp', seconds: Math.floor(value.getTime() / 1000), nanoseconds: 0 };
  }
  if (Array.isArray(value)) {
    return value.map((item) => encodeValue(item));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = encodeValue(item);
    }
    return result;
  }
  return value;
}

/** Обратное преобразование: возвращает специальным типам их классы. */
function decodeValue(value: unknown, firestore: Firestore): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => decodeValue(item, firestore));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const marked = value as Record<string, unknown>;
  switch (marked['__type']) {
    case 'timestamp':
      return new Timestamp(Number(marked['seconds']), Number(marked['nanoseconds']));
    case 'geopoint':
      return new GeoPoint(Number(marked['latitude']), Number(marked['longitude']));
    case 'bytes':
      return Bytes.fromBase64String(String(marked['base64']));
    case 'reference':
      return doc(firestore, String(marked['path']));
    default:
      break;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(marked)) {
    result[key] = decodeValue(item, firestore);
  }
  return result;
}

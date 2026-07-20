import { unzipSync, zipSync } from 'fflate';
import { BackupFile, getBackupFileName, parseBackupFile } from './backup.service';

/** Расширение архива бэкапа. */
export const BACKUP_ARCHIVE_EXTENSION = '.zip';

/**
 * Собирает архив, в котором каждая коллекция лежит отдельным JSON-файлом.
 * Сжатие не используется: JSON и так хорошо жмётся при передаче,
 * а хранение без сжатия делает архив читаемым любым инструментом.
 */
export function createBackupArchive(files: readonly BackupFile[]): Blob {
  const encoder = new TextEncoder();
  const entries: Record<string, Uint8Array> = {};

  for (const file of files) {
    entries[getBackupFileName(file.collection)] = encoder.encode(JSON.stringify(file, null, 2));
  }

  return new Blob([zipSync(entries) as BlobPart], { type: 'application/zip' });
}

/**
 * Разбирает архив бэкапа. Каждая запись проверяется тем же parseBackupFile,
 * что и отдельно выбранные JSON-файлы.
 */
export function readBackupArchive(archiveName: string, content: Uint8Array): BackupFile[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(content);
  } catch {
    throw new Error(`Файл "${archiveName}" не является корректным архивом`);
  }

  const decoder = new TextDecoder();
  const files: BackupFile[] = [];

  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.endsWith('.json')) {
      continue;
    }
    files.push(parseBackupFile(name, decoder.decode(bytes)));
  }

  if (!files.length) {
    throw new Error(`В архиве "${archiveName}" нет файлов бэкапа`);
  }

  return files;
}

/** Имя архива с датой выгрузки: backup-2026-07-19.zip */
export function getArchiveFileName(date = new Date()): string {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ];
  return `backup-${parts.join('-')}${BACKUP_ARCHIVE_EXTENSION}`;
}

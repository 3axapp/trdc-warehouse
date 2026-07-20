import { zipSync } from 'fflate';
import { createBackupArchive, getArchiveFileName, readBackupArchive } from './backup-archive';
import { BACKUP_FORMAT_VERSION, BackupFile } from './backup.service';

const makeFile = (collection: string, ids: string[]): BackupFile => ({
  version: BACKUP_FORMAT_VERSION,
  collection,
  exportedAt: '2026-07-19T00:00:00.000Z',
  count: ids.length,
  documents: ids.map((id) => ({ id, data: { name: `Документ ${id}` } })),
});

const toBytes = async (blob: Blob): Promise<Uint8Array> => new Uint8Array(await blob.arrayBuffer());

describe('backup-archive', () => {
  it('формирует ZIP-архив', async () => {
    const blob = createBackupArchive([makeFile('suppliers', ['a'])]);
    const bytes = await toBytes(blob);

    expect(blob.type).toBe('application/zip');
    // Сигнатура локального заголовка ZIP: PK\x03\x04
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('кладёт каждую коллекцию отдельным файлом и читает их обратно', async () => {
    const source = [makeFile('suppliers', ['s1', 's2']), makeFile('positions', ['p1'])];

    const restored = readBackupArchive('backup.zip', await toBytes(createBackupArchive(source)));

    expect(restored.length).toBe(2);
    expect(restored.map((file) => file.collection).sort()).toEqual(['positions', 'suppliers']);

    const suppliers = restored.find((file) => file.collection === 'suppliers')!;
    expect(suppliers.documents.map((item) => item.id)).toEqual(['s1', 's2']);
    expect(suppliers.documents[0].data['name']).toBe('Документ s1');
  });

  it('сохраняет кириллицу без потерь', async () => {
    const file = makeFile('suppliers', ['id-1']);
    file.documents[0].data = { name: 'Поставщик «Ёлка», г. Йошкар-Ола' };

    const restored = readBackupArchive('backup.zip', await toBytes(createBackupArchive([file])));

    expect(restored[0].documents[0].data['name']).toBe('Поставщик «Ёлка», г. Йошкар-Ола');
  });

  it('отклоняет файл, не являющийся архивом', () => {
    const bytes = new TextEncoder().encode('это не архив');
    expect(() => readBackupArchive('broken.zip', bytes)).toThrowError(
      /не является корректным архивом/,
    );
  });

  it('отклоняет архив без файлов бэкапа', () => {
    const bytes = zipSync({ 'readme.txt': new TextEncoder().encode('посторонний архив') });
    expect(() => readBackupArchive('empty.zip', bytes)).toThrowError(/нет файлов бэкапа/);
  });

  it('проверяет содержимое записей теми же правилами, что и отдельные файлы', async () => {
    const file = makeFile('suppliers', ['s1']);
    file.version = BACKUP_FORMAT_VERSION + 1;

    const bytes = await toBytes(createBackupArchive([file]));
    expect(() => readBackupArchive('backup.zip', bytes)).toThrowError(/версия формата/);
  });

  it('имя архива содержит дату выгрузки', () => {
    expect(getArchiveFileName(new Date(2026, 6, 19))).toBe('backup-2026-07-19.zip');
  });
});

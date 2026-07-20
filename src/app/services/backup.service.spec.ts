import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { collection, doc, Firestore, getDocs, setDoc } from '@angular/fire/firestore';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
} from '../../tests/utils';
import {
  BACKUP_COLLECTIONS,
  BACKUP_FORMAT_VERSION,
  BackupService,
  getBackupFileName,
  parseBackupFile,
} from './backup.service';

describe('BackupService', () => {
  let service: BackupService;
  let firestore: Firestore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
        provideAuthTest(),
      ],
    });
    service = TestBed.inject(BackupService);
    firestore = TestBed.inject(Firestore);
    // Тесты работают с реальными коллекциями, поэтому стартуем с пустого эмулятора
    await clearFirestoreEmulator();
    await signupAndSignin(TestBed);
  });

  afterEach(async () => {
    await signOut(TestBed);
    await clearFirestoreEmulator();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('содержит служебные коллекции уникальности', () => {
    for (const name of [
      'positionCodes',
      'userNumbers',
      'quarantineInvoiceLots',
      'quarantineQcCounters',
      'quarantineQcUserLots',
      'manufacturingLots',
    ]) {
      expect(BACKUP_COLLECTIONS).toContain(name);
    }
  });

  it('имя файла соответствует коллекции', () => {
    expect(getBackupFileName('supplies')).toBe('supplies.json');
  });

  it('выгружает документы вместе с их идентификаторами', async () => {
    await setDoc(doc(firestore, 'suppliers', 'sup-backup-1'), { name: 'Поставщик' });

    const file = await service.exportCollection('suppliers');

    expect(file.version).toBe(BACKUP_FORMAT_VERSION);
    expect(file.collection).toBe('suppliers');
    expect(file.count).toBe(1);
    expect(file.documents[0].id).toBe('sup-backup-1');
    expect(file.documents[0].data['name']).toBe('Поставщик');
  });

  it('переживает сериализацию в JSON и восстанавливает даты', async () => {
    const date = new Date('2025-06-01T10:20:30.000Z');
    await setDoc(doc(firestore, 'supplies', 'sup-1'), {
      positionId: 'pos-1',
      date,
      quantity: 5,
      usedQuantity: 0,
    });

    const exported = await service.exportCollection('supplies');
    const file = parseBackupFile('supplies.json', JSON.stringify(exported));

    await setDoc(doc(firestore, 'supplies', 'sup-1'), { positionId: 'изменено', quantity: 999 });
    await service.restoreCollection(file);

    const snapshot = await getDocs(collection(firestore, 'supplies'));
    expect(snapshot.size).toBe(1);

    const restored = snapshot.docs[0];
    expect(restored.id).toBe('sup-1');
    expect(restored.data()['positionId']).toBe('pos-1');
    expect(restored.data()['quantity']).toBe(5);
    expect(restored.data()['date'].toDate().getTime()).toBe(date.getTime());
  });

  it('удаляет документы, которых нет в бэкапе', async () => {
    await setDoc(doc(firestore, 'suppliers', 'keep'), { name: 'Останется' });
    const exported = await service.exportCollection('suppliers');

    await setDoc(doc(firestore, 'suppliers', 'extra'), { name: 'Лишний' });
    await service.restoreCollection(exported);

    const snapshot = await getDocs(collection(firestore, 'suppliers'));
    expect(snapshot.docs.map((item) => item.id)).toEqual(['keep']);
  });

  it('восстанавливает вложенные объекты и массивы', async () => {
    await setDoc(doc(firestore, 'quarantineInvoices', 'inv-1'), {
      number: '42',
      date: new Date('2025-01-02T00:00:00.000Z'),
      items: [{ positionId: 'pos-1', quantity: 3 }],
    });

    const file = parseBackupFile(
      'quarantineInvoices.json',
      JSON.stringify(await service.exportCollection('quarantineInvoices')),
    );
    await service.restoreCollection(file);

    const snapshot = await getDocs(collection(firestore, 'quarantineInvoices'));
    const data = snapshot.docs[0].data();
    expect(data['items']).toEqual([{ positionId: 'pos-1', quantity: 3 }]);
    expect(data['date'].toDate().toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('восстанавливает пустую коллекцию, очищая её', async () => {
    const empty = await service.exportCollection('manufacturingLots');
    await setDoc(doc(firestore, 'manufacturingLots', 'lot-1'), { used: true });

    const result = await service.restoreCollection(empty);

    expect(result.deleted).toBe(1);
    expect(result.written).toBe(0);
    expect((await getDocs(collection(firestore, 'manufacturingLots'))).size).toBe(0);
  });

  it('отклоняет некорректный JSON', () => {
    expect(() => parseBackupFile('broken.json', '{не json')).toThrowError(/корректным JSON/);
  });

  it('отклоняет файл без списка документов', () => {
    expect(() => parseBackupFile('x.json', '{"collection":"suppliers"}')).toThrowError(
      /не похож на файл бэкапа/,
    );
  });

  it('отклоняет неизвестную коллекцию', () => {
    const content = JSON.stringify({
      version: BACKUP_FORMAT_VERSION,
      collection: 'somethingElse',
      documents: [],
    });
    expect(() => parseBackupFile('x.json', content)).toThrowError(/неизвестная коллекция/);
  });

  it('отклоняет несовместимую версию формата', () => {
    const content = JSON.stringify({
      version: BACKUP_FORMAT_VERSION + 1,
      collection: 'suppliers',
      documents: [],
    });
    expect(() => parseBackupFile('x.json', content)).toThrowError(/версия формата/);
  });

  it('отклоняет документ без идентификатора', () => {
    const content = JSON.stringify({
      version: BACKUP_FORMAT_VERSION,
      collection: 'suppliers',
      documents: [{ data: { name: 'Без id' } }],
    });
    expect(() => parseBackupFile('x.json', content)).toThrowError(/без идентификатора/);
  });
});

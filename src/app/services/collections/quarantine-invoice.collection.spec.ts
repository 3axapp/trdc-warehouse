import {TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
} from '../../../tests/utils';
import {QuarantineInvoice, QuarantineInvoiceCollection} from './quarantine-invoice.collection';

const makeInvoice = (lot: string): Omit<QuarantineInvoice, 'id'> => ({
  date: new Date('2025-06-15T00:00:00.000Z'),
  number: 'СЧ-001',
  lot,
  supplierId: 'supplier1',
  items: [{positionId: 'pos1', quantity: 10}],
});

describe('QuarantineInvoiceCollection', () => {
  let service: QuarantineInvoiceCollection;

  beforeAll(async () => {
    await clearFirestoreEmulator();
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
        provideAuthTest(),
      ],
    });
    await signupAndSignin(TestBed);
    service = TestBed.inject(QuarantineInvoiceCollection);
  });

  afterEach(async () => await signOut(TestBed), 10000);

  it('Создание сервиса', () => {
    expect(service).toBeTruthy();
  });

  it('404', async () => {
    await expectAsync(service.get('nonexistent'))
      .toBeRejectedWithError('Document nonexistent not found');
  });

  it('Добавление счёта', async () => {
    const invoice = makeInvoice('150625-СЧ-001');
    const id = await service.add(invoice);

    const saved = await service.get(id);
    expect(saved.id).toBe(id);
    expect(saved.number).toBe('СЧ-001');
    expect(saved.lot).toBe('150625-СЧ-001');
    expect(saved.supplierId).toBe('supplier1');
    expect(saved.items).toEqual([{positionId: 'pos1', quantity: 10}]);
    expect(saved.date).toBeInstanceOf(Date);
  });

  it('Дата преобразуется из Firestore обратно в Date', async () => {
    const date = new Date('2025-06-15T00:00:00.000Z');
    const id = await service.add(makeInvoice('date-check-lot'));
    const saved = await service.get(id);
    expect(saved.date.getTime()).toBe(date.getTime());
  });

  it('Дублирование лота выбрасывает ошибку', async () => {
    await service.add(makeInvoice('duplicate-lot'));
    await expectAsync(service.add(makeInvoice('duplicate-lot')))
      .toBeRejectedWithError('Лот "duplicate-lot" уже существует');
  });

  it('Разные лоты можно добавить', async () => {
    const id1 = await service.add(makeInvoice('lot-A'));
    const id2 = await service.add(makeInvoice('lot-B'));
    expect(id1).not.toBe(id2);
  });

  it('При добавлении создаётся запись уникальности лота', async () => {
    await service.add(makeInvoice('unique-check-lot'));
    const firestore = TestBed.inject(Firestore);
    const lotRef = doc(firestore, 'quarantineInvoiceLots', 'unique-check-lot');
    const snap = await getDoc(lotRef);
    expect(snap.exists()).toBeTrue();
  });

  it('getList возвращает список, отсортированный по дате убывания', async () => {
    const id1 = await service.add({
      ...makeInvoice('list-lot-1'),
      date: new Date('2025-01-01T00:00:00.000Z'),
    });
    const id2 = await service.add({
      ...makeInvoice('list-lot-2'),
      date: new Date('2025-06-01T00:00:00.000Z'),
    });
    const list = await service.getList();
    const ids = list.map(i => i.id);
    expect(ids.indexOf(id2)).toBeLessThan(ids.indexOf(id1));
  });

  it('Архивация', async () => {
    const id = await service.add(makeInvoice('archive-lot'));
    await service.archive(id);
    const saved = await service.get(id);
    expect(saved.deleted).toBeTrue();
  });

  it('Обновление items', async () => {
    const id = await service.add(makeInvoice('update-items-lot'));
    const updatedItems = [{positionId: 'pos1', quantity: 10, usedQuantity: 5}];
    await service.update(id, {items: updatedItems});
    const saved = await service.get(id);
    expect(saved.items[0].usedQuantity).toBe(5);
  });
});

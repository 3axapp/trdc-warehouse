import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
  testUser,
  testUser2,
} from '../../tests/utils';
import { QuarantineQcService } from './quarantine-qc.service';
import {
  QuarantineInvoice,
  QuarantineInvoiceCollection,
} from './collections/quarantine-invoice.collection';
import { SuppliesCollection, QualityControlStatus } from './collections/supplies.collection';
import { Position, PositionType } from './collections/positions.collection';

const TEST_DATE = new Date(2025, 5, 15, 0, 0, 0, 0); // 15 июня 2025, локальное время
const EXPECTED_DATE_STR = [
  String(TEST_DATE.getDate()).padStart(2, '0'),
  String(TEST_DATE.getMonth() + 1).padStart(2, '0'),
  String(TEST_DATE.getFullYear()).slice(-2),
].join('');

const testPosition: Position = {
  id: 'pos-qc-1',
  code: 'AB',
  name: 'Тест позиция',
  type: PositionType.Checked,
};

// Каждый тест использует уникальный номер счёта, чтобы ключи счётчиков не пересекались
const makeInvoice = (
  lot: string,
  number = lot,
  items = [{ positionId: testPosition.id, quantity: 20 }],
): Omit<QuarantineInvoice, 'id'> => ({
  date: new Date('2025-06-01T00:00:00.000Z'),
  number,
  lot,
  supplierId: 'sup-1',
  items,
});

describe('QuarantineQcService', () => {
  let service: QuarantineQcService;
  let invoicesCollection: QuarantineInvoiceCollection;
  let suppliesCollection: SuppliesCollection;

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
    service = TestBed.inject(QuarantineQcService);
    invoicesCollection = TestBed.inject(QuarantineInvoiceCollection);
    suppliesCollection = TestBed.inject(SuppliesCollection);
  });

  afterEach(async () => await signOut(TestBed), 10000);

  it('Создание сервиса', () => {
    expect(service).toBeTruthy();
  });

  it('Создаёт поставку на складе с правильными полями', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-supply-fields'));
    const invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 5, 1);

    const expectedLot = `${testPosition.code}-${EXPECTED_DATE_STR}-lot-supply-fields-1`;
    const supplies = await suppliesCollection.getList('date', 'desc');
    const supply = supplies.find((s) => s.lot === expectedLot);

    expect(supply).toBeTruthy();
    expect(supply!.positionId).toBe(testPosition.id);
    expect(supply!.supplierId).toBe('sup-1');
    expect(supply!.quantity).toBe(5);
    expect(supply!.usedQuantity).toBe(0);
    expect(supply!.qualityControlStatus).toBe(QualityControlStatus.Completed);
    expect(supply!.qualityControlUserId).toBe(testUser.id);
  });

  it('Генерирует лот в формате КОД-ДДММГГ-НОМЕР-1 для первого КК', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-format-check'));
    const invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 3, 0);

    const supplies = await suppliesCollection.getList('date', 'desc');
    const expectedLot = `${testPosition.code}-${EXPECTED_DATE_STR}-lot-format-check-1`;
    const supply = supplies.find((s) => s.lot === expectedLot);

    expect(supply?.lot).toBe(expectedLot);
  });

  it('N не инкрементируется при повторном КК того же дня, счёта, позиции и пользователя', async () => {
    const invoiceId = await invoicesCollection.add(
      makeInvoice('lot-counter-same-user', 'lot-counter-same-user', [
        { positionId: testPosition.id, quantity: 20 },
      ]),
    );
    let invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 5, 0);
    invoice = await invoicesCollection.get(invoiceId);
    await service.processQc(invoice, 0, testPosition, TEST_DATE, 3, 0);

    const supplies = await suppliesCollection.getList('date', 'desc');
    const prefix = `${testPosition.code}-${EXPECTED_DATE_STR}-lot-counter-same-user-`;
    const lots = supplies.filter((s) => s.lot?.toString().startsWith(prefix));

    expect(lots).toHaveSize(1);
    expect(lots[0].quantity).toBe(8);
  });

  it('N инкрементируется при повторном КК того же дня, счёта, позиции и другим пользователем', async () => {
    const invoiceId = await invoicesCollection.add(
      makeInvoice('lot-counter-diff-user', 'lot-counter-diff-user', [
        { positionId: testPosition.id, quantity: 20 },
      ]),
    );
    let invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 5, 0);
    invoice = await invoicesCollection.get(invoiceId);
    await signOut(TestBed);
    await signupAndSignin(TestBed, testUser2);
    await service.processQc(invoice, 0, testPosition, TEST_DATE, 3, 0);

    const prefix = `${testPosition.code}-${EXPECTED_DATE_STR}-lot-counter-diff-user-`;
    const supplies = await suppliesCollection.getList('date', 'desc');
    const lots = supplies.map((s) => s.lot?.toString()).filter((s) => s?.startsWith(prefix));

    expect(lots).toHaveSize(2);
    expect(lots).toContain(`${prefix}1`);
    expect(lots).toContain(`${prefix}2`);
  });

  it('Обновляет usedQuantity позиции в счёте', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-used-qty'));
    const invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 7, 2);

    const updated = await invoicesCollection.get(invoiceId);
    expect(updated.items[0].usedQuantity).toBe(9); // 7 принятых + 2 брака
  });

  it('Накапливает usedQuantity и brokenQuantity при повторных КК', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-accumulate-qty'));
    let invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 5, 1);
    invoice = await invoicesCollection.get(invoiceId);
    await service.processQc(invoice, 0, testPosition, TEST_DATE, 4, 2);

    const updated = await invoicesCollection.get(invoiceId);
    expect(updated.items[0].usedQuantity).toBe(12); // (5+1) + (4+2)
    expect(updated.items[0].brokenQuantity).toBe(3); // (5+1) + (4+2)
  });

  it('Не обновляет другие позиции счёта', async () => {
    const invoiceId = await invoicesCollection.add(
      makeInvoice('lot-multi-items', 'lot-multi-items', [
        { positionId: testPosition.id, quantity: 20 },
        { positionId: 'other-pos', quantity: 15 },
      ]),
    );
    const invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 5, 0);

    const updated = await invoicesCollection.get(invoiceId);
    expect(updated.items[1].usedQuantity).toBeUndefined();
    expect(updated.items[1].quantity).toBe(15);
  });

  it('Выбрасывает ошибку если quantity < 0', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-invalid-neg'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(
      service.processQc(invoice, 0, testPosition, TEST_DATE, -1, 0),
    ).toBeRejectedWithError('Неверное количество');
  });

  it('Выбрасывает ошибку если quantity и brokenQuantity оба 0', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-both-zero'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(
      service.processQc(invoice, 0, testPosition, TEST_DATE, 0, 0),
    ).toBeRejectedWithError('Неверное количество');
  });

  it('Допускает quantity = 0 при brokenQuantity > 0', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-zero-qty-with-broken'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(service.processQc(invoice, 0, testPosition, TEST_DATE, 0, 5)).toBeResolved();

    const updated = await invoicesCollection.get(invoiceId);
    expect(updated.items[0].usedQuantity).toBe(5);
    expect(updated.items[0].brokenQuantity).toBe(5);
  });

  it('Выбрасывает ошибку если brokenQuantity < 0', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-invalid-broken'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(
      service.processQc(invoice, 0, testPosition, TEST_DATE, 5, -1),
    ).toBeRejectedWithError('Неверное количество');
  });

  it('Выбрасывает ошибку если quantity + brokenQuantity > доступного остатка', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-over-limit'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(
      service.processQc(invoice, 0, testPosition, TEST_DATE, 15, 10),
    ).toBeRejectedWithError('Неверное количество');
  });

  it('Выбрасывает ошибку если остаток исчерпан', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-exhausted'));
    let invoice = await invoicesCollection.get(invoiceId);

    await service.processQc(invoice, 0, testPosition, TEST_DATE, 20, 0);
    invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(
      service.processQc(invoice, 0, testPosition, TEST_DATE, 1, 0),
    ).toBeRejectedWithError('Неверное количество');
  });

  it('Допускает brokenQuantity = 0', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-zero-broken'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(service.processQc(invoice, 0, testPosition, TEST_DATE, 10, 0)).toBeResolved();
  });

  it('quantity + brokenQuantity = доступный остаток - валидно', async () => {
    const invoiceId = await invoicesCollection.add(makeInvoice('lot-exact-limit'));
    const invoice = await invoicesCollection.get(invoiceId);

    await expectAsync(service.processQc(invoice, 0, testPosition, TEST_DATE, 12, 8)).toBeResolved();

    const updated = await invoicesCollection.get(invoiceId);
    expect(updated.items[0].usedQuantity).toBe(20);
  });
});

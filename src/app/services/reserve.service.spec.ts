import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
} from '../../tests/utils';
import { ReserveService } from './reserve.service';
import { ReserveCollection } from './collections/reserve.collection';
import { PositionsCollection, PositionType } from './collections/positions.collection';
import { QualityControlStatus, SuppliesCollection } from './collections/supplies.collection';
import { chipRecipe } from '../recipes';

describe('ReserveService', () => {
  let service: ReserveService;
  let suppliesCollection: SuppliesCollection;
  let reserveCollection: ReserveCollection;
  let positionIds: Record<string, string>;

  const chipCodes = ['КО', 'МБ', 'НК', 'ВК', 'КЛ'];

  beforeEach(async () => {
    await clearFirestoreEmulator();

    // chipRecipe — это изменяемый синглтон; сбрасываем ID перед каждым тестом,
    // чтобы ensureRecipeLoaded() заново разрешил позиции из свежей БД
    chipRecipe.id = undefined;
    for (const item of chipRecipe.items) {
      item.id = undefined;
    }

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
        provideAuthTest(),
      ],
    });

    await signupAndSignin(TestBed);

    service = TestBed.inject(ReserveService);
    suppliesCollection = TestBed.inject(SuppliesCollection);
    reserveCollection = TestBed.inject(ReserveCollection);

    const positionsCollection = TestBed.inject(PositionsCollection);
    positionIds = {};
    positionIds['chip'] = await positionsCollection.add({
      code: 'chip',
      name: 'Чип',
      type: PositionType.Produced,
    });
    for (const code of chipCodes) {
      positionIds[code] = await positionsCollection.add({
        code,
        name: code,
        type: PositionType.Checked,
      });
    }
  });

  afterEach(async () => await signOut(TestBed));

  async function addSupply(
    code: string,
    quantity: number,
    usedQuantity = 0,
    lot = 1,
    date = new Date('2025-01-01'),
  ): Promise<string> {
    return suppliesCollection.add({
      positionId: positionIds[code],
      date,
      quantity,
      usedQuantity,
      qualityControlStatus: QualityControlStatus.Completed,
      lot,
    });
  }

  async function addAllMaterials(
    quantity: number,
    usedQuantity = 0,
  ): Promise<Record<string, string>> {
    const ids: Record<string, string> = {};
    for (const code of chipCodes) {
      ids[code] = await addSupply(code, quantity, usedQuantity);
    }
    return ids;
  }

  it('создаётся', () => {
    expect(service).toBeTruthy();
  });

  describe('getMaxQuantity', () => {
    it('возвращает 0 если материалы не поставлены', async () => {
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(0);
    });

    it('возвращает доступное количество при наличии всех материалов', async () => {
      await addAllMaterials(5);
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(5);
    });

    it('ограничивается материалом с наименьшим остатком', async () => {
      for (const code of chipCodes) {
        await addSupply(code, code === 'КО' ? 2 : 10);
      }
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(2);
    });

    it('ограничивается первой поставкой', async () => {
      for (const code of chipCodes) {
        await addSupply(code, 10, 0, 1, new Date('2025-02-01'));
      }
      for (const code of chipCodes) {
        await addSupply(code, 20, 0, 2, new Date('2025-01-02'));
      }
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(20);
    });

    it('учитывает уже использованное количество', async () => {
      await addAllMaterials(5, 3); // доступно: 5 - 3 = 2
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(2);
    });

    it('игнорирует поставки без завершённого КК', async () => {
      for (const code of chipCodes) {
        await suppliesCollection.add({
          positionId: positionIds[code],
          date: new Date('2025-01-01'),
          quantity: 10,
          usedQuantity: 0,
          // qualityControlStatus намеренно не задан
        });
      }
      const result = await service.getMaxQuantity();
      expect(result.available).toBe(0);
    });
  });

  describe('createReserve', () => {
    it('выбрасывает ошибку при quantity = 0', async () => {
      await addAllMaterials(5);
      await expectAsync(service.createReserve(0)).toBeRejectedWithError(/Неправильное количество/);
    });

    it('выбрасывает ошибку при quantity < 0', async () => {
      await addAllMaterials(5);
      await expectAsync(service.createReserve(-1)).toBeRejectedWithError(/Неправильное количество/);
    });

    it('выбрасывает ошибку если quantity превышает доступное', async () => {
      await addAllMaterials(3);
      await expectAsync(service.createReserve(4)).toBeRejectedWithError(
        'Неправильное количество. Максимум 3',
      );
    });

    it('выбрасывает ошибку если quantity превышает доступное по первому набору', async () => {
      for (const code of chipCodes) {
        await addSupply(code, 10, 0, 1, new Date('2025-02-01'));
      }
      for (const code of chipCodes) {
        await addSupply(code, 20, 0, 2, new Date('2025-01-02'));
      }

      await expectAsync(service.createReserve(30)).toBeRejectedWithError(
        'Ошибка: резервируется для нескольких лотов, а разрешено резервировать только для одного за раз',
      );
    });

    it('создаёт документ резерва с правильным количеством', async () => {
      await addAllMaterials(5);
      await service.createReserve(3);
      const reserves = await reserveCollection.getList();
      expect(reserves.length).toBe(1);
      expect(reserves[0].quantity).toBe(3);
    });

    it('резерв содержит записи для всех 5 материалов', async () => {
      await addAllMaterials(5);
      await service.createReserve(2);
      const [reserve] = await reserveCollection.getList();
      const reservedPositionIds = reserve.items.map((i) => i.positionId);
      for (const code of chipCodes) {
        expect(reservedPositionIds).toContain(positionIds[code]);
      }
    });

    it('записывает правильное количество в каждую позицию резерва', async () => {
      await addAllMaterials(5);
      await service.createReserve(2);
      const [reserve] = await reserveCollection.getList();
      for (const item of reserve.items) {
        expect(item.quantity).toBe(2);
      }
    });

    it('записывает supplyId и lot в items резерва', async () => {
      const supplyIds = await addAllMaterials(5); // lot = 1 по умолчанию
      await service.createReserve(1);
      const [reserve] = await reserveCollection.getList();
      for (const item of reserve.items) {
        const code = chipCodes.find((c) => positionIds[c] === item.positionId)!;
        expect(item.supplyId).toBe(supplyIds[code]);
        expect(item.lot).toBe(1);
      }
    });

    it('увеличивает usedQuantity в поставках', async () => {
      const supplyIds = await addAllMaterials(5);
      await service.createReserve(3);
      const allSupplies = await suppliesCollection.getList();
      const usedBySupplyId: Record<string, number> = {};
      for (const s of allSupplies) {
        usedBySupplyId[s.id] = s.usedQuantity;
      }
      for (const id of Object.values(supplyIds)) {
        expect(usedBySupplyId[id]).toBe(3);
      }
    });

    it('не превышает доступное количество при бронировании', async () => {
      await addAllMaterials(3);
      await service.createReserve(3);
      await expectAsync(service.createReserve(1)).toBeRejectedWithError(/Неправильное количество/);
    });

    it('игнорирует поставки без завершённого КК', async () => {
      // КО без КК
      await suppliesCollection.add({
        positionId: positionIds['КО'],
        date: new Date('2025-01-01'),
        quantity: 10,
        usedQuantity: 0,
      });
      for (const code of chipCodes.filter((c) => c !== 'КО')) {
        await addSupply(code, 10);
      }
      await expectAsync(service.createReserve(1)).toBeRejectedWithError(/Неправильное количество/);
    });

    it('не включает удалённые поставки', async () => {
      const deletedId = await suppliesCollection.add({
        positionId: positionIds['КО'],
        date: new Date('2025-01-01'),
        quantity: 10,
        usedQuantity: 0,
        qualityControlStatus: QualityControlStatus.Completed,
        lot: 1,
        deleted: true,
      });
      for (const code of chipCodes.filter((c) => c !== 'КО')) {
        await addSupply(code, 10);
      }
      await expectAsync(service.createReserve(1)).toBeRejectedWithError(/Неправильное количество/);
      // Проверяем, что usedQuantity удалённой поставки не изменился
      const supply = await suppliesCollection.get(deletedId);
      expect(supply.usedQuantity).toBe(0);
    });
  });
});

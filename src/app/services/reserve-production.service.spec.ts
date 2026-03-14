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
import { ConfirmProductionData, ReserveProductionService } from './reserve-production.service';
import { Reserve, ReserveCollection } from './collections/reserve.collection';
import { PositionsCollection, PositionType } from './collections/positions.collection';
import { QualityControlStatus, SuppliesCollection } from './collections/supplies.collection';
import { chipRecipe } from '../recipes';
import { User } from './collections/users.collection';

describe('ReserveProductionService', () => {
  let service: ReserveProductionService;
  let reserveService: ReserveService;
  let suppliesCollection: SuppliesCollection;
  let reserveCollection: ReserveCollection;
  let positionIds: Record<string, string>;

  const chipCodes = ['КО', 'МБ', 'НК', 'ВК', 'КЛ'];
  const testUser: User = {
    id: 'test-executor',
    email: 'test@test.com',
    fullName: 'Test User',
    position: 'Тестовая должность',
    number: 1,
  };
  const productionDate = new Date('2025-06-01');

  beforeEach(async () => {
    await clearFirestoreEmulator();

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

    service = TestBed.inject(ReserveProductionService);
    reserveService = TestBed.inject(ReserveService);
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

  async function addAllMaterials(quantity: number, usedQuantity = 0): Promise<void> {
    for (const code of chipCodes) {
      await suppliesCollection.add({
        positionId: positionIds[code],
        date: new Date('2025-01-01'),
        quantity,
        usedQuantity,
        qualityControlStatus: QualityControlStatus.Completed,
        lot: 1,
      });
    }
  }

  async function createReserveAndGet(quantity: number): Promise<Reserve> {
    await reserveService.createReserve(quantity);
    const reserves = await reserveCollection.getList();
    return reserves[reserves.length - 1];
  }

  function makeConfirmData(
    producedQuantity: number,
    brokenQuantities: Record<string, number> = {},
  ): ConfirmProductionData {
    return { producedQuantity, date: productionDate, brokenQuantities };
  }

  async function getUpdatedReserve(reserveId: string): Promise<Reserve> {
    return reserveCollection.get(reserveId);
  }

  it('создаётся', () => {
    expect(service).toBeTruthy();
  });

  describe('getNextMaxQuantity', () => {
    it('возвращает количество для нового резерва', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(5);
      expect(service.getNextMaxQuantity(reserve)).toBe(5);
    });

    it('учитывает уже использованное количество', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(5);
      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.getNextMaxQuantity(updated)).toBe(3);
    });

    it('учитывает испорченное количество', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(5);
      const brokenQuantities: Record<string, number> = {};
      for (const item of reserve.items) {
        brokenQuantities[item.positionId] = 1;
      }
      await service.confirmProduction(
        reserve.id,
        makeConfirmData(2, brokenQuantities),
        testUser,
      );
      const updated = await getUpdatedReserve(reserve.id);
      // reserved=5, used=2, broken=1 → remaining=2
      expect(service.getNextMaxQuantity(updated)).toBe(2);
    });

    it('возвращает 0 когда всё использовано', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(3), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.getNextMaxQuantity(updated)).toBe(0);
    });
  });

  describe('canProductionConfirmed', () => {
    it('возвращает true для нового резерва', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      expect(service.canProductionConfirmed(reserve)).toBeTrue();
    });

    it('возвращает false когда всё использовано', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.canProductionConfirmed(updated)).toBeFalse();
    });

    it('возвращает true когда есть остаток для производства', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.canProductionConfirmed(updated)).toBeTrue();
    });
  });

  describe('canReturnRemainder', () => {
    it('возвращает true для нового резерва (ничего не использовано)', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      expect(service.canReturnRemainder(reserve)).toBeTrue();
    });

    it('возвращает false когда всё использовано', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.canReturnRemainder(updated)).toBeFalse();
    });

    it('возвращает true когда есть остаток после производства', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const updated = await getUpdatedReserve(reserve.id);
      expect(service.canReturnRemainder(updated)).toBeTrue();
    });

    it('возвращает false после полного возврата', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);
      await service.returnRemainder(confirmed);
      const returned = await getUpdatedReserve(reserve.id);
      expect(service.canReturnRemainder(returned)).toBeFalse();
    });
  });

  describe('confirmProduction', () => {
    it('выбрасывает ошибку если не указано ни произведённое ни испорченное количество', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      await expectAsync(
        service.confirmProduction(reserve.id, makeConfirmData(0), testUser),
      ).toBeRejectedWithError(/Необходимо указать или произведенное количество или испорченное/);
    });

    it('выбрасывает ошибку если использовано + испорчено > зарезервировано', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      const brokenQuantities: Record<string, number> = {};
      for (const item of reserve.items) {
        brokenQuantities[item.positionId] = 5;
      }
      await expectAsync(
        service.confirmProduction(
          reserve.id,
          makeConfirmData(1, brokenQuantities),
          testUser,
        ),
      ).toBeRejectedWithError(/Превышено количество/);
    });

    it('создаёт поставку чипов', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);

      const allSupplies = await suppliesCollection.getList();
      const chipSupply = allSupplies.find((s) => s.positionId === positionIds['chip']);
      expect(chipSupply).toBeTruthy();
      expect(chipSupply!.quantity).toBe(1);
    });

    it('обновляет usedQuantity в резерве', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);

      const updated = await getUpdatedReserve(reserve.id);
      for (const item of updated.items) {
        expect(item.usedQuantity).toBe(2);
      }
    });

    it('обновляет producedQuantity в резерве', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(2);
      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);

      const updated = await getUpdatedReserve(reserve.id);
      expect(updated.producedQuantity).toBe(2);
    });

    it('поддерживает инкрементальное производство', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);

      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const after1 = await getUpdatedReserve(reserve.id);
      expect(after1.producedQuantity).toBe(1);
      for (const item of after1.items) {
        expect(item.usedQuantity).toBe(1);
      }

      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);
      const after2 = await getUpdatedReserve(reserve.id);
      expect(after2.producedQuantity).toBe(3);
      for (const item of after2.items) {
        expect(item.usedQuantity).toBe(3);
      }
    });

    it('увеличивает количество чипов при повторном производстве с тем же лотом', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);

      const allSupplies = await suppliesCollection.getList();
      const chipSupply = allSupplies.find((s) => s.positionId === positionIds['chip']);
      expect(chipSupply!.quantity).toBe(3);
    });

    it('учитывает брак при валидации максимального количества', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(5);
      // Первое производство: 2 чипа
      await service.confirmProduction(reserve.id, makeConfirmData(2), testUser);
      // Второе производство: запрашиваем 4, но max = 5-2 = 3
      await expectAsync(
        service.confirmProduction(reserve.id, makeConfirmData(4), testUser),
      ).toBeRejectedWithError(/Максимальное количество с учетом испорченного: 3/);
    });

    it('позволяет указать только испорченное без произведённого', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      const brokenQuantities: Record<string, number> = {};
      for (const item of reserve.items) {
        brokenQuantities[item.positionId] = 1;
      }
      await service.confirmProduction(
        reserve.id,
        makeConfirmData(0, brokenQuantities),
        testUser,
      );

      const updated = await getUpdatedReserve(reserve.id);
      expect(updated.producedQuantity).toBe(0);
      for (const item of updated.items) {
        expect(item.usedQuantity).toBe(0);
      }
      // Проверяем что brokenQuantity учтён в getNextMaxQuantity
      expect(service.getNextMaxQuantity(updated)).toBe(2);
    });
  });

  describe('returnRemainder', () => {
    it('выбрасывает ошибку если нечего возвращать', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(1);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);
      await expectAsync(service.returnRemainder(confirmed)).toBeRejectedWithError(
        /Нечего возвращать/,
      );
    });

    it('уменьшает usedQuantity в поставках', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);
      await service.returnRemainder(confirmed);

      // Поставки: изначально usedQuantity=3 (из резерва), после возврата 2 → usedQuantity=1
      const allSupplies = await suppliesCollection.getList();
      for (const code of chipCodes) {
        const supply = allSupplies.find((s) => s.positionId === positionIds[code]);
        expect(supply!.usedQuantity).toBe(1);
      }
    });

    it('записывает returnedQuantity в элементы резерва', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);
      await service.returnRemainder(confirmed);

      const updated = await getUpdatedReserve(reserve.id);
      for (const item of updated.items) {
        // reserved=3, used=1, broken=0 → returned=2
        expect(item.returnedQuantity).toBe(2);
      }
    });

    it('не изменяет поставки если всё использовано', async () => {
      await addAllMaterials(3);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(3), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);

      await expectAsync(service.returnRemainder(confirmed)).toBeRejectedWithError(
        /Нечего возвращать/,
      );

      const allSupplies = await suppliesCollection.getList();
      for (const code of chipCodes) {
        const supply = allSupplies.find((s) => s.positionId === positionIds[code]);
        expect(supply!.usedQuantity).toBe(3);
      }
    });

    it('повторный возврат невозможен', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(3);
      await service.confirmProduction(reserve.id, makeConfirmData(1), testUser);
      const confirmed = await getUpdatedReserve(reserve.id);
      await service.returnRemainder(confirmed);

      const returned = await getUpdatedReserve(reserve.id);
      await expectAsync(service.returnRemainder(returned)).toBeRejectedWithError(
        /Нечего возвращать/,
      );
    });

    it('корректно работает с частичным возвратом после брака', async () => {
      await addAllMaterials(5);
      const reserve = await createReserveAndGet(5);
      const brokenQuantities: Record<string, number> = {};
      for (const item of reserve.items) {
        brokenQuantities[item.positionId] = 2;
      }
      await service.confirmProduction(
        reserve.id,
        makeConfirmData(1, brokenQuantities),
        testUser,
      );
      const confirmed = await getUpdatedReserve(reserve.id);
      // reserved=5, used=1, broken=2 → remainder=2
      await service.returnRemainder(confirmed);

      const updated = await getUpdatedReserve(reserve.id);
      for (const item of updated.items) {
        expect(item.returnedQuantity).toBe(2);
      }

      const allSupplies = await suppliesCollection.getList();
      for (const code of chipCodes) {
        const supply = allSupplies.find((s) => s.positionId === positionIds[code]);
        // usedQuantity: начальное 5 (из резерва) - 2 (возврат) = 3
        expect(supply!.usedQuantity).toBe(3);
      }
    });
  });
});

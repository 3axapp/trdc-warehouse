import {TestBed} from '@angular/core/testing';

import {ApproveData, QualityControlService} from './quality-control.service';
import {clearFirestoreEmulator, provideAuthTest, provideFirebaseAppTest, provideFirestoreTest} from '../../tests/utils';
import {provideZonelessChangeDetection} from '@angular/core';
import {Firestore} from '@angular/fire/firestore';
import {AuthService} from './auth.service';
import {Auth} from '@angular/fire/auth';
import {PositionsService, PositionType} from './positions.service';
import {QualityControlStatus, SuppliesService, Supply} from './supplies.service';

describe('QualityControlService', () => {
  let service: QualityControlService;
  let firestore: Firestore;
  let userId: string;
  let position1Id: string;
  let position2Id: string;
  let supplies: SuppliesService;

  const TEST_USER = 'test@unit.email';

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
    firestore = TestBed.inject(Firestore);
    supplies = TestBed.inject(SuppliesService);
    service = TestBed.inject(QualityControlService);

    if (!userId) {
      const auth = TestBed.inject(Auth);
      const authService = TestBed.inject(AuthService);
      try {
        await authService.register(TEST_USER, TEST_USER);
      } catch (error) {
        if ((error as any)?.code !== 'auth/email-already-in-use') {
          throw error;
        }
      }
      await authService.login(TEST_USER, TEST_USER);
      userId = auth.currentUser!.uid;
    }
    if (!position1Id) {
      const positions = TestBed.inject(PositionsService);
      position1Id = await positions.add(
        {code: 'quality_control_position', name: 'quality_control_position', type: PositionType.Checked},
      );
      position2Id = await positions.add(
        {code: 'quality_control_position2', name: 'quality_control_position2', type: PositionType.Checked},
      );
    }
  });

  it('Создание сервиса', () => {
    expect(service).toBeTruthy();
  });

  it('Завершение проверки', async () => {
    const id = await supplies.add({
      positionId: position1Id,
      supplierId: 'supplierId',
      quantity: 10,
      brokenQuantity: 0,
      usedQuantity: 0,
      date: new Date('2025-01-01 00:00:10'),
    });
    const supply = await supplies.get(id);
    expect(supply.qualityControlDate).toBeFalsy();
    expect(supply.qualityControlUserId).toBeFalsy();
    expect(supply.qualityControlStatus).toBeFalsy();

    await service.approve(supply, {
      qualityControlDate: new Date('2025-01-01 00:10:00'),
      brokenQuantity: 1,
      lot: 1,
    });
    await expectAsync(supplies.get(id)).toBeResolvedTo({
      id,
      positionId: position1Id,
      supplierId: 'supplierId',
      quantity: 10,
      usedQuantity: 0,
      date: new Date('2025-01-01 00:00:10'),
      qualityControlDate: new Date('2025-01-01 00:10:00'),
      brokenQuantity: 1,
      lot: 1,
      qualityControlStatus: QualityControlStatus.Completed,
      qualityControlUserId: userId,
    });
  });

  it('Уникальность лота', async () => {
    const firstSupplyId = await supplies.add({
      positionId: position1Id,
      supplierId: 'supplierId',
      quantity: 20,
      brokenQuantity: 0,
      usedQuantity: 0,
      date: new Date('2025-01-01 00:00:20'),
    });
    const firstSupply = await supplies.get(firstSupplyId);
    await service.approve(firstSupply, {
      qualityControlDate: new Date('2025-01-01 00:20:00'),
      brokenQuantity: 1,
      lot: 2,
    });

    const secondSupplyId = await supplies.add({
      positionId: position1Id,
      supplierId: 'supplierId',
      quantity: 20,
      brokenQuantity: 0,
      usedQuantity: 0,
      date: new Date('2025-01-01 00:00:20'),
    });
    const secondSupply = await supplies.get(secondSupplyId);
    await expectAsync(service.approve(secondSupply, {
      qualityControlDate: new Date('2025-01-01 00:20:00'),
      brokenQuantity: 0,
      lot: 2,
    })).toBeRejectedWithError('Лот поставки позиции не уникален');

    const firstSupplySecondPositionId = await supplies.add({
      positionId: position2Id,
      supplierId: 'supplierId',
      quantity: 20,
      brokenQuantity: 0,
      usedQuantity: 0,
      date: new Date('2025-01-01 00:00:20'),
    });
    let firstSupplySecondPosition = await supplies.get(firstSupplySecondPositionId);
    await service.approve(firstSupplySecondPosition, {
      qualityControlDate: new Date('2025-01-01 00:20:00'),
      brokenQuantity: 1,
      lot: 2,
    });
    firstSupplySecondPosition = await supplies.get(firstSupplySecondPositionId);
    expect(firstSupplySecondPosition.qualityControlStatus).toEqual(QualityControlStatus.Completed);
    expect(firstSupplySecondPosition.qualityControlDate).toEqual(new Date('2025-01-01 00:20:00'));
    expect(firstSupplySecondPosition.brokenQuantity).toEqual(1);
    expect(firstSupplySecondPosition.lot).toEqual(2);
    expect(firstSupplySecondPosition.qualityControlUserId).toEqual(userId);
  });

  it('Количестыо брака', async () => {
    const supply = {quantity: 10} as Supply;
    const error = 'Неправильно количество брака';
    await expectAsync(service.approve(supply, {brokenQuantity: 20} as ApproveData)).toBeRejectedWithError(error);
    await expectAsync(service.approve(supply, {brokenQuantity: -20} as ApproveData)).toBeRejectedWithError(error);
    await expectAsync(service.approve(supply, {} as ApproveData)).toBeRejectedWithError(error);
  });
});

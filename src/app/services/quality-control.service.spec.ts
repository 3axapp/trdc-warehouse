import {TestBed} from '@angular/core/testing';

import {ApproveData, QualityControlService} from './quality-control.service';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
  testUser,
} from '../../tests/utils';
import {provideZonelessChangeDetection} from '@angular/core';
import {Firestore} from '@angular/fire/firestore';
import {PositionsCollection, PositionType} from './collections/positions.collection';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';

describe('QualityControlService', () => {
  let service: QualityControlService;
  let firestore: Firestore;
  let position1Id: string;
  let supplies: SuppliesCollection;

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

    firestore = TestBed.inject(Firestore);
    supplies = TestBed.inject(SuppliesCollection);
    service = TestBed.inject(QualityControlService);

    if (!position1Id) {
      const positions = TestBed.inject(PositionsCollection);
      position1Id = await positions.add(
        {code: 'quality_control_position', name: 'quality_control_position', type: PositionType.Checked},
      );
    }
  });

  afterEach(async () => await signOut(TestBed));

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
      qualityControlStatus: QualityControlStatus.Completed,
      qualityControlUserId: testUser.id,
    });
  });

  it('Количество брака', async () => {
    const supply = {quantity: 10} as Supply;
    const error = 'Неправильно количество брака';
    await expectAsync(service.approve(supply, {brokenQuantity: 20} as ApproveData)).toBeRejectedWithError(error);
    await expectAsync(service.approve(supply, {brokenQuantity: -20} as ApproveData)).toBeRejectedWithError(error);
    await expectAsync(service.approve(supply, {} as ApproveData)).toBeRejectedWithError(error);
  });
});

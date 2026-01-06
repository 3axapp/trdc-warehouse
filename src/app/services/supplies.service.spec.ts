import {TestBed} from '@angular/core/testing';
import {SuppliesService} from './supplies.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../tests/utils';

describe('SuppliesService', () => {
  let service: SuppliesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(SuppliesService);
  });

  it('Создание сервиса', () => {
    expect(service).toBeTruthy();
  });

  it('Добавление записи', async () => {
    const id = await service.add({
      positionId: 'positionId',
      date: new Date('2025-01-01 00:00:00'),
      quantity: 12,
      brokenQuantity: 0,
      usedQuantity: 0,
      qualityControlDate: new Date('2025-01-01 00:01:00'),
    });
    await expectAsync(service.get(id)).toBeResolvedTo({
      id,
      positionId: 'positionId',
      date: new Date('2025-01-01 00:00:00'),
      quantity: 12,
      brokenQuantity: 0,
      usedQuantity: 0,
      qualityControlDate: new Date('2025-01-01 00:01:00'),
    });
  });
});

import {TestBed} from '@angular/core/testing';

import {ManufacturingService, Receipt} from './manufacturing.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {Position, PositionsService, PositionType} from './positions.service';
import {QualityControlStatus, SuppliesService, Supply} from './supplies.service';

describe('ManufacturingService', () => {
  let service: ManufacturingService;
  let mockPositionsService: jasmine.SpyObj<PositionsService>;
  let mockSuppliesService: jasmine.SpyObj<SuppliesService>;

  let mockPositions: Position[];
  let receipt: Receipt;
  let nextId: number;

  beforeEach(() => {
    const positionsSpy = jasmine.createSpyObj<PositionsService>('PositionsService', ['getList']);
    const suppliesSpy = jasmine.createSpyObj<SuppliesService>('SuppliesService', ['getList', 'add', 'update']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: PositionsService, useValue: positionsSpy},
        {provide: SuppliesService, useValue: suppliesSpy},
      ],
    });
    service = TestBed.inject(ManufacturingService);
    mockPositionsService = TestBed.inject(PositionsService) as jasmine.SpyObj<PositionsService>;
    mockSuppliesService = TestBed.inject(SuppliesService) as jasmine.SpyObj<SuppliesService>;
    nextId = 5;
    mockPositions = [
      {id: '1', code: 'P001', name: 'Position 1', type: PositionType.Produced},
      {id: '2', code: 'P002', name: 'Position 2', type: PositionType.Checked},
      {id: '3', code: 'P003', name: 'Position 3', type: PositionType.Checked},
      {id: '4', code: 'P004', name: 'Position 4', type: PositionType.Checked},
    ];
    receipt = {
      code: 'P001',
      items: [
        {code: 'P002', quantity: 3},
        {code: 'P004', quantity: 1},
        {code: 'P003', quantity: 2},
      ],
    };
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Товар поставлен, но не проверен', async () => {
    const mockSupplies: Supply[] = [
      {
        id: '11', positionId: '2', quantity: 10,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 0,
        usedQuantity: 0,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '13', positionId: '2', quantity: 10,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 3,
        usedQuantity: 2,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '12', positionId: '3', quantity: 7,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 0,
        usedQuantity: 0,
      },
    ];

    mockPositionsService.getList.and.resolveTo(mockPositions);
    mockSuppliesService.getList.and.resolveTo(mockSupplies);

    const result = await service.getAvailability(receipt);

    expect(mockPositionsService.getList).toHaveBeenCalled();
    expect(mockSuppliesService.getList).toHaveBeenCalled();

    expect(receipt.id).toEqual('1');
    expect(receipt.items[0].id).toEqual('2');
    expect(receipt.items[1].id).toEqual('4');
    expect(receipt.items[2].id).toEqual('3');

    expect(result).toEqual({
      available: 0, supplies: {
        '2': {
          quantity: 15,
          type: PositionType.Checked,
          supplies: [
            mockSupplies[0],
            mockSupplies[1],
          ],
        },
        '3': {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
        '4': {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
      }, message: 'Материал P004 не поставлен',
    });
  });

  it('Товар поставлен, и проверен', async () => {
    const mockSupplies: Supply[] = [
      {
        id: '11', positionId: '2', quantity: 10,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 0,
        usedQuantity: 0,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '12', positionId: '2', quantity: 10,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 3,
        usedQuantity: 2,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '13', positionId: '3', quantity: 9,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 0,
        usedQuantity: 0,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '14', positionId: '4', quantity: 9,
        date: new Date(),
        supplierId: "",
        brokenQuantity: 0,
        usedQuantity: 0,
        qualityControlStatus: QualityControlStatus.Completed,
      },
    ];

    mockPositionsService.getList.and.resolveTo(mockPositions);
    mockSuppliesService.getList.and.resolveTo(mockSupplies);
    mockSuppliesService.add.and.callFake(async (item: Supply) => {
      item.id = String(nextId++);
      mockSupplies.push(item);
      return item.id;
    });
    mockSuppliesService.update.and.callFake(async () => {
    });

    const result = await service.getAvailability(receipt);

    expect(mockPositionsService.getList).toHaveBeenCalled();
    expect(mockSuppliesService.getList).toHaveBeenCalled();
    expect(result.available).toEqual(4);

    await service.create(receipt, result, {executorId: "1", quantity: 1});
    const newLot = mockSupplies.find(i => i.id === '5');
    expect(newLot).toEqual({
      id: '5', positionId: '1', quantity: 1,
      date: newLot?.date,
      brokenQuantity: 0,
      usedQuantity: 0,
      lot: 1,
    } as any);
    // await service.create(receipt, result, {executorId: "1", quantity: 30});
  });


});

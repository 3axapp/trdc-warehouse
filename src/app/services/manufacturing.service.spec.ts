import {TestBed} from '@angular/core/testing';
import {ManufacturingService, Recipe} from './manufacturing.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {PositionsCollection, PositionType} from './collections/positions.collection';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';
import {clearFirestoreEmulator, provideFirebaseAppTest, provideFirestoreTest} from '../../tests/utils';
import {doc, Firestore, getDoc} from '@angular/fire/firestore';
import {ManufacturingProductionCollection} from './collections/manufacturing-production.collection';

describe('ManufacturingService', () => {
  let service: ManufacturingService;
  let suppliesCollection: SuppliesCollection;
  let manufacturingProductionCollection: ManufacturingProductionCollection;
  let receipt: Recipe;
  let firestore: any;
  const positions = [
    {id: '', code: 'P001', name: 'Position 1', type: PositionType.Produced},
    {id: '', code: 'P002', name: 'Position 2', type: PositionType.Checked},
    {id: '', code: 'P003', name: 'Position 3', type: PositionType.Checked},
    {id: '', code: 'P004', name: 'Position 4', type: PositionType.Checked},
  ];

  beforeEach(async () => {
    await clearFirestoreEmulator();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(ManufacturingService);
    firestore = TestBed.inject(Firestore);
    suppliesCollection = TestBed.inject(SuppliesCollection);
    manufacturingProductionCollection = TestBed.inject(ManufacturingProductionCollection);

    receipt = {
      code: 'P001',
      items: [
        {code: 'P002', quantity: 3},
        {code: 'P004', quantity: 1},
        {code: 'P003', quantity: 2},
      ],
    };

    const positionService = TestBed.inject(PositionsCollection);
    for (const position of positions) {
      position.id = await positionService.add(position);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('Товар поставлен, но не проверен', async () => {
    const supplies: Supply[] = [
      {
        id: '', positionId: positions[1].id, quantity: 10,
        date: new Date('2025-01-03'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 0,
        lot: 2,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '', positionId: positions[1].id, quantity: 10,
        date: new Date('2025-01-02'),
        supplierId: '',
        brokenQuantity: 3,
        usedQuantity: 2,
        lot: 1,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '', positionId: positions[2].id, quantity: 7,
        date: new Date('2025-01-01'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 0,
      },
    ];

    for (const supply of supplies) {
      supply.id = await suppliesCollection.add(supply);
    }

    const result = await service.getAvailability(receipt);

    expect(receipt.id).toEqual(positions[0].id);
    expect(receipt.items[0].id).toEqual(positions[1].id);
    expect(receipt.items[1].id).toEqual(positions[3].id);
    expect(receipt.items[2].id).toEqual(positions[2].id);

    expect(result).toEqual({
      nextId: 0,
      available: 0, supplies: {
        [positions[1].id]: {
          quantity: 15,
          type: PositionType.Checked,
          supplies: [
            supplies[1],
            supplies[0],
          ],
        },
        [positions[2].id]: {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
        [positions[3].id]: {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
      }, message: 'Материал P004 не поставлен',
    });
  });

  it('Товар поставлен, но в недостаточном количестве', async () => {
    const supplies: Supply[] = [
      {
        id: '', positionId: positions[1].id, quantity: 1,
        date: new Date('2025-01-03'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 0,
        lot: 2,
        qualityControlStatus: QualityControlStatus.Completed,
      },
    ];

    for (const supply of supplies) {
      supply.id = await suppliesCollection.add(supply);
    }

    const result = await service.getAvailability(receipt);

    expect(result).toEqual({
      nextId: 0,
      available: 0, supplies: {
        [positions[1].id]: {
          quantity: 1,
          type: PositionType.Checked,
          supplies: [
            supplies[0],
          ],
        },
        [positions[2].id]: {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
        [positions[3].id]: {
          quantity: 0,
          type: PositionType.Checked,
          supplies: [],
        },
      }, message: 'Недостаточно материала P002 (1 из 3)',
    });
  });

  it('Товар поставлен, и проверен', async () => {
    const supplies: Supply[] = [
      {
        id: '', positionId: positions[1].id, quantity: 10,
        date: new Date('2025-01-03'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 1,
        lot: 21,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '', positionId: positions[1].id, quantity: 10,
        date: new Date('2025-01-02'),
        supplierId: '',
        brokenQuantity: 3,
        usedQuantity: 2,
        lot: 1,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '', positionId: positions[2].id, quantity: 9,
        date: new Date('2025-01-01'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 0,
        lot: 1,
        qualityControlStatus: QualityControlStatus.Completed,
      },
      {
        id: '', positionId: positions[3].id, quantity: 9,
        date: new Date('2024-12-31'),
        supplierId: '',
        brokenQuantity: 0,
        usedQuantity: 0,
        lot: 1,
        qualityControlStatus: QualityControlStatus.Completed,
      },
    ];

    for (const supply of supplies) {
      supply.id = await suppliesCollection.add(supply);
    }

    const result = await service.getAvailability(receipt);

    expect(result.available).toEqual(4);

    await service.create(receipt, {executorId: '1', quantity: 1});

    const suppliesState: Record<string, Supply> = {};
    for (const supply of await suppliesCollection.getList()) {
      suppliesState[supply.id] = supply;
    }

    await expectAsync(getDoc(doc(firestore, 'manufacturingLots', 'P001_1_1_1_1_1_1')).then(d => d.exists()))
      .toBeResolvedTo(true);
    const newLots = Object.values(suppliesState).filter(i => i.positionId === positions[0].id);
    expect(newLots.length).toEqual(1);
    expect(newLots[0].lot).toEqual(1);
    expect(newLots[0].quantity).toEqual(1);
    expect(newLots[0].brokenQuantity).toEqual(0);
    expect(newLots[0].usedQuantity).toEqual(0);

    const expectedState = [
      {
        id: supplies[0].id,
        quantity: supplies[0].quantity,
        brokenQuantity: supplies[0].brokenQuantity,
        usedQuantity: supplies[0].usedQuantity,
      },
      {
        id: supplies[1].id,
        quantity: supplies[1].quantity,
        brokenQuantity: supplies[1].brokenQuantity,
        usedQuantity: supplies[1].usedQuantity + 3,
      },
      {
        id: supplies[2].id,
        quantity: supplies[2].quantity,
        brokenQuantity: supplies[2].brokenQuantity,
        usedQuantity: supplies[2].usedQuantity + 2,
      },
      {
        id: supplies[3].id,
        quantity: supplies[3].quantity,
        brokenQuantity: supplies[3].brokenQuantity,
        usedQuantity: supplies[3].usedQuantity + 1,
      },
    ];

    for (const expectedItem of expectedState) {
      const state = suppliesState[expectedItem.id];
      expect({
        id: state.id,
        quantity: state.quantity,
        brokenQuantity: state.brokenQuantity,
        usedQuantity: state.usedQuantity,
      }).toEqual(expectedItem);
    }

    const result2 = await service.getAvailability(receipt);
    expect(result2.available).toEqual(3);
    await expectAsync(service.create(receipt, {executorId: '2', quantity: 4}))
      .toBeRejectedWithError('Неправильное количество. Максимум 3');

    await service.create(receipt, {executorId: '2', quantity: 2});
    await service.create(receipt, {executorId: '2', quantity: 1});

    const suppliesState2: Record<string, Supply> = {};
    const supplies2 = await suppliesCollection.getList('lot');
    for (const supply of supplies2) {
      suppliesState2[supply.id] = supply;
    }

    await expectAsync(getDoc(doc(firestore, 'manufacturingLots', 'P001_1_1_21_1_1_1')).then(d => d.exists()))
      .toBeResolvedTo(true);
    await expectAsync(getDoc(doc(firestore, 'manufacturingLots', 'P001_21_21_21_1_1_1')).then(d => d.exists()))
      .toBeResolvedTo(true);

    await expectAsync(
      manufacturingProductionCollection.getList().then(list => list.reduce((a, i) => a + i.quantity, 0))
    ).toBeResolvedTo(4);

    const newLots2 = supplies2.filter(i => i.positionId === positions[0].id);
    expect(newLots2.length).toEqual(3);
    expect(newLots2[0].manufacturingCode).toEqual('P001_21_21_21_1_1_1');
    expect(newLots2[0].lot).toEqual(3);
    expect(newLots2[0].quantity).toEqual(2);
    expect(newLots2[0].brokenQuantity).toEqual(0);
    expect(newLots2[0].usedQuantity).toEqual(0);
    expect(newLots2[1].manufacturingCode).toEqual('P001_1_1_21_1_1_1');
    expect(newLots2[1].lot).toEqual(2);
    expect(newLots2[1].quantity).toEqual(1);
    expect(newLots2[2].manufacturingCode).toEqual('P001_1_1_1_1_1_1');
    expect(newLots2[2].lot).toEqual(1);
    expect(newLots2[2].quantity).toEqual(1);

    const expectedState2 = [
      {
        id: supplies[0].id,
        quantity: supplies[0].quantity,
        brokenQuantity: supplies[0].brokenQuantity,
        usedQuantity: supplies[0].usedQuantity + 3 + 1 + 3,
      },
      {
        id: supplies[1].id,
        quantity: supplies[1].quantity,
        brokenQuantity: supplies[1].brokenQuantity,
        usedQuantity: supplies[1].usedQuantity + 3 + 2,
      },
      {
        id: supplies[2].id,
        quantity: supplies[2].quantity,
        brokenQuantity: supplies[2].brokenQuantity,
        usedQuantity: supplies[2].usedQuantity + 2 + 2 + 2 + 2,
      },
      {
        id: supplies[3].id,
        quantity: supplies[3].quantity,
        brokenQuantity: supplies[3].brokenQuantity,
        usedQuantity: supplies[3].usedQuantity + 1 + 1 + 1 + 1,
      },
    ];

    for (const expectedItem of expectedState2) {
      const state = suppliesState2[expectedItem.id];
      expect({
        id: state.id,
        quantity: state.quantity,
        brokenQuantity: state.brokenQuantity,
        usedQuantity: state.usedQuantity,
      }).toEqual(expectedItem);
    }
  });
});

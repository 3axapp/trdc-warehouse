import {inject, Injectable} from '@angular/core';
import {Position, PositionsCollection, PositionType} from './collections/positions.collection';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';
import {Result} from '../components/guard-area/manufacturing/manufacturing-form/manufacturing-form';
import {
  collection,
  doc,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  increment,
  runTransaction,
  Transaction,
} from '@angular/fire/firestore';
import {DocumentData} from '@firebase/firestore';
import {generateCombinations, UsedLot} from './manufacturing/combination';
import {chipRecipe} from '../recipes';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {

  private positions = inject(PositionsCollection);
  private supplies = inject(SuppliesCollection);
  private firestore = inject(Firestore);

  private manufacturingLotsCollectionName = 'manufacturingLots';
  private manufacturingProductionCollectionName = 'manufacturingProduction';

  public async getAvailability(receipt: Recipe): Promise<AvailabilityResult> {
    const [positions, supplies] = await Promise.all([this.positions.getList(), this.supplies.getList('lot', 'asc')]);
    this.findReceiptPositions(receipt, positions);
    const receiptSupplies = this.filterReceiptSupplies(receipt, supplies);

    return this.calculateAvailability(receipt, receiptSupplies);
  }

  private findReceiptPositions(receipt: Recipe, positions: Position[]) {
    if (!receipt.id) {
      const position = positions.find(p => p.code === receipt.code);
      receipt.id = position?.id;
    }
    for (const item of receipt.items) {
      if (item.id) {
        continue;
      }
      const position = positions.find(p => p.code === item.code);
      item.id = position?.id;
      item.type = position?.type;
    }
  }

  private filterReceiptSupplies(receipt: Recipe, supplies: Supply[]) {
    const map: ReceiptSupplies = {[receipt.id!]: {type: PositionType.Produced, quantity: 0, supplies: []}};
    for (const item of receipt.items) {
      if (!item.id) {
        continue;
      }
      map[item.id] = {type: item.type!, quantity: 0, supplies: []};
    }

    for (const supply of supplies) {
      const item = map[supply.positionId];
      if (!item) {
        continue;
      }
      if (item.type === PositionType.Checked && supply.qualityControlStatus !== QualityControlStatus.Completed) {
        continue;
      }

      item.quantity += supply.quantity - supply.usedQuantity - supply.brokenQuantity;
      item.supplies.push(supply);
    }
    return map;
  }

  private calculateAvailability(receipt: Recipe, supplies: ReceiptSupplies): AvailabilityResult {
    let available = Number.MAX_SAFE_INTEGER;
    let message;

    for (const item of receipt.items) {
      if (!item.id || !supplies[item.id]?.quantity) {
        available = 0;
        message = `Материал ${item.code} не поставлен`;
        break;
      }

      const itemSupplies = supplies[item.id];
      available = Math.min(available, Math.floor(itemSupplies.quantity / item.quantity));
    }

    const nextId = Math.max(...(supplies[receipt.id!].supplies.map(i => i.lot!)), 0);

    delete supplies[receipt.id!];

    return {
      available,
      supplies,
      message,
      nextId,
    };
  }

  public async create(receipt: Recipe, data: Result) {
    await runTransaction(this.firestore, async (transaction) => {
      const availability = await this.getAvailability(receipt);
      if (availability.available < data.quantity || !(data.quantity > 0)) {
        throw new Error(`Неправильное количество. Максимум ${availability.available}`);
      }

      const usedLots = this.reserveComponents(receipt, availability.supplies, data.quantity);
      await this.recordProduction(receipt, {usedLots, nextId: availability.nextId}, data.executorId, transaction);
      await this.updateComponents(usedLots, transaction);
    });
  }

  private reserveComponents(receipt: Recipe, componentsData: ReceiptSupplies, quantityToProduce: number) {
    const usedLots: Record<string, UsedLot[]> = {};

    for (const item of receipt.items) {
      usedLots[item.id!] = [];
      let remainingToTake = quantityToProduce * item.quantity;

      // Проходим по всем доступным лотам компонента
      const components = componentsData[item.id!].supplies;

      for (const component of components) {
        if (remainingToTake <= 0) {
          break;
        }

        const takeAmount = Math.min(component.quantity - component.brokenQuantity - component.usedQuantity,
          remainingToTake);

        if (takeAmount > 0) {
          // Сохраняем информацию о взятом количестве из каждого лота
          usedLots[item.id!].push({
            supplyId: component.id,
            lot: component.lot!,
            taken: takeAmount,
            originalTaken: takeAmount, // Сохраняем для возможного использования
          });

          // Уменьшаем количество в данных компонентов
          component.quantity -= takeAmount;
          remainingToTake -= takeAmount;
        }
      }
    }

    return usedLots;
  }

  private async recordProduction(
    receipt: Recipe, a: { nextId: number, usedLots: Record<string, UsedLot[]> }, executorId: string,
    transaction: Transaction,
  ) {
    // Получаем все возможные комбинации лотов
    const lotCombinations = this.generateLotCombinations(receipt, a.usedLots);
    const productionRecords: ProductionRecord[] = [];
    let nextId = a.nextId;
    const combinationDocs: { ref: DocumentReference, doc: DocumentSnapshot<DocumentData>, supply: Supply | null }[] = [];
    for (const combination of lotCombinations) {
      const combinationId = `${receipt.code}_${combination.items.map(i => i.lot).join('')}`;
      const combinationRef = doc(this.getLotCollection(), combinationId);
      const combinationDoc = await transaction.get(combinationRef);
      combinationDocs.push({
        ref: combinationRef,
        doc: combinationDoc,
        supply: combinationDoc.exists() ? await this.supplies.get(combinationDoc.data()['id'], transaction) : null,
      });
    }

    for (const [i, combination] of lotCombinations.entries()) {
      let supplyId: string;
      const quantity = combination.quantity!;

      const combinationRef = combinationDocs[i].ref;
      const combinationDoc = combinationDocs[i].doc;
      const supply = combinationDocs[i].supply;

      const lot = supply ? supply.lot! : ++nextId;

      if (combinationDoc.exists()) {
        const combination = combinationDoc.data() as CombinationLot;
        supplyId = combination.id;
        await this.supplies.update(supplyId, {
          quantity: increment(quantity),
        }, transaction);
      } else {
        supplyId = await this.supplies.add({
          positionId: receipt.id!,
          // supplierId: string,
          manufacturingCode: combinationRef.id,
          date: new Date(),
          quantity,
          brokenQuantity: 0,
          usedQuantity: 0,
          lot,
        }, transaction);
        await transaction.set(combinationRef, {id: supplyId});
      }

      productionRecords.push({lot, supplyId, quantity, positionId: receipt.id!});
    }

    this.recordProductionLog(productionRecords, executorId, transaction);
  }

  private generateLotCombinations(receipt: Recipe, usedLots: Record<string, UsedLot[]>) {
    const cells: string[] = [];
    for (const item of receipt.items) {
      cells.push(...Array(item.quantity).fill(item.id!));
    }

    return generateCombinations(cells, usedLots);
  }

  private getLotCollection() {
    return collection(this.firestore, this.manufacturingLotsCollectionName);
  }

  private getProductionCollection() {
    return collection(this.firestore, this.manufacturingProductionCollectionName);
  }

  private recordProductionLog(productionRecords: ProductionRecord[], executorId: string, transaction: Transaction) {
    for (const record of productionRecords) {
      const docRef = doc(this.getProductionCollection());
      transaction.set(docRef, {
        ...record,
        executorId,
        date: new Date(),
      });
    }
  }

  private async updateComponents(usedLots: Record<string, UsedLot[]>, transaction: Transaction) {
    for (const lots of Object.values(usedLots)) {
      for (const lot of lots) {
        await this.supplies.update(lot.supplyId, {
          usedQuantity: increment(lot.originalTaken),
        }, transaction);
      }
    }
  }
}

export interface Recipe {
  id?: string;
  code: string;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  id?: string,
  type?: PositionType,
  code: string,
  quantity: number,
}

type ReceiptSupplies = Record<string, {
  quantity: number;
  type: PositionType;
  supplies: Supply[]
}>;

export interface AvailabilityResult {
  nextId: number;
  available: number;
  supplies: ReceiptSupplies;
  message?: string;
}

interface CombinationLot {
  id: string;
}

interface ProductionRecord {
  lot: number;
  positionId: string;
  supplyId: string;
  quantity: number;
}

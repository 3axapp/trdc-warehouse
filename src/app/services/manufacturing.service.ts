import {inject, Injectable} from '@angular/core';
import {Position, PositionType} from './collections/positions.collection';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';
import {Result} from '../components/guard-area/manufacturing/manufacturing-form/manufacturing-form';
import {
  collection,
  doc as fireDoc,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  increment,
  runTransaction,
  Transaction,
} from '@angular/fire/firestore';
import {DocumentData} from '@firebase/firestore';
import {Combination, generateCombinations, UsedLot} from './manufacturing/combination';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {

  private supplies = inject(SuppliesCollection);
  private firestore = inject(Firestore);

  private manufacturingLotsCollectionName = 'manufacturingLots';
  private manufacturingProductionCollectionName = 'manufacturingProduction';

  public async getNextMaxQuantity(receipt: Recipe): Promise<NextMaxQuantity> {
    const availability = await this.getAvailability(receipt);
    if (!availability.available) {
      return {
        available: availability.available,
        message: availability.message,
      };
    }
    const usedLots = this.reserveComponents(receipt, availability.supplies, availability.available);
    const lotCombinations = this.generateLotCombinations(receipt, usedLots);

    return {available: lotCombinations[0].quantity};
  }

  private async getAvailability(recipe: Recipe): Promise<AvailabilityResult> {
    const supplies = await this.supplies.getList();
    const receiptSupplies = this.filterReceiptSupplies(recipe, supplies);

    return this.calculateAvailability(recipe, receiptSupplies);
  }

  public async create(recipe: Recipe, data: Result) {
    let result: UsedLot[] = [];
    await runTransaction(this.firestore, async (transaction) => {
      const availability = await this.getAvailability(recipe);
      if (!availability.available) {
        throw new Error(`Неправильное количество. Максимум 0`);
      }
      if (!(data.quantity > 0)) {
        throw new Error(`Неправильный формат: ${data.quantity}`);
      }
      if (availability.available < data.quantity) {
        throw new Error(`Неправильное количество. Максимум ${availability.available}`);
      }

      const usedLots = this.reserveComponents(recipe, availability.supplies, data.quantity);
      const lotCombinations = this.generateLotCombinations(recipe, usedLots);
      if (lotCombinations.length !== 1) {
        throw new Error(`Ошибка: создается несколько лотов, а разрешено создавать только по одному`);
      }
      if (lotCombinations[0].quantity != data.quantity) {
        throw new Error(`Неправильное количество. Максимум ${lotCombinations[0].quantity}`);
      }

      await this.recordProduction(recipe, [lotCombinations[0]], availability.nextId, data.executorId, data.date,
        transaction);
      await this.updateComponents(usedLots, transaction);

      result = Object.values(usedLots).flat();
    });

    return result;
  }

  private filterReceiptSupplies(receipt: Recipe, supplies: Supply[]) {
    const map: ReceiptSupplies = {[receipt.id!]: {type: PositionType.Produced, quantity: 0, supplies: []}};
    for (const item of receipt.items) {
      if (!item.id) {
        continue;
      }
      map[item.id] = {type: item.type!, quantity: 0, supplies: []};
    }

    supplies = supplies.sort((a, b) => (a.lot || 0) - (b.lot || 0));

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
      if (!item.id) {
        available = 0;
        message = `Материал с кодом «${item.code}» не найден`;
        break;
      }

      if (!supplies[item.id]?.quantity) {
        available = 0;
        message = `Материал «${item.name!}» не поставлен`;
        break;
      }

      const itemSupplies = supplies[item.id];
      const itemAvailable = Math.floor(itemSupplies.quantity / item.quantity);
      if (!itemAvailable) {
        available = 0;
        message = `Недостаточно материала «${item.name!}» (${itemSupplies.quantity} из ${item.quantity})`;
        break;
      }
      available = Math.min(available, itemAvailable);
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
            name: item.name,
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
    receipt: Recipe, lotCombinations: Combination[], nextId: number, executorId: string, date: Date,
    transaction: Transaction,
  ) {
    const productionRecords: ProductionRecord[] = [];
    const combinationDocs: { ref: DocumentReference, doc: DocumentSnapshot<DocumentData>, supply: Supply | null, parts: number[] }[] = [];
    const idDate = date.toISOString().substring(0, 10).replaceAll('-', '');

    for (const combination of lotCombinations) {
      const parts = combination.items.map(i => i.lot).filter(v => !!v) as number[];
      const id = `${receipt.code}_${idDate}_${executorId}_${parts.join('_')}`;
      const ref = fireDoc(this.getLotCollection(), id);
      const doc = await transaction.get(ref);
      combinationDocs.push({
        ref,
        doc,
        parts,
        supply: doc.exists() ? await this.supplies.get(doc.data()['id'], transaction) : null,
      });
    }

    for (const [i, combination] of lotCombinations.entries()) {
      let supplyId: string;
      const quantity = combination.quantity!;
      const {ref, doc, supply, parts} = combinationDocs[i];

      const lot = supply ? supply.lot! : ++nextId;

      if (doc.exists()) {
        const combination = doc.data() as CombinationLot;
        supplyId = combination.id;
        await this.supplies.update(supplyId, {
          quantity: increment(quantity),
        }, transaction);
      } else {
        supplyId = await this.supplies.add({
          positionId: receipt.id!,
          // supplierId: string,
          manufacturingCode: ref.id,
          date: date,
          quantity,
          brokenQuantity: 0,
          usedQuantity: 0,
          lot,
        }, transaction);
        await transaction.set(ref, {id: supplyId});
      }

      productionRecords.push({lot, supplyId, quantity, positionId: receipt.id!, parts});
    }

    this.recordProductionLog(productionRecords, executorId, date, transaction);
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

  private recordProductionLog(
    productionRecords: ProductionRecord[], executorId: string, date: Date, transaction: Transaction) {
    for (const record of productionRecords) {
      const docRef = fireDoc(this.getProductionCollection());
      transaction.set(docRef, {
        ...record,
        executorId,
        date,
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

export function findReceiptPositions(receipt: Recipe, positions: Position[]) {
  const position = positions.find(p => p.code === receipt.code);
  receipt.id = position?.id;
  for (const item of receipt.items) {
    if (item.id) {
      continue;
    }
    const position = positions.find(p => p.code === item.code);
    item.id = position?.id;
    item.type = position?.type;
    item.name = position?.name;
  }
}

export interface Recipe {
  id?: string;
  code: string;
  items: RecipeItem[];
}

export interface RecipeItem {
  id?: string,
  type?: PositionType,
  name?: string,
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
  parts: number[];
  supplyId: string;
  quantity: number;
}

export interface NextMaxQuantity {
  message?: string;
  available: number;
}

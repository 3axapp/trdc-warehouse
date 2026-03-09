import { inject, Injectable } from '@angular/core';
import { Position, PositionType } from './collections/positions.collection';
import { SuppliesCollection, Supply } from './collections/supplies.collection';
import { Result } from '../components/guard-area/manufacturing/manufacturing-form/manufacturing-form';
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
import { DocumentData } from '@firebase/firestore';
import { Combination, UsedLot } from './manufacturing/combination';
import {
  generateLotCombinations,
  getAvailability,
  getNextMaxQuantity,
  reserveComponents,
} from './manufacturing/supply-planning';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {
  private supplies = inject(SuppliesCollection);
  private firestore = inject(Firestore);

  private manufacturingLotsCollectionName = 'manufacturingLots';
  private manufacturingProductionCollectionName = 'manufacturingProduction';

  public async getNextMaxQuantity(receipt: Recipe): Promise<NextMaxQuantity> {
    const supplies = await this.supplies.getList();
    return getNextMaxQuantity(receipt, supplies);
  }

  public async create(recipe: Recipe, data: Result) {
    let result: UsedLot[] = [];
    if (!recipe.id) {
      throw new Error(`Неизвестная производимая позиция с кодом «${recipe.code}»`);
    }
    await runTransaction(this.firestore, async (transaction) => {
      const supplies = await this.supplies.getList();
      const availability = await getAvailability(recipe, supplies);
      if (!availability.available) {
        throw new Error(`Неправильное количество. Максимум 0`);
      }
      if (!(data.quantity > 0)) {
        throw new Error(`Неправильный формат: ${data.quantity}`);
      }
      if (availability.available < data.quantity) {
        throw new Error(`Неправильное количество. Максимум ${availability.available}`);
      }

      const usedLots = reserveComponents(recipe, availability.supplies, data.quantity);
      const lotCombinations = generateLotCombinations(recipe, usedLots);
      if (lotCombinations.length !== 1) {
        throw new Error(
          `Ошибка: создается несколько лотов, а разрешено создавать только по одному`,
        );
      }
      if (lotCombinations[0].quantity != data.quantity) {
        throw new Error(`Неправильное количество. Максимум ${lotCombinations[0].quantity}`);
      }

      await this.recordProduction(
        recipe,
        [lotCombinations[0]],
        availability.nextId,
        data,
        transaction,
      );
      await this.updateComponents(usedLots, transaction);

      result = Object.values(usedLots).flat();
    });

    return result;
  }

  private async recordProduction(
    receipt: Recipe,
    lotCombinations: Combination[],
    nextId: number,
    data: Result,
    transaction: Transaction,
  ) {
    const productionRecords: ProductionRecord[] = [];
    const combinationDocs: {
      ref: DocumentReference;
      doc: DocumentSnapshot<DocumentData>;
      supply: Supply | null;
      parts: (string | number)[];
    }[] = [];
    const idDate = data.date.toISOString().substring(0, 10).replaceAll('-', '');

    for (const combination of lotCombinations) {
      const parts = combination.items.map((i) => i.lot).filter((v) => !!v) as (string | number)[];
      const id = `${receipt.code}_${idDate}_${data.executorId}_${parts.join('_')}`;
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
      const { ref, doc, supply, parts } = combinationDocs[i];

      const lot = (supply ? supply.lot! : ++nextId) as number;

      if (doc.exists()) {
        const combination = doc.data() as CombinationLot;
        supplyId = combination.id;
        await this.supplies.update(
          supplyId,
          {
            quantity: increment(quantity),
          },
          transaction,
        );
      } else {
        supplyId = await this.supplies.add(
          {
            positionId: receipt.id!,
            // supplierId: string,
            manufacturingCode: ref.id,
            date: data.date,
            quantity,
            usedQuantity: 0,
            lot,
          },
          transaction,
        );
        await transaction.set(ref, { id: supplyId });
      }

      productionRecords.push({ lot, supplyId, quantity, positionId: receipt.id!, parts });
    }

    this.recordProductionLog(productionRecords, data, transaction);
  }

  private getLotCollection() {
    return collection(this.firestore, this.manufacturingLotsCollectionName);
  }

  private getProductionCollection() {
    return collection(this.firestore, this.manufacturingProductionCollectionName);
  }

  private recordProductionLog(
    productionRecords: ProductionRecord[],
    data: Result,
    transaction: Transaction,
  ) {
    for (const record of productionRecords) {
      const docRef = fireDoc(this.getProductionCollection());
      const recordData = {
        ...record,
        executorId: data.executorId,
        date: data.date,
      };
      if (data.recipient) {
        recordData.recipient = data.recipient;
      }
      if (data.docNumber) {
        recordData.docNumber = data.docNumber;
      }
      transaction.set(docRef, recordData);
    }
  }

  private async updateComponents(usedLots: Record<string, UsedLot[]>, transaction: Transaction) {
    for (const lots of Object.values(usedLots)) {
      for (const lot of lots) {
        await this.supplies.update(
          lot.supplyId,
          {
            usedQuantity: increment(lot.originalTaken),
          },
          transaction,
        );
      }
    }
  }
}

export function findReceiptPositions(receipt: Recipe, positions: Position[]) {
  const position = positions.find((p) => p.code === receipt.code);
  receipt.id = position?.id;
  for (const item of receipt.items) {
    if (item.id) {
      continue;
    }
    const position = positions.find((p) => p.code === item.code);
    item.id = position?.id;
    item.type = position?.type;
    item.name = position?.name;
  }
}

export interface Recipe {
  id?: string;
  code: string;
  items: RecipeItem[];
  extraFields?: Partial<Record<ExtraFieldKeys, boolean>>;
}

export interface RecipeItem {
  id?: string;
  type?: PositionType;
  name?: string;
  code: string;
  quantity: number;
}

interface CombinationLot {
  id: string;
}

interface ProductionRecord extends ExtraFields {
  lot: number;
  positionId: string;
  parts: (string | number)[];
  supplyId: string;
  quantity: number;
}

export interface ExtraFields {
  recipient?: string | null;
  docNumber?: string | null;
}

export type ExtraFieldKeys = keyof ExtraFields;

export interface NextMaxQuantity {
  message?: string;
  available: number;
}

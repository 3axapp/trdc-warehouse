import { inject, Injectable } from '@angular/core';
import { Firestore, increment, runTransaction } from '@angular/fire/firestore';
import { SuppliesCollection } from './collections/supplies.collection';
import { Reserve, ReserveCollection, ReserveItem } from './collections/reserve.collection';
import { PositionsCollection } from './collections/positions.collection';
import { findReceiptPositions, NextMaxQuantity } from './manufacturing.service';
import { chipRecipe } from '../recipes';
import {
  generateLotCombinations,
  getAvailability,
  getNextMaxQuantity,
  reserveComponents,
} from './manufacturing/supply-planning';

@Injectable({
  providedIn: 'root',
})
export class ReserveService {
  private readonly firestore = inject(Firestore);
  private readonly supplies = inject(SuppliesCollection);
  private readonly reserves = inject(ReserveCollection);
  private readonly positions = inject(PositionsCollection);

  public async getMaxQuantity(): Promise<NextMaxQuantity> {
    await this.ensureRecipeLoaded();
    const allSupplies = await this.supplies.getList();

    return getNextMaxQuantity(chipRecipe, allSupplies);
  }

  public async createReserve(quantity: number): Promise<void> {
    await this.ensureRecipeLoaded();
    const allSupplies = await this.supplies.getList();

    const availability = getAvailability(chipRecipe, allSupplies);

    if (!availability.available) {
      throw new Error(`Неправильное количество. Максимум 0`);
    }
    if (!(quantity > 0) || availability.available < quantity) {
      throw new Error(`Неправильное количество. Максимум ${availability.available}`);
    }

    const usedLots = reserveComponents(chipRecipe, availability.supplies, quantity);
    const lotCombinations = generateLotCombinations(chipRecipe, usedLots);
    if (lotCombinations.length !== 1) {
      throw new Error(
        `Ошибка: резервируется для нескольких лотов, а разрешено резервировать только для одного за раз`,
      );
    }

    const items: ReserveItem[] = [];

    for (const [positionId, lots] of Object.entries(usedLots)) {
      for (const lot of lots) {
        items.push({
          positionId,
          supplyId: lot.supplyId,
          lot: lot.lot!,
          quantity: lot.originalTaken,
          name: lot.name,
        });
      }
    }

    await runTransaction(this.firestore, async (transaction) => {
      await this.reserves.add(
        { date: new Date(), quantity, items } as Omit<Reserve, 'id'>,
        transaction,
      );
      for (const lots of Object.values(usedLots)) {
        for (const lot of lots) {
          await this.supplies.update(
            lot.supplyId,
            { usedQuantity: increment(lot.originalTaken) },
            transaction,
          );
        }
      }
    });
  }

  public async ensureRecipeLoaded(): Promise<void> {
    if (!chipRecipe.items[0].id) {
      findReceiptPositions(chipRecipe, await this.positions.getList());
    }
  }
}

import {inject, Injectable} from '@angular/core';
import {Firestore, increment, runTransaction} from '@angular/fire/firestore';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';
import {Reserve, ReserveCollection, ReserveItem} from './collections/reserve.collection';
import {PositionsCollection} from './collections/positions.collection';
import {findReceiptPositions, ManufacturingService, NextMaxQuantity} from './manufacturing.service';
import {chipRecipe} from '../recipes';
import {UsedLot} from './manufacturing/combination';

@Injectable({
  providedIn: 'root',
})
export class ReserveService {
  private readonly firestore = inject(Firestore);
  private readonly supplies = inject(SuppliesCollection);
  private readonly reserves = inject(ReserveCollection);
  private readonly positions = inject(PositionsCollection);
  private readonly manufacturing = inject(ManufacturingService);

  async getMaxQuantity(): Promise<NextMaxQuantity> {
    await this.ensureRecipeLoaded();
    return this.manufacturing.getNextMaxQuantity(chipRecipe);
  }

  async createReserve(quantity: number): Promise<void> {
    await this.ensureRecipeLoaded();
    const allSupplies = await this.supplies.getList();
    const recipeSupplies = this.filterSupplies(allSupplies);
    const available = this.calcAvailable(recipeSupplies);

    if (quantity <= 0 || quantity > available) {
      throw new Error(`Неправильное количество. Максимум ${available}`);
    }

    const usedLots = this.pickLots(quantity, recipeSupplies);
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
      await this.reserves.add({date: new Date(), quantity, items} as Omit<Reserve, 'id'>, transaction);
      for (const lots of Object.values(usedLots)) {
        for (const lot of lots) {
          await this.supplies.update(lot.supplyId, {usedQuantity: increment(lot.originalTaken)}, transaction);
        }
      }
    });
  }

  private async ensureRecipeLoaded(): Promise<void> {
    if (!chipRecipe.items[0].id) {
      findReceiptPositions(chipRecipe, await this.positions.getList());
    }
  }

  private filterSupplies(supplies: Supply[]): Record<string, Supply[]> {
    const result: Record<string, Supply[]> = {};
    for (const item of chipRecipe.items) {
      if (item.id) {
        result[item.id] = [];
      }
    }
    const sorted = supplies.slice().sort((a, b) => +a.date - +b.date);
    for (const s of sorted) {
      if (s.deleted || !result[s.positionId]) {
        continue;
      }
      if (s.qualityControlStatus !== QualityControlStatus.Completed) {
        continue;
      }
      result[s.positionId].push(s);
    }
    return result;
  }

  private calcAvailable(recipeSupplies: Record<string, Supply[]>): number {
    let available = Number.MAX_SAFE_INTEGER;
    for (const item of chipRecipe.items) {
      if (!item.id) {
        return 0;
      }
      const total = (recipeSupplies[item.id] ?? [])
        .reduce((sum, s) => sum + s.quantity - s.usedQuantity, 0);
      available = Math.min(available, Math.floor(total / item.quantity));
    }
    return available === Number.MAX_SAFE_INTEGER ? 0 : available;
  }

  private pickLots(quantity: number, recipeSupplies: Record<string, Supply[]>): Record<string, UsedLot[]> {
    const result: Record<string, UsedLot[]> = {};
    for (const item of chipRecipe.items) {
      if (!item.id) {
        continue;
      }
      result[item.id] = [];
      let remaining = quantity * item.quantity;
      for (const s of recipeSupplies[item.id] ?? []) {
        if (remaining <= 0) {
          break;
        }
        const avail = s.quantity - s.usedQuantity;
        const take = Math.min(avail, remaining);
        if (take > 0) {
          result[item.id].push({supplyId: s.id, lot: s.lot, name: item.name, taken: take, originalTaken: take});
          remaining -= take;
        }
      }
    }
    return result;
  }
}

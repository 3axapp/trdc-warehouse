import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc as fireDoc,
  Firestore,
  increment,
  runTransaction,
} from '@angular/fire/firestore';
import {
  QualityControlStatus,
  SuppliesCollection,
  Supply,
} from './collections/supplies.collection';
import { Reserve, ReserveCollection } from './collections/reserve.collection';
import { PositionsCollection } from './collections/positions.collection';
import { findReceiptPositions } from './manufacturing.service';
import { chipRecipe } from '../recipes';
import { formatDateForId } from './utils';
import { getNextMaxQuantity } from './manufacturing/supply-planning';

export interface ConfirmProductionData {
  producedQuantity: number;
  date: Date;
  brokenQuantities: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class ReserveProductionService {
  private readonly firestore = inject(Firestore);
  private readonly supplies = inject(SuppliesCollection);
  private readonly reserves = inject(ReserveCollection);
  private readonly positions = inject(PositionsCollection);

  public canProductionConfirmed(reserve: Reserve) {
    return this.getNextMaxQuantity(reserve) > 0;
  }

  public getNextMaxQuantity(reserve: Reserve): number {
    // return (reserve.producedQuantity ?? 0) + (reserve.returnedQuantity ?? 0) < reserve.quantity;
    const supplies: Supply[] = [];
    for (const item of reserve.items) {
      supplies.push({
        id: item.supplyId,
        positionId: item.positionId,
        date: reserve.date,
        quantity: item.quantity,
        usedQuantity:
          (item.usedQuantity ?? 0) + (item.brokenQuantity ?? 0) + (item.returnedQuantity ?? 0),
        qualityControlStatus: QualityControlStatus.Completed,
      });
    }
    const a = getNextMaxQuantity(chipRecipe, supplies);
    return a.available;
  }

  public canReturnRemainder(reserve: Reserve): boolean {
    return reserve.items.some((item) => {
      const used = item.usedQuantity ?? 0;
      const broken = item.brokenQuantity ?? 0;
      const returned = item.returnedQuantity ?? 0;
      return item.quantity - used - broken - returned > 0;
    });
  }

  public async confirmProduction(
    reserveId: string,
    data: ConfirmProductionData,
    executorId: string,
  ): Promise<void> {
    await this.ensureRecipeLoaded();
    await runTransaction(this.firestore, async (transaction) => {
      const reserve = await this.reserves.get(reserveId, transaction);
      this.validateConfirmProduction(reserve, data);

      const { producedQuantity, date } = data;
      if (producedQuantity) {
        const idDate = date.toISOString().substring(0, 10).replaceAll('-', '');
        const parts = chipRecipe.items
          .map((item) => reserve.items.find((i) => i.positionId === item.id)?.lot)
          .filter((v) => v !== undefined && v !== null) as (string | number)[];
        const lotId = `${chipRecipe.code}_${idDate}_${executorId}_${parts.join('_')}`;

        const allSupplies = await this.supplies.getList();
        const nextId =
          allSupplies.filter(
            (s) =>
              s.positionId === chipRecipe.id &&
              s.date.toISOString().substring(0, 10) === date.toISOString().substring(0, 10),
          ).length + 1;
        const lotColRef = collection(this.firestore, 'manufacturingLots');
        const lotRef = fireDoc(lotColRef, lotId);
        const lotDoc = await transaction.get(lotRef);

        let existingSupplyId: string | null = null;
        let existingLot: string | null = null;

        if (lotDoc.exists()) {
          existingSupplyId = (lotDoc.data() as { id: string }).id;
          const existingSupply = await this.supplies.get(existingSupplyId, transaction);
          existingLot = existingSupply.lot as string;
        }

        let supplyId: string;
        let lot: string;

        if (existingSupplyId !== null) {
          supplyId = existingSupplyId;
          lot = existingLot!;
          await this.supplies.update(
            supplyId,
            { quantity: increment(producedQuantity) },
            transaction,
          );
        } else {
          lot = `${formatDateForId(date)}-${executorId}-${nextId}`;
          supplyId = await this.supplies.add(
            {
              positionId: chipRecipe.id!,
              manufacturingCode: lotId,
              date,
              quantity: producedQuantity,
              usedQuantity: 0,
              lot,
            },
            transaction,
          );
          await transaction.set(lotRef, { id: supplyId });
        }

        const prodColRef = collection(this.firestore, 'manufacturingProduction');
        const prodRef = fireDoc(prodColRef);
        transaction.set(prodRef, {
          lot,
          supplyId,
          quantity: producedQuantity,
          positionId: chipRecipe.id!,
          parts,
          executorId,
          date,
        });
      }
      const updatedItems = reserve.items.map((item) => {
        const recipeItem = chipRecipe.items.find((r) => r.id === item.positionId);
        const perChip = recipeItem?.quantity ?? 1;
        return {
          ...item,
          usedQuantity: (item.usedQuantity ?? 0) + producedQuantity * perChip,
          // brokenQuantity:
          //   (item.brokenQuantity ?? 0) + (data.brokenQuantities[item.positionId] ?? 0),
        };
      });

      await this.reserves.update(
        reserve.id,
        { producedQuantity: increment(producedQuantity), items: updatedItems },
        transaction,
      );
    });
  }

  public async returnRemainder(reserve: Reserve): Promise<void> {
    if (!this.canReturnRemainder(reserve)) {
      throw new Error('Нечего возвращать');
    }

    const toReturn: { supplyId: string; amount: number; index: number }[] = [];
    for (const [index, item] of reserve.items.entries()) {
      const used = item.usedQuantity ?? 0;
      const broken = item.brokenQuantity ?? 0;
      const returned = item.returnedQuantity ?? 0;
      const amount = item.quantity - used - broken - returned;
      if (amount > 0) {
        toReturn.push({ supplyId: item.supplyId, amount, index });
      }
    }

    if (toReturn.length === 0) {
      return;
    }

    await runTransaction(this.firestore, async (transaction) => {
      for (const { supplyId, amount } of toReturn) {
        await this.supplies.update(supplyId, { usedQuantity: increment(-amount) }, transaction);
      }

      reserve.returnedQuantity = reserve.quantity - (reserve.producedQuantity ?? 0);

      const updatedItems = reserve.items.map((item, i) => {
        const entry = toReturn.find((t) => t.index === i);
        if (entry) {
          return { ...item, returnedQuantity: (item.returnedQuantity ?? 0) + entry.amount };
        }
        return item;
      });

      await this.reserves.update(reserve.id, { items: updatedItems }, transaction);
    });
  }

  private validateConfirmProduction(reserve: Reserve, data: ConfirmProductionData): void {
    const { producedQuantity, brokenQuantities } = data;
    const success =
      !!data.producedQuantity || !!Object.values(data.brokenQuantities).filter((a) => a).length;

    if (!success) {
      throw new Error('Необходимо указать или произведенное количество или испорченное');
    }

    for (const item of reserve.items) {
      const broken = brokenQuantities[item.positionId] ?? 0;
      const recipeItem = chipRecipe.items.find((r) => r.id === item.positionId);
      const perChip = recipeItem?.quantity ?? 1;
      const used = producedQuantity * perChip;
      if (used + broken > item.quantity) {
        throw new Error(
          `Превышено количество для ${
            item.name ?? item.positionId
          }: использовано ${used} + испорчено ${broken} > зарезервировано ${item.quantity}`,
        );
      }
      item.brokenQuantity = (item.brokenQuantity ?? 0) + broken;
    }

    const maxQuantity = this.getNextMaxQuantity(reserve);
    if (maxQuantity < producedQuantity) {
      throw new Error(`Максимальное количество с учетом испорченного: ${maxQuantity}`);
    }
  }

  private async ensureRecipeLoaded(): Promise<void> {
    if (!chipRecipe.items[0].id) {
      findReceiptPositions(chipRecipe, await this.positions.getList());
    }
  }
}

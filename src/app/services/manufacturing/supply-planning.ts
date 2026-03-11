import { QualityControlStatus, Supply } from '../collections/supplies.collection';
import { PositionType } from '../collections/positions.collection';
import { generateCombinations, UsedLot } from './combination';
import { NextMaxQuantity, Recipe } from './recipe';

function filterReceiptSupplies(receipt: Recipe, supplies: Supply[]) {
  const map: ReceiptSupplies = {
    [receipt.id!]: { type: PositionType.Produced, quantity: 0, supplies: [] },
  };
  for (const item of receipt.items) {
    if (!item.id) {
      continue;
    }
    map[item.id] = { type: item.type!, quantity: 0, supplies: [] };
  }

  supplies = supplies.sort((a, b) => +a.date - +b.date);

  for (const supply of supplies) {
    const item = map[supply.positionId];
    if (!item || supply.deleted) {
      continue;
    }
    if (
      item.type === PositionType.Checked &&
      supply.qualityControlStatus !== QualityControlStatus.Completed
    ) {
      continue;
    }

    item.quantity += supply.quantity - supply.usedQuantity;
    item.supplies.push(supply);
  }
  return map;
}

function calculateAvailability(receipt: Recipe, supplies: ReceiptSupplies): AvailabilityResult {
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

  const nextId = Math.max(...supplies[receipt.id!].supplies.map((i) => (i.lot as number) || 0), 0);

  delete supplies[receipt.id!];

  return {
    available,
    supplies,
    message,
    nextId,
  };
}

export function getAvailability(recipe: Recipe, supplies: Supply[]): AvailabilityResult {
  const receiptSupplies = filterReceiptSupplies(recipe, supplies);
  return calculateAvailability(recipe, receiptSupplies);
}

export function getNextMaxQuantity(receipt: Recipe, supplies: Supply[]): NextMaxQuantity {
  const availability = getAvailability(receipt, supplies);
  if (availability.available < 1) {
    return {
      available: availability.available,
      message: availability.message,
    };
  }
  const usedLots = reserveComponents(receipt, availability.supplies, availability.available);
  const lotCombinations = generateLotCombinations(receipt, usedLots);

  return { available: lotCombinations[0].quantity };
}

export function reserveComponents(
  receipt: Recipe,
  componentsData: ReceiptSupplies,
  quantityToProduce: number,
) {
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

      const takeAmount = Math.min(component.quantity - component.usedQuantity, remainingToTake);

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

export function generateLotCombinations(receipt: Recipe, usedLots: Record<string, UsedLot[]>) {
  const cells: string[] = [];
  for (const item of receipt.items) {
    cells.push(...Array(item.quantity).fill(item.id!));
  }

  return generateCombinations(cells, usedLots);
}

type ReceiptSupplies = Record<
  string,
  {
    quantity: number;
    type: PositionType;
    supplies: Supply[];
  }
>;

export interface AvailabilityResult {
  nextId: number;
  available: number;
  supplies: ReceiptSupplies;
  message?: string;
}

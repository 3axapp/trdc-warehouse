export interface UsedLot {
  supplyId: string;
  lot?: number;
  name?: string;
  taken: number;
  originalTaken: number;
}

export interface Combination {
  items: SupplyInfo[];
  quantity: number;
}

interface SupplyInfo {
  supplyId: string;
  lot: number|undefined;
}

export function generateCombinations(cells: string[], usedLots: Record<string, UsedLot[]>): Combination[] {
  // Подсчитываем компоненты
  const componentCounts: Record<string, number> = {};
  for (const cell of cells) {
    componentCounts[cell] = (componentCounts[cell] || 0) + 1;
  }

  // Максимальное количество полных наборов
  let maxSets = Infinity;
  for (const [componentId, needed] of Object.entries(componentCounts)) {
    const totalAvailable = (usedLots[componentId] || [])
      .reduce((sum, lot) => sum + lot.taken, 0);
    maxSets = Math.min(maxSets, Math.floor(totalAvailable / needed));
  }

  // Если нельзя собрать ни одного набора
  if (maxSets === 0) {
    return [];
  }

  // Находим все уникальные способы собрать ОДИН набор
  const singleSetCombinations: Combination[] = [];
  // Рекурсивно ищем все способы собрать один набор
  const findSingleSet = (
    index: number,
    currentItems: number[],
    remaining: Record<string, number>, // componentId -> сколько еще нужно
  ): boolean | void => {
    // Если прошли все cells
    if (index >= cells.length) {
      const values: Record<string, { lotIndex: number, quantity: number, maxQuantity: number }> = {};
      for (const [partIndex, componentId] of cells.entries()) {
        const lotIndex = currentItems[partIndex];
        const supply = usedLots[componentId][lotIndex];
        if (!values[supply.supplyId]) {
          values[supply.supplyId] = {lotIndex: lotIndex, quantity: 0, maxQuantity: supply.taken};
        }
        values[supply.supplyId].quantity++;
      }

      const maxProductCount = Math.min(...Object.values(values).map(i => Math.floor(i.maxQuantity / i.quantity)));
      if (!maxProductCount) {
        return false;
      }

      const combination: Combination = {quantity: maxProductCount, items: []};

      for (const [partIndex, componentId] of cells.entries()) {
        const lotIndex = currentItems[partIndex];
        const supply = usedLots[componentId][lotIndex];

        combination.items.push({supplyId: supply.supplyId, lot: supply.lot});

        if (!values[supply.supplyId]) {
          continue;
        }
        supply.taken -= values[supply.supplyId].quantity * maxProductCount;
        delete values[supply.supplyId];
      }

      singleSetCombinations.push(combination);

      return true;
    }

    const componentId = cells[index];
    const lots = usedLots[componentId] || [];
    let found = false;

    for (const [lotIndex, lot] of lots.entries()) {
      while (lot.taken > 0) {
        // Берем один компонент из этого лота
        const newItems = [...currentItems, lotIndex];
        if (!findSingleSet(index + 1, newItems, {...remaining})) {
          break;
        }
        found = true;
      }
    }
    return found;
  };

  findSingleSet(0, [], {});

  return singleSetCombinations;
}

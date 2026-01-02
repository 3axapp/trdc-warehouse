import {inject, Injectable} from '@angular/core';
import {Position, PositionsService, PositionType} from './positions.service';
import {QualityControlStatus, SuppliesService, Supply} from './supplies.service';
import {Result} from '../components/guard-area/manufacturing/manufacturing-form/manufacturing-form';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingService {

  private positions = inject(PositionsService);
  private supplies = inject(SuppliesService);

  public async getAvailability(receipt: Receipt): Promise<AvailabilityResult> {
    const [positions, supplies] = await Promise.all([this.positions.getList(), this.supplies.getList()]);
    this.findReceiptPositions(receipt, positions);
    const receiptSupplies = this.filterReceiptSupplies(receipt, supplies);

    return this.calculateAvailability(receipt, receiptSupplies);
  }

  private findReceiptPositions(receipt: Receipt, positions: Position[]) {
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

  private filterReceiptSupplies(receipt: Receipt, supplies: Supply[]) {
    const map: ReceiptSupplies = {};
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

  private calculateAvailability(receipt: Receipt, supplies: ReceiptSupplies) {
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

    return {
      available,
      supplies,
      message,
    };
  }

  public async create(receipt: Receipt, availability: AvailabilityResult, data: Result) {
    const usedLots = this.reserveComponents(receipt, availability.supplies, data.quantity);
    this.recordProduction(receipt, usedLots, data.executorId);
  }


  private reserveComponents(receipt: Receipt, componentsData: ReceiptSupplies, quantityToProduce: number) {
    const usedLots: Record<string, UsedLot[]> = {};

    for (const item of receipt.items) {
      usedLots[item.id!] = [];
      let remainingToTake = quantityToProduce;

      // Проходим по всем доступным лотам компонента
      const components = componentsData[item.id!].supplies;

      for (const component of components) {
        if (remainingToTake <= 0) {
          break;
        }

        const takeAmount = Math.min(component.quantity, remainingToTake);

        if (takeAmount > 0) {
          // Сохраняем информацию о взятом количестве из каждого лота
          usedLots[item.id!].push({
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

  private recordProduction(receipt: Receipt, usedLots: Record<string, UsedLot[]>, executorId: string) {
    // Получаем все возможные комбинации лотов
    const lotCombinations = this.generateLotCombinations(receipt, usedLots);
    const productionRecords = [];

    for (const combination of lotCombinations) {
      const combinationQuantity = combination.quantity!;
      const componentLots: number[] = [];
      for (let i = 0; i < receipt.items.length; i++) {
        componentLots.push(combination[i]);
      }

      const combinationId = `${receipt.code}_${componentLots.join('_')}`;
      // @todo поиск по combinationId
      const isExist = false;
      if(isExist){
        ///
      }else{
        const nextId = 1; // @todo получение следующего id getNextLotNumber
        this.supplies.add({
          positionId: receipt.id!,
          // supplierId: string,
          date: new Date(),
          quantity: combinationQuantity,
          brokenQuantity: 0,
          usedQuantity: 0,
          lot: nextId,
        });
      }
    }
  }

  private generateLotCombinations(receipt: Receipt, usedLots: Record<string, UsedLot[]>) {
    // const requiredComponents = [1, 2, 3, 4, 5];
    const allCombinations: Combination[] = [];

    // Создаем массивы лотов для каждого компонента
    const componentLotsArray: Record<string, UsedLot[]> = {};
    for (const {id} of receipt.items) {
      componentLotsArray[id!] = usedLots[id!];
    }

    // Рекурсивная функция для генерации всех комбинаций
    function generateRecursive(currentCombination: Combination, componentIndex: number) {
      const componentId = receipt.items[componentIndex].id!;
      const lots = componentLotsArray[componentId];

      // Для каждого лота текущего компонента
      for (const lotInfo of lots) {
        const newCombination: Combination = {...currentCombination};
        newCombination[componentId] = lotInfo.lot;

        // Если это не последний компонент, продолжаем рекурсию
        if (componentIndex < receipt.items.length - 1) {
          generateRecursive(newCombination, componentIndex + 1);
        } else {
          // Это последний компонент - вычисляем минимальное количество для этой комбинации
          const minQuantity = calculateMinQuantityForCombination(receipt, newCombination, usedLots);
          if (minQuantity > 0) {
            newCombination.quantity = minQuantity;
            allCombinations.push(newCombination);

            // Вычитаем использованное количество
            subtractUsedQuantity(receipt, usedLots, newCombination, minQuantity);
          }
        }
      }
    }

    // Запускаем генерацию с первого компонента
    generateRecursive({}, 0);

    return allCombinations;
  }
}

/**
 * Вычисляет минимальное количество изделий для конкретной комбинации лотов
 */
function calculateMinQuantityForCombination(receipt: Receipt, combination: Combination, usedLots: Record<string, UsedLot[]>) {
  let minQuantity = Infinity;

  for (const {id} of receipt.items) {
    const targetLot = combination[id!];
    const componentLots = usedLots[id!];

    // Находим лот в массиве usedLots
    const lotInfo = componentLots.find(item => item.lot === targetLot && item.taken > 0);

    if (lotInfo) {
      minQuantity = Math.min(minQuantity, lotInfo.taken);
    } else {
      return 0; // Если лот не найден или количество 0
    }
  }

  return minQuantity === Infinity ? 0 : minQuantity;
}


/**
 * Вычитает использованное количество из usedLots
 */
function subtractUsedQuantity(receipt: Receipt, usedLots: Record<string, UsedLot[]>, combination: Combination, quantity: number) {
  // const requiredComponents = [1, 2, 3, 4, 5];
  for (const {id} of receipt.items) {
    const targetLot = combination[id!];
    const componentLots = usedLots[id!];

    // Находим и обновляем соответствующий лот
    for (const lotInfo of componentLots) {
      if (lotInfo.lot === targetLot && lotInfo.taken >= quantity) {
        lotInfo.taken -= quantity;
        break;
      }
    }
  }
}


interface UsedLot {
  lot: number;
  taken: number;
  originalTaken: number;
}

export interface Receipt {
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
  available: number;
  supplies: ReceiptSupplies;
  message?: string;
}

type Combination = Record<string, number> & {quantity?: number};

import { Position, PositionType } from '../collections/positions.collection';

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

export interface NextMaxQuantity {
  message?: string;
  available: number;
}

export interface ExtraFields {
  recipient?: string | null;
  docNumber?: string | null;
}

export type ExtraFieldKeys = keyof ExtraFields;

export function findReceiptPositions(receipt: Recipe, positions: Position[]): void {
  const position = positions.find((p) => p.code === receipt.code);
  receipt.id = position?.id;
  for (const item of receipt.items) {
    if (item.id) {
      continue;
    }
    const pos = positions.find((p) => p.code === item.code);
    item.id = pos?.id;
    item.type = pos?.type;
    item.name = pos?.name;
  }
}

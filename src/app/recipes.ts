import {ReceiptItem, Recipe} from './services/manufacturing.service';
import {PositionType} from './services/collections/positions.collection';

export const chipRecipe: Recipe = {
  code: 'chip',
  items: [
    {type: PositionType.Normal, code: 'body', quantity: 1},
    {type: PositionType.Normal, code: 'membrane', quantity: 1},
    {type: PositionType.Normal, code: 'bottom_lid', quantity: 1},
    {type: PositionType.Normal, code: 'top_lid', quantity: 1},
    {type: PositionType.Normal, code: 'tape_3M', quantity: 1},
  ],
};
export const packRecipe: Recipe = {
  code: 'chip_pack',
  items: [
    {type: PositionType.Produced, code: 'chip', quantity: 5},
  ],
};
export const shipRecipe: Recipe = {
  code: 'chip_ship',
  items: [
    {type: PositionType.Produced, code: 'chip_pack', quantity: 10},
  ],
};

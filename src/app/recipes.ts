import {Recipe} from './services/manufacturing.service';
import {PositionType} from './services/collections/positions.collection';

export const chipRecipe: Recipe = {
  code: 'chip',
  items: [
    {type: PositionType.Checked, code: 'body', quantity: 1},
    {type: PositionType.Checked, code: 'membrane', quantity: 1},
    {type: PositionType.Checked, code: 'bottom_lid', quantity: 1},
    {type: PositionType.Checked, code: 'top_lid', quantity: 1},
    {type: PositionType.Checked, code: 'tape_3M', quantity: 1},
  ],
};
export const packRecipe: Recipe = {
  code: 'chip_pack',
  items: [
    {type: PositionType.Produced, code: 'chip', quantity: 5},
    {type: PositionType.Checked, code: 'bag_vinar', quantity: 5},
    {type: PositionType.Normal, code: 'label_58х40', quantity: 6},
    {type: PositionType.Normal, code: 'box_unit', quantity: 1},
    {type: PositionType.Normal, code: 'manual', quantity: 1},
    {type: PositionType.Normal, code: 'label_seal', quantity: 1},
  ],
};
export const shipRecipe: Recipe = {
  code: 'chip_ship',
  items: [
    {type: PositionType.Produced, code: 'chip_pack', quantity: 10},
    {type: PositionType.Normal, code: 'label_ship', quantity: 1},
    {type: PositionType.Normal, code: 'box_ship', quantity: 1},
  ],
  extraFields: {
    recipient: true,
    docNumber: true,
  },
};

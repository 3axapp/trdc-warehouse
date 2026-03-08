import {Recipe} from './services/manufacturing.service';
import {PositionType} from './services/collections/positions.collection';

export const chipRecipe: Recipe = {
  code: 'chip',
  items: [
    {type: PositionType.Checked, code: 'КО', quantity: 1},
    {type: PositionType.Checked, code: 'МБ', quantity: 1},
    {type: PositionType.Checked, code: 'НК', quantity: 1},
    {type: PositionType.Checked, code: 'ВК', quantity: 1},
    {type: PositionType.Checked, code: 'КЛ', quantity: 1},
  ],
};
export const packRecipe: Recipe = {
  code: 'chip_pack',
  items: [
    {type: PositionType.Produced, code: 'chip', quantity: 5},
    {type: PositionType.Checked, code: 'ПК', quantity: 5},
    {type: PositionType.Normal, code: 'ЭУ', quantity: 6},
    {type: PositionType.Normal, code: 'КУ', quantity: 1},
    {type: PositionType.Normal, code: 'ИП', quantity: 1},
    {type: PositionType.Normal, code: 'ЭП', quantity: 1},
  ],
};
export const shipRecipe: Recipe = {
  code: 'chip_ship',
  items: [
    {type: PositionType.Produced, code: 'chip_pack', quantity: 10},
    {type: PositionType.Normal, code: 'ЭП', quantity: 1},
    {type: PositionType.Normal, code: 'КОТ', quantity: 1},
  ],
  extraFields: {
    recipient: true,
    docNumber: true,
  },
};

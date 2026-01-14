import {generateCombinations, UsedLot} from './combination';

describe('Combination', () => {
  it('case1', () => {
    const cells = ['a', 'a', 'a', 'b', 'c', 'c', 'd'];
    const usedLots: Record<string, UsedLot[]> = {
      a: [
        {supplyId: 'wqe2', lot: 1, taken: 5, originalTaken: 5},
        {supplyId: 'wdwd', lot: 2, taken: 4, originalTaken: 4},
      ],
      b: [
        {supplyId: '4353', lot: 1, taken: 4, originalTaken: 4},
      ],
      c: [
        {supplyId: 'wefwe', lot: 1, taken: 6, originalTaken: 6},
        // {supplyId: '45gr', lot: 1, taken: 3, originalTaken: 1},
      ],
      d: [
        {supplyId: 'qqqq', taken: 40, originalTaken: 40},
      ],
    };

    // Генерация комбинаций с уменьшением taken
    const combinations = generateCombinations(cells, usedLots);

    expect(combinations.reduce((a, i) => a + i.quantity, 0)).toEqual(3);
    expect(combinations).toEqual([
      {
        quantity: 1, items: [
          {supplyId: 'wqe2', lot: 1}, {supplyId: 'wqe2', lot: 1}, {supplyId: 'wqe2', lot: 1},
          {supplyId: '4353', lot: 1},
          {supplyId: 'wefwe', lot: 1}, {supplyId: 'wefwe', lot: 1},
          {supplyId: 'qqqq', lot: undefined},
        ],
      },
      {
        quantity: 1, items: [
          {supplyId: 'wqe2', lot: 1}, {supplyId: 'wqe2', lot: 1}, {supplyId: 'wdwd', lot: 2},
          {supplyId: '4353', lot: 1},
          {supplyId: 'wefwe', lot: 1}, {supplyId: 'wefwe', lot: 1},
          {supplyId: 'qqqq', lot: undefined},
        ],
      },
      {
        quantity: 1, items: [
          {supplyId: 'wdwd', lot: 2}, {supplyId: 'wdwd', lot: 2}, {supplyId: 'wdwd', lot: 2},
          {supplyId: '4353', lot: 1},
          {supplyId: 'wefwe', lot: 1}, {supplyId: 'wefwe', lot: 1},
          {supplyId: 'qqqq', lot: undefined},
        ],
      },
    ]);
  });
});

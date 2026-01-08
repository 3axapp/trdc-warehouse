import {PositionTypePipe} from './position-type-pipe';
import {PositionType} from '../services/collections/positions.collection';

describe('PositionTypePipe', () => {
  it('create an instance', () => {
    const pipe = new PositionTypePipe();
    expect(pipe).toBeTruthy();
  });

  it('transform', () => {
    const pipe = new PositionTypePipe();
    expect(pipe.transform('asdasd' as any)).toEqual('Неизвестно');
    expect(pipe.transform(null as any)).toEqual('Неизвестно');
    expect(pipe.transform(undefined as any)).toEqual('Неизвестно');
    for (const value of Object.values(PositionType).filter(v => typeof v !== 'string')) {
      expect(pipe.transform(value)).toBeTruthy();
      expect(pipe.transform(value) === 'Неизвестно').toBeFalse();
    }
  });
});

import {QualityControlStatusPipe} from './quality-control-status-pipe';
import {QualityControlStatus} from '../services/collections/supplies.collection';

describe('QualityControlStatusPipe', () => {
  it('create an instance', () => {
    const pipe = new QualityControlStatusPipe();
    expect(pipe).toBeTruthy();
  });

  it('transform', () => {
    const pipe = new QualityControlStatusPipe();
    expect(pipe.transform('asdasd' as any)).toEqual('Неизвестно');
    expect(pipe.transform(null as any)).toEqual(pipe.transform(QualityControlStatus.Pending));
    expect(pipe.transform(undefined as any)).toEqual(pipe.transform(QualityControlStatus.Pending));
    for (const value of Object.values(QualityControlStatus).filter(v => typeof v !== 'string')) {
      expect(pipe.transform(value)).toBeTruthy();
      expect(pipe.transform(value) === 'Неизвестно').toBeFalse();
    }
  });
});

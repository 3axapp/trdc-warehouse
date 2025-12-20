import {inject, Pipe, PipeTransform} from '@angular/core';
import {Position} from '../services/positions.service';
import {CacheService} from '../services/cache.service';

@Pipe({
  name: 'position',
})
export class PositionPipe implements PipeTransform {
  private readonly cache = inject(CacheService);

  transform(value: string): Promise<Position> {
    return this.cache.get('positions', value);
  }
}

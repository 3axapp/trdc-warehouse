import {inject, Pipe, PipeTransform} from '@angular/core';
import {CacheService} from '../services/cache.service';
import {Executor} from '../services/collections/executors.collection';

@Pipe({
  name: 'executor',
})
export class ExecutorPipe implements PipeTransform {
  private readonly cache = inject(CacheService);

  transform(value: string): Promise<Executor | null> {
    return this.cache.get('executors', value);
  }
}

import { inject, Pipe, PipeTransform } from '@angular/core';
import { CacheService } from '../services/cache.service';
import { User } from '../services/collections/users.collection';

@Pipe({
  name: 'executor',
})
export class ExecutorPipe implements PipeTransform {
  private readonly cache = inject(CacheService);

  public transform(value: string): Promise<User | null> {
    return this.cache.get('executors', value);
  }
}

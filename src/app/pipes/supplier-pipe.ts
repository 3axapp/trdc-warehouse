import {inject, Pipe, PipeTransform} from '@angular/core';
import {Supplier} from '../services/collections/suppliers.collection';
import {CacheService} from '../services/cache.service';

@Pipe({
  name: 'supplier',
})
export class SupplierPipe implements PipeTransform {
  private readonly cache = inject(CacheService);

  async transform(value?: string): Promise<Supplier|null> {
    return value ? await this.cache.get('suppliers', value)! : null;
  }
}

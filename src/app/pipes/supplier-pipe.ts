import {inject, Pipe, PipeTransform} from '@angular/core';
import {Supplier} from '../services/suppliers.service';
import {CacheService} from '../services/cache.service';

@Pipe({
  name: 'supplier',
})
export class SupplierPipe implements PipeTransform {
  private readonly cache = inject(CacheService);

  transform(value: string): Promise<Supplier> {
    return this.cache.get('suppliers', value)!;
  }
}

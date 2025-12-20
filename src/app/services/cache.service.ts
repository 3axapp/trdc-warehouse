import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache: Record<string, Promise<Record<string, unknown>>> = {};

  add<T extends {id: string}>(collection: string, loader: Promise<T[]>) {
    this.cache[collection] = loader.then(list => {
      const index: Record<string, T> = {};
      list.forEach(item => {
        index[item.id] = item;
      });
      return index;
    });
  }

  async get<T>(collection: string, key: string): Promise<T> {
    return this.cache[collection]?.then(i => i[key] as T);
  }

}

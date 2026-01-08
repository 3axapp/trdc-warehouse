import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private list: Record<string, Promise<unknown[]>> = {};
  private cacheById: Record<string, Promise<Record<string, unknown>>> = {};

  add<T extends { id: string }>(collection: string, loader: Promise<T[]>) {
    this.list[collection] = loader;
    this.cacheById[collection] = loader.then(list => {
      const index: Record<string, T> = {};
      list.forEach(item => {
        index[item.id] = item;
      });
      return index;
    });
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    return this.cacheById[collection]?.then(i => i[key] as T || null);
  }

  getList<T extends { id: string }>(collection: string): Promise<T[]> {
    return (this.list[collection] || Promise.resolve([])) as Promise<T[]>;
  }

}

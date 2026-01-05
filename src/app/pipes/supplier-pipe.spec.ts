import {SupplierPipe} from './supplier-pipe';
import {CacheService} from '../services/cache.service';
import {TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {Supplier} from '../services/suppliers.service';

describe('SupplierPipe', () => {
  let mockCacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    mockCacheService = jasmine.createSpyObj<CacheService>('CacheService', ['get']);
    TestBed.configureTestingModule({
      providers: [
        SupplierPipe,
        provideZonelessChangeDetection(),
        {provide: CacheService, useValue: mockCacheService},
      ],
    });
  });

  it('create an instance', () => {
    const pipe = TestBed.inject(SupplierPipe);
    expect(pipe).toBeTruthy();
  });

  it('exists or doesn\'t exist', async () => {
    mockCacheService.get.and.callFake((async (collection: string, key: string) => {
      if (key === 'supplier1') {
        return {
          id: 'supplier1',
          name: 'supplier1',
        } as Supplier;
      }
      return null;
    }) as any);
    const pipe = TestBed.inject(SupplierPipe);
    await expectAsync(pipe.transform(undefined)).toBeResolvedTo(null);
    await expectAsync(pipe.transform(null as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform('' as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform(0 as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform('not found')).toBeResolvedTo(null);
    await expectAsync(pipe.transform('supplier1')).toBeResolvedTo({id: 'supplier1', name:'supplier1'});
    expect(pipe).toBeTruthy();
  });
});

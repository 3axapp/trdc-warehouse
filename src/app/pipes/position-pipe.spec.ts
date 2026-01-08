import {PositionPipe} from './position-pipe';
import {CacheService} from '../services/cache.service';
import {TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {Position, PositionType} from '../services/collections/positions.collection';

describe('PositionPipe', () => {
  let mockCacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    mockCacheService = jasmine.createSpyObj<CacheService>('CacheService', ['get']);
    TestBed.configureTestingModule({
      providers: [
        PositionPipe,
        provideZonelessChangeDetection(),
        {provide: CacheService, useValue: mockCacheService},
      ],
    });
  });

  it('create an instance', () => {
    const pipe = TestBed.inject(PositionPipe);
    expect(pipe).toBeTruthy();
  });

  it('exists or doesn\'t exist', async () => {
    mockCacheService.get.and.callFake((async (collection: string, key: string) => {
      if (key === 'position1') {
        return {
          id: 'position1',
          code: 'position1',
          name: 'position1',
          type: PositionType.Normal,
        } as Position;
      }
      return null;
    }) as any);
    const pipe = TestBed.inject(PositionPipe);
    await expectAsync(pipe.transform(undefined as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform(null as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform('' as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform(0 as any)).toBeResolvedTo(null);
    await expectAsync(pipe.transform('not found')).toBeResolvedTo(null);
    await expectAsync(pipe.transform('position1'))
      .toBeResolvedTo({id: 'position1', code: 'position1', name: 'position1', type: PositionType.Normal});
    expect(pipe).toBeTruthy();
  });
});

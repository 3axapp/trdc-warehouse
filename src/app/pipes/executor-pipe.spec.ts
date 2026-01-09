import { ExecutorPipe } from './executor-pipe';
import {CacheService} from '../services/cache.service';
import {TestBed} from '@angular/core/testing';
import {PositionPipe} from './position-pipe';
import {provideZonelessChangeDetection} from '@angular/core';

describe('ExecutorPipe', () => {
  let mockCacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    mockCacheService = jasmine.createSpyObj<CacheService>('CacheService', ['get']);
    TestBed.configureTestingModule({
      providers: [
        ExecutorPipe,
        provideZonelessChangeDetection(),
        {provide: CacheService, useValue: mockCacheService},
      ],
    });
  });
  it('create an instance', () => {
    const pipe = TestBed.inject(ExecutorPipe);
    expect(pipe).toBeTruthy();
  });
});

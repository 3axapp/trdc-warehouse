import { TestBed } from '@angular/core/testing';

import { PositionsService } from './positions.service';
import {provideZonelessChangeDetection} from '@angular/core';

describe('PositionsService', () => {
  let service: PositionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection()
      ],
    });
    service = TestBed.inject(PositionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

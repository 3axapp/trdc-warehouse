import { TestBed } from '@angular/core/testing';

import { SuppliersService } from './suppliers.service';
import {provideZonelessChangeDetection} from '@angular/core';

describe('SuppliersService', () => {
  let service: SuppliersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection()
      ],
    });
    service = TestBed.inject(SuppliersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

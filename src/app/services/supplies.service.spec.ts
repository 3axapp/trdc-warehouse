import { TestBed } from '@angular/core/testing';

import { SuppliesService } from './supplies.service';
import {provideZonelessChangeDetection} from '@angular/core';

describe('SuppliesService', () => {
  let service: SuppliesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection()
      ],
    });
    service = TestBed.inject(SuppliesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

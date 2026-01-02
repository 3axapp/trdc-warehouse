import { TestBed } from '@angular/core/testing';

import { ExecutorsService } from './executors.service';
import {provideZonelessChangeDetection} from '@angular/core';

describe('ExecutorsService', () => {
  let service: ExecutorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection()
      ],
    });
    service = TestBed.inject(ExecutorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import {TestBed} from '@angular/core/testing';

import {AbstractCollection} from './abstract-collection';
import {provideZonelessChangeDetection} from '@angular/core';

describe('AbstractCollection', () => {
  let service: AbstractCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
      ],
    });
    service = TestBed.inject(AbstractCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

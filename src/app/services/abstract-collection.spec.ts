import { TestBed } from '@angular/core/testing';

import { AbstractCollection } from './abstract-collection';

describe('AbstractCollection', () => {
  let service: AbstractCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AbstractCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

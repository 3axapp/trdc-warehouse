import {TestBed} from '@angular/core/testing';
import {AbstractCollection} from './abstract-collection';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../tests/utils';

describe('AbstractCollection', () => {
  let service: AbstractCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(AbstractCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

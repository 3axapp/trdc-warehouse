import {TestBed} from '@angular/core/testing';
import {SuppliersCollection} from './suppliers.collection';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../../tests/utils';

describe('SuppliersCollection', () => {
  let service: SuppliersCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(SuppliersCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

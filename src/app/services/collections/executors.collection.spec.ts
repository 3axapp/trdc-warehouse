import {TestBed} from '@angular/core/testing';
import {ExecutorsCollection} from './executors.collection';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../../tests/utils';

describe('ExecutorsCollection', () => {
  let service: ExecutorsCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(ExecutorsCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

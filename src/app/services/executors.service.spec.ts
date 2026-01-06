import {TestBed} from '@angular/core/testing';
import {ExecutorsService} from './executors.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../tests/utils';

describe('ExecutorsService', () => {
  let service: ExecutorsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(ExecutorsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

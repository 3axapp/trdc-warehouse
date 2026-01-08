import {TestBed} from '@angular/core/testing';

import {ManufacturingProductionCollection} from './manufacturing-production.collection';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../../tests/utils';

describe('ManufacturingProductionCollection', () => {
  let service: ManufacturingProductionCollection;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
      ],
    });
    service = TestBed.inject(ManufacturingProductionCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

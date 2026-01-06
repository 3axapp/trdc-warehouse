import {TestBed} from '@angular/core/testing';
import {AuthService} from './auth.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideAuthTest, provideFirebaseAppTest} from '../../tests/utils';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideAuthTest(),
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

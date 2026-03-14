import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAuthTest, provideFirebaseAppTest } from '../../tests/utils';
import { UsersCollection } from './collections/users.collection';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: jasmine.SpyObj<UsersCollection>;

  beforeEach(() => {
    mockUsersService = jasmine.createSpyObj('ExecutorsService', ['addWithUid']);
    mockUsersService.addWithUid.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideAuthTest(),
        { provide: UsersCollection, useValue: mockUsersService },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

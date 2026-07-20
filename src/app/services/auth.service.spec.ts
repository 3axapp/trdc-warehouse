import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signupAndSignin,
  testUser,
} from '../../tests/utils';
import { ADMIN_ROLE, UsersCollection } from './collections/users.collection';

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

  it('не считает админом, пока профиль не загружен', () => {
    expect(service.isAdmin()).toBeFalse();
  });
});

describe('AuthService: роль admin', () => {
  let service: AuthService;
  let users: UsersCollection;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await clearFirestoreEmulator();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideAuthTest(),
        provideFirestoreTest(),
      ],
    });

    service = TestBed.inject(AuthService);
    users = TestBed.inject(UsersCollection);
    await signupAndSignin(TestBed);
  });

  it('свежезарегистрированный пользователь админом не является', () => {
    expect(service.isAdmin()).toBeFalse();
  });

  it('регистрация не записывает роль в профиль', async () => {
    const profile = await users.get(testUser.id);

    expect(profile.role).toBeUndefined();
  });

  it('признаёт админом после того, как роль проставлена извне', async () => {
    await users.update(testUser.id, { role: ADMIN_ROLE });
    await service.login(testUser.email, testUser.password);

    expect(service.isAdmin()).toBeTrue();
  });

  it('не признаёт админом при постороннем значении роли', async () => {
    await users.update(testUser.id, { role: 'нет' });
    await service.login(testUser.email, testUser.password);

    expect(service.isAdmin()).toBeFalse();
  });
});

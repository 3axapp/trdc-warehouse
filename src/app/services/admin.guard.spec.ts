import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const runGuard = (): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<
          boolean | UrlTree
        >,
    );

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin', 'loadUser']);
    mockAuthService.loadUser.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
  });

  it('пускает админа', async () => {
    mockAuthService.isAdmin.and.returnValue(true);

    expect(await runGuard()).toBeTrue();
  });

  it('перенаправляет обычного пользователя на склад', async () => {
    mockAuthService.isAdmin.and.returnValue(false);

    const result = await runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/');
  });

  it('загружает профиль перед проверкой роли', async () => {
    mockAuthService.isAdmin.and.returnValue(true);

    await runGuard();

    expect(mockAuthService.loadUser).toHaveBeenCalled();
  });
});

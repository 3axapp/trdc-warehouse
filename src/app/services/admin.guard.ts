import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Пускает на маршрут только пользователя с ролью admin.
 * Пользователь уже аутентифицирован родительским authGuardWithUser,
 * поэтому при отказе отправляем на склад, а не на страницу входа.
 */
export const adminGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Страховка на случай прямого перехода по ссылке: профиль мог ещё не загрузиться.
  await authService.loadUser();

  return authService.isAdmin() || router.createUrlTree(['/']);
};

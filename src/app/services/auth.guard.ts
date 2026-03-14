import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthGuard } from '@angular/fire/auth-guard';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuardWithUser: CanActivateFn = async (route, state) => {
  const firebaseGuard = inject(AuthGuard);
  const authService = inject(AuthService);

  const result = await firstValueFrom(firebaseGuard.canActivate(route, state));

  if (result === true) {
    await authService.loadUser();
  }

  return result;
};

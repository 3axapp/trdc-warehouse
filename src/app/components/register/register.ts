import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TuiAppearance,
  TuiButton,
  TuiError,
  TuiIcon,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiForm, TuiHeader } from '@taiga-ui/layout';
import { AuthService } from '../../services/auth.service';
import { passwordMatchValidator } from '../login/password-match.validator';
import { Router, RouterLink } from '@angular/router';
import { TuiToastService } from '@taiga-ui/kit';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    TuiTextfield,
    TuiAppearance,
    TuiCardLarge,
    TuiForm,
    TuiHeader,
    TuiTitle,
    TuiButton,
    TuiIcon,
    TuiError,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly toast = inject(TuiToastService);

  protected error = signal<string | null>(null);

  protected registerForm = this.fb.group(
    {
      email: [null, [Validators.required, Validators.email]],
      password: [null, [Validators.required, Validators.minLength(8)]],
      confirmPassword: [null, [Validators.required, Validators.minLength(8)]],
      fullName: [null as string | null, [Validators.required]],
      position: [null as string | null, [Validators.required]],
    },
    {
      validators: passwordMatchValidator(),
    },
  );

  protected async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }
    try {
      const data = this.registerForm.value;
      await this.authService.register(
        data.email!,
        data.password!,
        data.fullName!.trim(),
        data.position!.trim(),
      );
      this.router.navigate(['/login']);
      this.toast
        .open('Пользователь успешно зарегистрирован!', { autoClose: 3000, data: '@tui.info' })
        .subscribe();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.error.set('Пользователь с таким email уже существует');
      } else if (error.code === 'auth/invalid-email') {
        this.error.set('Неверный формат email');
      } else if (error.code === 'auth/weak-password') {
        this.error.set('Пароль слишком слабый');
      } else {
        this.error.set('Ошибка регистрации');
      }
    }
  }
}

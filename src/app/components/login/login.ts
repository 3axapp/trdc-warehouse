import {Component, inject, signal} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  TuiAppearance,
  TuiButton,
  TuiError,
  TuiIcon,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {TuiCardLarge, TuiForm, TuiHeader} from '@taiga-ui/layout';
import {AuthService} from '../../services/auth.service';
import {passwordMatchValidator} from './password-match.validator';
import {Router} from '@angular/router';
import {TuiToastService} from '@taiga-ui/kit';

@Component({
  selector: 'app-login',
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
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly toast = inject(TuiToastService);

  isLoginMode = true;
  error = signal<string | null>(null);

  loginForm = this.fb.group(
    {
      email: [null, [Validators.required, Validators.email]],
      password: [null, [Validators.required, Validators.minLength(8)]],
      confirmPassword: [
        {value: null, disabled: true},
        [Validators.required, Validators.minLength(8)]],
    },
    {
      validators: passwordMatchValidator(),
    },
  );

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    const confirmPassword = this.loginForm.get('confirmPassword')!;
    if (this.isLoginMode) {
      confirmPassword.disable();
    } else {
      confirmPassword.enable();
    }
    this.error.set(null);
    this.loginForm.reset();
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }
    try {
      const data = this.loginForm.value;
      if (!this.isLoginMode) {
        // Регистрация нового пользователя
        await this.authService.register(data.email!, data.password!);
        this.toggleMode(); // Переключаемся на форму входа
        this.toast
          .open('Пользователь успешно зарегистрирован!',
            {autoClose: 3000, data: '@tui.info'})
          .subscribe();
      } else {
        // Вход в систему
        await this.authService.login(data.email!, data.password!);
        // Переход на страницу склада
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.error.set('Пользователь с таким email уже существует');
      } else if (error.code === 'auth/invalid-email') {
        this.error.set('Неверный формат email');
      } else if (error.code === 'auth/weak-password') {
        this.error.set('Пароль слишком слабый');
      } else {
        this.error.set('Неверный email или пароль');
      }
    }
  }
}

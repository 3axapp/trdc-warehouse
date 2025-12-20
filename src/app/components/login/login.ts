import {Component, inject} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiAppearance, TuiButton, TuiIcon, TuiTextfield, TuiTitle} from '@taiga-ui/core';
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
  error = '';

  loginForm = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      confirmPassword: [{value: '', disabled: true}, []],
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
    this.loginForm.reset();
  }

  async onSubmit() {
    try {
      const data = this.loginForm.value;
      if (!this.isLoginMode) {
        // Регистрация нового пользователя
        await this.authService.register(data.email!, data.password!);
        this.isLoginMode = true; // Переключаемся на форму входа
        this.toast
          .open('Пользователь успешно зарегистрирован!', {autoClose: 3000, data: '@tui.info'})
          .subscribe();
      } else {
        // Вход в систему
        await this.authService.login(data.email!, data.password!);
        // Переход на страницу склада
        this.router.navigate(['/']);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.error = 'Пользователь с таким email уже существует';
      } else if (error.code === 'auth/invalid-email') {
        this.error = 'Неверный формат email';
      } else if (error.code === 'auth/weak-password') {
        this.error = 'Пароль слишком слабый';
      } else {
        this.error = 'Неверный email или пароль';
      }
    }
  }
}

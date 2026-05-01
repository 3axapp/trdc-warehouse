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
import { Router, RouterLink } from '@angular/router';

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
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected error = signal<string | null>(null);

  protected loginForm = this.fb.group({
    email: [null, [Validators.required, Validators.email]],
    password: [null, [Validators.required, Validators.minLength(8)]],
  });

  protected async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }
    try {
      const data = this.loginForm.value;
      await this.authService.login(data.email!, data.password!);
      this.router.navigate(['/']);
    } catch {
      this.error.set('Неверный email или пароль');
    }
  }
}

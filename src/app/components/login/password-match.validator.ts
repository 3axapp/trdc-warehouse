import {AbstractControl, ValidatorFn} from '@angular/forms';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && !password.errors && !confirmPassword.errors) {
      if (password.value !== confirmPassword.value && !confirmPassword.disabled) {
        password.setErrors({passwordMismatch: true});
        confirmPassword.setErrors({passwordMismatch: true});
        return {passwordMismatch: true};
      }
      password.setErrors(null);
      confirmPassword.setErrors(null);
    }

    return null;
  };
}

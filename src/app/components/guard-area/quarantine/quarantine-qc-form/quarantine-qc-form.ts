import { Component, inject } from '@angular/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiCalendar, TuiDialogContext, TuiError, TuiTextfield } from '@taiga-ui/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgIf } from '@angular/common';
import { TuiCardLarge } from '@taiga-ui/layout';
import { TuiInputDate, TuiInputNumber } from '@taiga-ui/kit';
import { TuiDay } from '@taiga-ui/cdk';

export interface QcFormData {
  positionName: string;
  maxQuantity: number;
}

export interface QcFormResult {
  date: Date;
  quantity: number;
  brokenQuantity: number;
}

@Component({
  selector: 'app-quarantine-qc-form',
  imports: [
    NgIf,
    ReactiveFormsModule,
    TuiButton,
    TuiCalendar,
    TuiCardLarge,
    TuiInputDate,
    TuiInputNumber,
    TuiTextfield,
    TuiError,
  ],
  templateUrl: './quarantine-qc-form.html',
  styleUrl: './quarantine-qc-form.scss',
})
export class QuarantineQcForm {
  public readonly context = injectContext<TuiDialogContext<QcFormResult, QcFormData>>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group(
    {
      date: [null as unknown as TuiDay, [Validators.required]],
      quantity: [null as unknown as number, [Validators.required, Validators.min(1)]],
      brokenQuantity: [null as unknown as number, [Validators.required, Validators.min(0)]],
    },
    {
      validators: (g: AbstractControl): ValidationErrors | null => {
        const qty = g.get('quantity')?.value ?? 0;
        const broken = g.get('brokenQuantity')?.value ?? 0;
        return qty + broken > this.context.data.maxQuantity ? { exceedsMax: true } : null;
      },
    },
  );

  protected get totalError(): boolean {
    return (
      this.form.hasError('exceedsMax') &&
      (this.form.controls.quantity.dirty || this.form.controls.brokenQuantity.dirty)
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.context.completeWith({
      date: this.form.value.date!.toUtcNativeDate(),
      quantity: this.form.value.quantity!,
      brokenQuantity: this.form.value.brokenQuantity!,
    });
  }
}

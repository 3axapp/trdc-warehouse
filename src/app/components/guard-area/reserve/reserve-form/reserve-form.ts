import {Component, inject} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiButton, TuiDialogContext, TuiTextfield} from '@taiga-ui/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiCardLarge} from '@taiga-ui/layout';
import {TuiInputNumber} from '@taiga-ui/kit';

export interface ReserveFormOptions {
  available: number;
}

@Component({
  selector: 'app-reserve-form',
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiCardLarge,
    TuiInputNumber,
    TuiTextfield,
  ],
  templateUrl: './reserve-form.html',
  styleUrl: './reserve-form.scss',
})
export class ReserveForm {
  public readonly context = injectContext<TuiDialogContext<number, ReserveFormOptions>>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    quantity: [
      null as unknown as number,
      [Validators.required, Validators.min(1), Validators.max(this.context.data.available)],
    ],
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.context.completeWith(this.form.value.quantity!);
  }
}

import {Component, inject, signal} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {
  TuiButton,
  TuiCalendar,
  TuiDialogContext,
  TuiError,
  TuiLabel,
  TuiTextfield,
  TuiTextfieldComponent,
} from '@taiga-ui/core';
import {Supply} from '../../../../services/collections/supplies.collection';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiDay} from '@taiga-ui/cdk';
import {TuiCardLarge} from '@taiga-ui/layout';
import {TuiInputDateDirective, TuiInputNumberDirective} from '@taiga-ui/kit';
import {QualityControlService} from '../../../../services/quality-control.service';

@Component({
  selector: 'app-quality-control-form',
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiCalendar,
    TuiCardLarge,
    TuiInputDateDirective,
    TuiInputNumberDirective,
    TuiLabel,
    TuiTextfieldComponent,
    TuiTextfield,
    TuiError,
  ],
  templateUrl: './quality-control-form.html',
  styleUrl: './quality-control-form.scss',
})
export class QualityControlForm {
  public readonly context = injectContext<TuiDialogContext<Partial<Supply>, Supply | undefined>>();

  protected error = signal<string | null>(null);

  private fb = inject(FormBuilder);

  private qualityControl = inject(QualityControlService);

  protected form = this.fb.group({
    qualityControlDate: [null as unknown as TuiDay, [Validators.required]],
    brokenQuantity: [null as unknown as number, [Validators.required]],
  });

  protected async submit() {
    this.error.set(null);
    if (this.form.invalid) {
      return;
    }

    const approveData = {
      brokenQuantity: this.form.value.brokenQuantity!,
      qualityControlDate: this.form.value.qualityControlDate!.toUtcNativeDate(),
    };

    try {
      await this.qualityControl.approve(this.context.data!, approveData);
      this.context.completeWith(approveData);
    } catch (e) {
      this.error.set((e as any)?.message || 'Неизвестная ошибка');
    }
  }

}

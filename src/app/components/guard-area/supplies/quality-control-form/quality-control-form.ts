import {Component, inject} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiButton, TuiCalendar, TuiDialogContext, TuiLabel, TuiTextfield, TuiTextfieldComponent} from '@taiga-ui/core';
import {Supply} from '../../../../services/supplies.service';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiDay} from '@taiga-ui/cdk';
import {TuiCardLarge} from '@taiga-ui/layout';
import {TuiInputDateDirective, TuiInputNumberDirective} from '@taiga-ui/kit';

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

  ],
  templateUrl: './quality-control-form.html',
  styleUrl: './quality-control-form.scss',
})
export class QualityControlForm {
  public readonly context = injectContext<TuiDialogContext<Partial<Supply>, Supply | undefined>>();

  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    qualityControlDate: [null as unknown as TuiDay, [Validators.required]],
    brokenQuantity: [null as unknown as number, [Validators.required]],
    lot: [null as unknown as number, [Validators.required]],
  });


  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.context.completeWith({
      lot: this.form.value.lot!,
      brokenQuantity: this.form.value.brokenQuantity!,
      qualityControlDate: this.form.value.qualityControlDate!.toUtcNativeDate(),
    });
  }

}

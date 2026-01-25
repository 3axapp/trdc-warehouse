import {Component, inject, signal} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {
  TuiButton,
  TuiCalendar,
  TuiDialogContext,
  tuiItemsHandlersProvider,
  TuiLabel,
  TuiTextfield,
  TuiTextfieldComponent,
} from '@taiga-ui/core';
import {Executor} from '../../../../services/collections/executors.collection';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Deletable} from '../../../../services/collections/abstract.collection';
import {TuiCardLarge} from '@taiga-ui/layout';
import {
  TuiChevron,
  TuiDataListWrapperComponent,
  TuiInputDateTime,
  tuiInputDateTimeOptionsProvider,
  TuiInputNumberDirective,
  TuiSelectDirective,
} from '@taiga-ui/kit';
import {ExtraFieldKeys, ExtraFields, NextMaxQuantity} from '../../../../services/manufacturing.service';
import {TuiDay, TuiTime} from '@taiga-ui/cdk';

@Component({
  selector: 'app-manufacturing-form',
  imports: [
    FormsModule,
    TuiCardLarge,
    TuiButton,
    ReactiveFormsModule,
    TuiChevron,
    TuiDataListWrapperComponent,
    TuiLabel,
    TuiSelectDirective,
    TuiTextfieldComponent,
    TuiInputNumberDirective,
    TuiTextfield,
    TuiInputDateTime,
    TuiCalendar,
  ],
  templateUrl: './manufacturing-form.html',
  styleUrl: './manufacturing-form.scss',
  providers: [
    tuiItemsHandlersProvider<Deletable & { name: string }>({
      stringify: signal((v => v.name)),
      identityMatcher: signal((a, b) => a.id === b.id),
      disabledItemHandler: signal((x) => !!x.deleted),
    }),
    tuiInputDateTimeOptionsProvider({
      valueTransformer: {
        fromControlValue: (value: Date | null): [TuiDay, TuiTime | null] | null =>
          value && [
            TuiDay.fromUtcNativeDate(value),
            new TuiTime(value.getUTCHours(), value.getUTCMinutes()),
          ],
        toControlValue: (value: [TuiDay, TuiTime | null] | null): Date | null => {
          const {hours = 0, minutes = 0} = value?.[1] ?? {};

          return (
            value &&
            new Date(value[0].toUtcNativeDate().setUTCHours(hours, minutes))
          );
        },
      },
    }),
  ],
})
export class ManufacturingForm {
  public readonly context = injectContext<TuiDialogContext<Result, Options>>();

  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    date: [new Date(), [Validators.required]],
    executor: [null as unknown as Executor, [Validators.required]],
    quantity: [
      null as unknown as number,
      [Validators.required, Validators.min(1), Validators.max(this.data.availability.available)],
    ],
    recipient: [''],
    docNumber: [''],
  });

  protected get data(): Options {
    return this.context.data!;
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const data: Result = {
      date: this.form.value.date!,
      executorId: this.form.value.executor!.id,
      quantity: this.form.value.quantity!,
    };
    if (this.data.extraFields?.recipient) {
      data.recipient = this.form.value.recipient;
    }
    if (this.data.extraFields?.docNumber) {
      data.docNumber = this.form.value.docNumber;
    }
    this.context.completeWith(data);
  }
}

export interface Options {
  availability: NextMaxQuantity,
  executors: Executor[];
  result?: Result;
  extraFields?: Partial<Record<ExtraFieldKeys, boolean>>;
}

export interface Result extends ExtraFields{
  date: Date;
  executorId: string;
  quantity: number;
}

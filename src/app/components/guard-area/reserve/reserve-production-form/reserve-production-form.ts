import { Component, inject, signal } from '@angular/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  TuiButton,
  TuiCalendar,
  TuiDialogContext,
  tuiItemsHandlersProvider,
  TuiLabel,
  TuiTextfield,
  TuiTextfieldComponent,
} from '@taiga-ui/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Deletable } from '../../../../services/collections/abstract.collection';
import { TuiCardLarge } from '@taiga-ui/layout';
import {
  TuiInputDateTime,
  tuiInputDateTimeOptionsProvider,
  TuiInputNumberDirective,
} from '@taiga-ui/kit';
import { Reserve } from '../../../../services/collections/reserve.collection';
import { ConfirmProductionData } from '../../../../services/reserve-production.service';
import { TuiDay, TuiTime } from '@taiga-ui/cdk';

export interface ReserveProductionFormOptions {
  reserve: Reserve;
  maxQuantity: number;
}

@Component({
  selector: 'app-reserve-production-form',
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiCardLarge,
    TuiInputDateTime,
    TuiCalendar,
    TuiInputNumberDirective,
    TuiLabel,
    TuiTextfield,
    TuiTextfieldComponent,
  ],
  templateUrl: './reserve-production-form.html',
  styleUrl: './reserve-production-form.scss',
  providers: [
    tuiItemsHandlersProvider<Deletable & { name: string }>({
      stringify: signal((v) => v.name),
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
          const { hours = 0, minutes = 0 } = value?.[1] ?? {};
          return value && new Date(value[0].toUtcNativeDate().setUTCHours(hours, minutes));
        },
      },
    }),
  ],
})
export class ReserveProductionForm {
  public readonly context =
    injectContext<TuiDialogContext<ConfirmProductionData, ReserveProductionFormOptions>>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    date: [new Date(), [Validators.required]],
    producedQuantity: [
      null,
      [Validators.required, Validators.min(0), Validators.max(this.context.data.maxQuantity)],
    ],
    brokenQuantities: this.fb.group(
      Object.fromEntries(
        this.context.data.reserve.items.map((item) => [item.positionId, [0, [Validators.min(0)]]]),
      ),
    ),
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { date, producedQuantity, brokenQuantities } = this.form.value;
    this.context.completeWith({
      date: date!,
      producedQuantity: producedQuantity!,
      brokenQuantities: Object.fromEntries(
        Object.entries(brokenQuantities ?? {}).map(([k, v]) => [k, v ?? 0]),
      ),
    });
  }
}

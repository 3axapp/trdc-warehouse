import {Component, inject, signal} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {
  TuiButton,
  TuiDialogContext,
  tuiItemsHandlersProvider,
  TuiLabel,
  TuiTextfield,
  TuiTextfieldComponent,
} from '@taiga-ui/core';
import {Executor} from '../../../../services/executors.service';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Deletable} from '../../../../services/abstract-collection';
import {TuiCardLarge} from '@taiga-ui/layout';
import {TuiChevron, TuiDataListWrapperComponent, TuiInputNumberDirective, TuiSelectDirective} from '@taiga-ui/kit';
import {AvailabilityResult} from '../../../../services/manufacturing.service';

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
  ],
  templateUrl: './manufacturing-form.html',
  styleUrl: './manufacturing-form.scss',
  providers: [
    tuiItemsHandlersProvider<Deletable & {name: string}>({
      stringify: signal((v => v.name)),
      identityMatcher: signal((a, b) => a.id === b.id),
      disabledItemHandler: signal((x) => !!x.deleted),
    }),
  ],
})
export class ManufacturingForm {
  public readonly context = injectContext<TuiDialogContext<Result, Options>>();

  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    executor: [null as unknown as Executor, [Validators.required]],
    quantity: [null as unknown as number, [Validators.required, Validators.min(1), Validators.max(this.data!.availability!.available)]],
  });

  protected get data(): Options | undefined {
    return this.context.data;
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.context.completeWith({
      executorId: this.form.value.executor!.id,
      quantity: this.form.value.quantity!,
    });
  }
}

export interface Options {
  availability: AvailabilityResult,
  executors: Executor[];
  result?: Result;
}

export interface Result {
  executorId: string;
  quantity: number;
}

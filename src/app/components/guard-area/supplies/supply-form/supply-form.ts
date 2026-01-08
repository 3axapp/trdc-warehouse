import {Component, inject, OnInit, signal} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiButton, TuiCalendar, TuiDialogContext, tuiItemsHandlersProvider, TuiTextfield} from '@taiga-ui/core';
import {Position, PositionsCollection, PositionType} from '../../../../services/collections/positions.collection';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Supply} from '../../../../services/collections/supplies.collection';
import {TuiChevron, TuiDataListWrapperComponent, TuiInputDate, TuiInputNumber, TuiSelectDirective} from '@taiga-ui/kit';
import {TuiCardLarge} from '@taiga-ui/layout';
import {Supplier, SuppliersCollection} from '../../../../services/collections/suppliers.collection';
import {Deletable} from '../../../../services/collections/abstract.collection';
import {TuiDay} from '@taiga-ui/cdk';

@Component({
  selector: 'app-supply-form',
  imports: [
    TuiButton,
    ReactiveFormsModule,
    TuiTextfield,
    TuiInputNumber,
    TuiCardLarge,
    TuiChevron,
    TuiDataListWrapperComponent,
    TuiSelectDirective,
    TuiCalendar,
    TuiInputDate,
  ],
  providers: [
    tuiItemsHandlersProvider<Deletable & {name: string}>({
      stringify: signal((v => v.name)),
      identityMatcher: signal((a, b) => a.id === b.id),
      disabledItemHandler: signal((x) => !!x.deleted),
    }),
  ],
  templateUrl: './supply-form.html',
  styleUrl: './supply-form.scss',
})
export class SupplyForm implements OnInit {
  public readonly context = injectContext<TuiDialogContext<Partial<Supply>, Supply | undefined>>();
  protected readonly positions = signal<Position[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);

  private readonly positionsService = inject(PositionsCollection);
  private readonly suppliersService = inject(SuppliersCollection);

  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    position: [null as unknown as Position, [Validators.required]],
    supplier: [null as unknown as Supplier, [Validators.required]],
    quantity: [null as unknown as number, [Validators.required, Validators.min(1)]],
    date: [null as unknown as TuiDay, [Validators.required]],
  });

  protected types = [
    PositionType.Normal,
    PositionType.Checked,
    PositionType.Produced,
  ];
  protected min = 1;

  public ngOnInit(): void {
    this.positionsService.getList().then(list => {
      this.positions.set(list.filter(item => item.type !== PositionType.Produced));
      if (this.context.data) {
        this.form.controls.position.setValue(list.find(item => item.id === this.context.data!.positionId)!);
      }
    });
    this.suppliersService.getList().then(list => {
      this.suppliers.set(list);
      if (this.context.data) {
        this.form.controls.supplier.setValue(list.find(item => item.id === this.context.data!.supplierId)!);
      }
    });
    if (!this.context.data) {
      return;
    }
    this.form.setValue({
      position: {id: this.context.data.positionId, name: this.context.data.positionId} as any,
      supplier: {id: this.context.data.supplierId, name: this.context.data.supplierId} as any,
      quantity: this.context.data.quantity,
      date: TuiDay.fromUtcNativeDate(this.context.data.date),
    });
    this.min = Math.max((this.context.data?.brokenQuantity || 0) + (this.context.data?.usedQuantity || 0), this.min);
  }

  protected get data(): Supply | undefined {
    return this.context.data;
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.context.completeWith({
      positionId: this.form.value.position!.id,
      supplierId: this.form.value.supplier!.id,
      quantity: this.form.value.quantity!,
      date: this.form.value.date!.toUtcNativeDate(),
    });
  }
}

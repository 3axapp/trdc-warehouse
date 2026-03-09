import { Component, inject, OnInit, signal } from '@angular/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  TuiButton,
  TuiCalendar,
  TuiDialogContext,
  tuiItemsHandlersProvider,
  TuiTextfield,
} from '@taiga-ui/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgForOf } from '@angular/common';
import {
  TuiChevron,
  TuiDataListWrapperComponent,
  TuiInputDate,
  TuiInputNumber,
  TuiSelectDirective,
} from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import { TuiDay } from '@taiga-ui/cdk';
import {
  Position,
  PositionsCollection,
  PositionType,
} from '../../../../services/collections/positions.collection';
import {
  QuarantineInvoice,
  QuarantineInvoiceItem,
} from '../../../../services/collections/quarantine-invoice.collection';
import { Deletable } from '../../../../services/collections/abstract.collection';
import {
  Supplier,
  SuppliersCollection,
} from '../../../../services/collections/suppliers.collection';

interface ItemControls {
  position: FormControl<Position | null>;
  quantity: FormControl<number | null>;
}

@Component({
  selector: 'app-quarantine-invoice-form',
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
    NgForOf,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
  ],
  providers: [
    tuiItemsHandlersProvider<Deletable & { name: string }>({
      stringify: signal((v) => v.name),
      identityMatcher: signal((a, b) => a.id === b.id),
      disabledItemHandler: signal((x) => !!x.deleted),
    }),
  ],
  templateUrl: './quarantine-invoice-form.html',
  styleUrl: './quarantine-invoice-form.scss',
})
export class QuarantineInvoiceForm implements OnInit {
  public readonly context =
    injectContext<TuiDialogContext<Omit<QuarantineInvoice, 'id'>, undefined>>();

  private readonly positionsService = inject(PositionsCollection);
  private readonly suppliersService = inject(SuppliersCollection);

  protected readonly positions = signal<Position[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly tableColumns = ['position', 'quantity', 'remove'];

  protected readonly items = new FormArray<FormGroup<ItemControls>>([]);

  protected readonly form = new FormGroup({
    date: new FormControl<TuiDay | null>(null, [Validators.required]),
    number: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    supplier: new FormControl<Supplier | null>(null, [Validators.required]),
  });

  public ngOnInit(): void {
    this.positionsService.getList().then((list) => {
      this.positions.set(list.filter((p) => p.type === PositionType.Checked && !p.deleted));
    });
    this.suppliersService.getList().then((list) => {
      this.suppliers.set(list);
    });
    this.addItem();
  }

  protected addItem(): void {
    this.items.push(
      new FormGroup<ItemControls>({
        position: new FormControl<Position | null>(null, [Validators.required]),
        quantity: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      }),
    );
  }

  protected removeItem(index: number): void {
    this.items.removeAt(index);
  }

  protected isFormValid(): boolean {
    if (this.form.invalid) {
      return false;
    }
    if (!this.items.controls.length) {
      return false;
    }

    if (!this.items.controls.every((g) => g.valid)) {
      return false;
    }
    const unique = new Set<string>(this.items.controls.map((g) => g.value.position!.id));

    return unique.size === this.items.controls.length;
  }

  protected submit(): void {
    if (!this.isFormValid()) {
      return;
    }
    const date = this.form.value.date!;
    const dd = String(date.day).padStart(2, '0');
    const mm = String(date.month + 1).padStart(2, '0');
    const yy = String(date.year).slice(-2);
    const lot = `${dd}${mm}${yy}-${this.form.value.number}`;

    const invoiceItems: QuarantineInvoiceItem[] = this.items.controls.map((g) => ({
      positionId: g.value.position!.id,
      quantity: g.value.quantity!,
    }));

    this.context.completeWith({
      date: date.toUtcNativeDate(),
      number: this.form.value.number!,
      lot,
      supplierId: this.form.value.supplier!.id,
      items: invoiceItems,
    });
  }
}

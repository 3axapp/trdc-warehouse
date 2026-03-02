import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon} from '@taiga-ui/core';
import {TUI_CONFIRM, TuiConfirmData} from '@taiga-ui/kit';
import {Observable, switchMap} from 'rxjs';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {
  QuarantineInvoice,
  QuarantineInvoiceCollection,
  QuarantineInvoiceItem,
} from '../../../services/collections/quarantine-invoice.collection';
import {AsyncPipe, DatePipe, NgForOf} from '@angular/common';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableExpand,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import {PositionPipe} from '../../../pipes/position-pipe';
import {SupplierPipe} from '../../../pipes/supplier-pipe';
import {CacheService} from '../../../services/cache.service';
import {Position, PositionsCollection} from '../../../services/collections/positions.collection';
import {SuppliersCollection} from '../../../services/collections/suppliers.collection';
import {QuarantineQcService} from '../../../services/quarantine-qc.service';

@Component({
  selector: 'app-quarantine',
  imports: [
    TuiButton,
    NgForOf,
    TuiHintDirective,
    TuiIcon,
    TuiTableCell,
    TuiTableDirective,
    TuiTableExpand,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    PositionPipe,
    SupplierPipe,
    AsyncPipe,
    DatePipe,
  ],
  templateUrl: './quarantine.html',
  styleUrl: './quarantine.scss',
})
export class Quarantine implements OnInit {
  private readonly injector = inject(INJECTOR);
  private readonly invoices = inject(QuarantineInvoiceCollection);
  private readonly positions = inject(PositionsCollection);
  private readonly suppliersCollection = inject(SuppliersCollection);
  private readonly cache = inject(CacheService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);
  private readonly qcService = inject(QuarantineQcService);

  protected readonly columns = ['expand', 'number', 'lot', 'date', 'supplier', 'actions'];
  protected data = signal<QuarantineInvoice[]>([]);

  private readonly expandedIds = signal<Set<string>>(new Set());

  public ngOnInit(): void {
    this.cache.add('positions', this.positions.getList());
    this.cache.add('suppliers', this.suppliersCollection.getList());
    this.load();
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  protected remaining(item: QuarantineInvoiceItem): number {
    return item.quantity - (item.usedQuantity ?? 0);
  }

  protected async add(): Promise<void> {
    const dialog = await this.lazyLoadInvoiceForm();
    dialog(undefined).subscribe({
      next: async (data) => {
        try {
          await this.invoices.add(data);
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, {appearance: 'negative'}).subscribe();
        }
      },
    });
  }

  protected async qualityControl(invoice: QuarantineInvoice, item: QuarantineInvoiceItem): Promise<void> {
    const position = await this.cache.get<Position>('positions', item.positionId);
    if (!position) {
      return;
    }

    const {QuarantineQcForm} = await import('./quarantine-qc-form/quarantine-qc-form');
    const dialog = tuiDialog(QuarantineQcForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Контроль качества',
    });

    const itemIndex = invoice.items.indexOf(item);

    dialog({
      positionName: position.name,
      maxQuantity: this.remaining(item),
    }).subscribe({
      next: async ({date, quantity, brokenQuantity}) => {
        try {
          await this.qcService.processQc(invoice, itemIndex, position, date, quantity, brokenQuantity);
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, {appearance: 'negative'}).subscribe();
        }
      },
    });
  }

  protected async remove(invoice: QuarantineInvoice): Promise<void> {
    const data: TuiConfirmData = {
      content: `Удалить счёт "${invoice.number}"?`,
      yes: 'Да',
      no: 'Нет',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Подтвердите',
        size: 's',
        data,
      })
      .pipe(switchMap(async (response) => {
        if (!response) {
          return;
        }
        await this.invoices.archive(invoice.id);
        await this.load();
        return this.alerts.open('Счёт удалён');
      }))
      .subscribe();
  }

  private async lazyLoadInvoiceForm(): Promise<(data: undefined) => Observable<Omit<QuarantineInvoice, 'id'>>> {
    const {QuarantineInvoiceForm} = await import('./quarantine-invoice-form/quarantine-invoice-form');

    return tuiDialog(QuarantineInvoiceForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Новый счёт',
    });
  }

  private async load(): Promise<void> {
    return this.invoices.getList().then(list => {
      this.data.set(list.filter(i => !i.deleted));
    });
  }
}

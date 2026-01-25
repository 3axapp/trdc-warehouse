import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {NgForOf} from "@angular/common";
import {TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon} from "@taiga-ui/core";
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from "@taiga-ui/addon-table";
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {TUI_CONFIRM, TuiConfirmData} from '@taiga-ui/kit';
import {Observable, switchMap} from 'rxjs';
import {Supplier, SuppliersCollection} from '../../../services/collections/suppliers.collection';

@Component({
  selector: 'app-suppliers',
  imports: [
    NgForOf,
    TuiButton,
    TuiHintDirective,
    TuiIcon,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
  ],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
})
export class Suppliers implements OnInit {
  private readonly injector = inject(INJECTOR);
  private suppliers = inject(SuppliersCollection);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);

  protected columns = [
    'name',
    'actions',
  ];

  protected data = signal<Supplier[]>([]);

  public ngOnInit(): void {
    this.load();
  }

  public async add(): Promise<void> {
    await this.showDialog();
  }

  public async edit(supplier: Supplier): Promise<void> {
    await this.showDialog(supplier);
  }

  public async remove(supplier: Supplier): Promise<void> {
    const data: TuiConfirmData = {
      content: `Удалить поставщика "${supplier.name}"?`,
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
        await this.suppliers.archive(supplier.id);
        await this.load();
        return this.alerts.open('Поставщик удален');
      }))
      .subscribe();
  }

  public async restore(supplier: Supplier): Promise<void> {
    const data: TuiConfirmData = {
      content: `Восстановить поставщика "${supplier.name}"?`,
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
        await this.suppliers.unarchive(supplier.id);
        await this.load();
        return this.alerts.open('Поставщик восстановлен');
      }))
      .subscribe();
  }

  protected async showDialog(supplier?: Supplier): Promise<void> {
    const dialog = await this.lazyLoad(supplier);

    dialog(supplier).subscribe({
      next: async (data) => {
        if (supplier?.id) {
          await this.suppliers.update(supplier.id, data);
        } else {
          await this.suppliers.add(data);
        }
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
      },
    });
  }

  private async lazyLoad(supplier?: Supplier): Promise<(supplier?: Supplier) => Observable<Supplier>> {
    const {SupplierForm} = await import('./supplier-form/supplier-form');

    return tuiDialog(SupplierForm, {
      injector: this.injector,
      dismissible: true,
      label: supplier ? 'Изменить' : 'Добавить',
    });
  }

  private async load(): Promise<void> {
    return this.suppliers.getList().then(suppliers => {
      this.data.set(suppliers.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }
}
